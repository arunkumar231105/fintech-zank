import csv
import io
import json
import uuid
from decimal import Decimal
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_admin
from ..core.email_utils import send_email
from ..models import Card as CardModel
from ..models import Transaction as TransactionModel
from ..models import User as UserModel
from ..models import Wallet as WalletModel
from ..services.ledger_service import ensure_system_account, ensure_user_wallet_account, post_ledger_transaction, sync_wallet_from_ledger
from .dashboard_state import (
    SUPPORT_TICKET_STORE,
    get_budget_categories,
    get_kyc_record,
    get_login_history,
    get_support_tickets,
    get_ticket_messages,
    get_user_goals,
    iso_now,
)
from .rewards import _reward_summary
from .users import USER_LINKED_ACCOUNTS

router = APIRouter()

ADMIN_ACTIONS = []
ADMIN_USER_STATUS = {}
RECONCILIATION_RUNS = {}
RISK_FLAGS = {}
RISK_RULES = {}
ADMIN_SETTINGS = {
    "transaction_fees": {
        "transaction_fee_percentage": 1.5,
        "withdrawal_fee": 2.5,
        "withdrawal_fee_type": "fixed",
        "card_issuance_fee": 5.0,
        "international_transfer_fee": 3.0,
        "minimum_fee": 0.5,
        "currency": "USD",
    },
    "withdrawal_limits": {
        "verified_daily": 5000.0,
        "verified_monthly": 25000.0,
        "unverified_daily": 1000.0,
        "unverified_monthly": 5000.0,
        "single_transaction_max": 10000.0,
        "card_daily_limit": 3000.0,
        "card_monthly_limit": 12000.0,
        "minimum_deposit_amount": 10.0,
        "maximum_deposit_amount": 25000.0,
    },
    "deposit_limits": {
        "minimum": 10.0,
        "maximum": 25000.0,
    },
    "feature_flags": {
        "virtual_cards_enabled": True,
        "savings_goals_enabled": True,
        "rewards_program_active": True,
        "referral_system_active": False,
        "cashback_percentage": 2.0,
        "points_conversion_rate": 100,
    },
    "maintenance_mode": {
        "enabled": False,
        "message": "",
        "scheduled_for": None,
        "whitelist_ips": [],
    },
    "last_modified_by": "system@zank.ai",
    "last_modified_at": iso_now(),
}
ADMIN_INTEGRATIONS = [
    {"id": "stripe", "service_name": "Stripe", "category": "Payment Processor", "status": "connected", "last_sync_at": iso_now(), "api_key_masked": "sk_live_****9821", "error": ""},
    {"id": "sendgrid", "service_name": "SendGrid", "category": "Email Service", "status": "connected", "last_sync_at": iso_now(), "api_key_masked": "SG.****Ab19", "error": ""},
    {"id": "twilio", "service_name": "Twilio", "category": "SMS Provider", "status": "connected", "last_sync_at": iso_now(), "api_key_masked": "AC****77fa", "error": ""},
    {"id": "sumsub", "service_name": "Sumsub", "category": "KYC Verification API", "status": "error", "last_sync_at": (datetime.utcnow() - timedelta(minutes=18)).isoformat(), "api_key_masked": "sum_****4451", "error": "Document parser timeout"},
    {"id": "chainalysis", "service_name": "Chainalysis", "category": "AML Database", "status": "disconnected", "last_sync_at": (datetime.utcnow() - timedelta(hours=5)).isoformat(), "api_key_masked": "aml_****9912", "error": "API key invalid"},
]


def _normalize_datetime(value):
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone().replace(tzinfo=None)
    return value


class UserStatusUpdate(BaseModel):
    status: str
    reason: str = ""


class BalanceAdjustRequest(BaseModel):
    amount: float
    reason: str
    adjustment_type: str


class AdminDepositRequest(BaseModel):
    user_id: str
    amount: float
    payment_method: str
    email_receipt: bool = True
    admin_note: str = ""


class TransactionReverseRequest(BaseModel):
    reason: str
    notify_user: bool = True


class TransactionFlagRequest(BaseModel):
    flag_type: str
    severity: str = "medium"
    notes: str


class ReconciliationRunRequest(BaseModel):
    start_date: str
    end_date: str
    processor: str


class RiskFlagUpdate(BaseModel):
    action: str
    notes: str
    freeze_user: bool = False


class RiskRuleUpdate(BaseModel):
    enabled: bool
    threshold: float
    parameters: dict


class KycDecisionRequest(BaseModel):
    action: str
    rejection_reason: str = ""
    notes: str = ""


class SupportTicketUpdate(BaseModel):
    status: str | None = None
    assigned_agent: str | None = None
    reply_message: str | None = None
    internal_note: str | None = None


class AdminSettingsUpdate(BaseModel):
    transaction_fees: dict
    withdrawal_limits: dict
    deposit_limits: dict
    feature_flags: dict
    maintenance_mode: dict


def _ensure_wallet(user: UserModel, db: Session):
    wallet = user.wallet
    if wallet:
        return wallet
    wallet = WalletModel(
        wallet_id=f"ZANK-{user.id[:8].upper()}",
        user_id=user.id,
        total_balance=0.0,
        available_balance=0.0,
        held_balance=0.0,
        account_number=f"472988210012{user.id.replace('-', '')[:4].upper()}",
        routing_number="021000021",
        currency="USD",
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def _get_user_status(user: UserModel):
    stored = ADMIN_USER_STATUS.get(user.id)
    if stored:
        return stored["status"]
    return "active" if user.is_active else "deactivated"


def _set_user_status(user: UserModel, status_value: str):
    if status_value == "active":
        user.is_active = True
        ADMIN_USER_STATUS.pop(user.id, None)
    else:
        user.is_active = status_value != "deactivated"
        ADMIN_USER_STATUS[user.id] = {"status": status_value, "updated_at": iso_now()}


def _record_action(admin_user: UserModel, action_type: str, entity_type: str, entity_id: str, details: dict, target_user: str | None = None):
    entry = {
        "id": f"act_{uuid.uuid4().hex[:10]}",
        "timestamp": iso_now(),
        "admin_user": admin_user.email,
        "admin_user_id": admin_user.id,
        "action_type": action_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "ip_address": "127.0.0.1",
        "user_agent": "Admin Panel",
        "device": "Admin Browser",
        "target_user": target_user,
    }
    ADMIN_ACTIONS.insert(0, entry)
    return entry


def _serialize_user(user: UserModel, wallet: WalletModel | None = None):
    wallet = wallet or user.wallet
    return {
        "id": user.id,
        "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "status": _get_user_status(user),
        "kyc_status": user.kyc_status or get_kyc_record(user.id)["status"],
        "wallet_balance": round(float(wallet.total_balance if wallet else 0.0), 2),
        "joined_date": user.created_at.isoformat() if user.created_at else iso_now(),
        "last_login": get_login_history(user.id)[0]["timestamp"] if get_login_history(user.id) else None,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "timezone": user.timezone,
        "role": user.role,
    }


def _serialize_wallet(wallet: WalletModel, user: UserModel, db: Session):
    last_txn = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user.id)
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .first()
    )
    return {
        "user_id": user.id,
        "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "email": user.email,
        "balance": round(float(wallet.total_balance or 0.0), 2),
        "currency": wallet.currency or "USD",
        "status": _get_user_status(user),
        "daily_limit": 5000.0,
        "monthly_limit": 25000.0,
        "last_transaction_date": last_txn.date.isoformat() if last_txn and last_txn.date else None,
    }


def _serialize_recent_transaction(txn: TransactionModel):
    tx_type = (txn.type or "debit").lower()
    amount = abs(float(txn.amount or 0.0))
    return {
        "id": txn.txn_id,
        "description": txn.note or txn.merchant or txn.category or "Transaction",
        "type": "credit" if tx_type == "credit" else "debit",
        "amount": amount,
        "date": txn.date.isoformat() if txn.date else iso_now(),
        "status": txn.status or "completed",
    }


def _serialize_admin_transaction(txn: TransactionModel, user: UserModel):
    flagged_entries = [flag for flag in RISK_FLAGS.values() if flag["transaction_id"] == txn.txn_id and flag["status"] != "dismissed"]
    return {
        "id": txn.txn_id,
        "user_id": user.id,
        "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "user_email": user.email,
        "type": (txn.category or txn.type or "transaction").replace("_", " "),
        "amount": round(float(txn.amount or 0.0), 2),
        "status": txn.status or "completed",
        "date": txn.date.isoformat() if txn.date else iso_now(),
        "flagged": bool(flagged_entries),
        "reference_id": txn.txn_id,
        "description": txn.note or txn.merchant or txn.category or "Transaction",
        "metadata": {
            "ip": "192.168.10.XXX",
            "device": "Chrome on Windows",
            "location": user.country or "Unknown",
        },
    }


def _find_transaction(db: Session, transaction_id: str):
    return db.query(TransactionModel).filter(TransactionModel.txn_id == transaction_id).first()


def _find_user(db: Session, user_id: str):
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def _goals_total(db: Session):
    total = 0.0
    users = db.query(UserModel).all()
    for user in users:
        for goal in get_user_goals(user.id):
            total += float(goal.get("current_amount", 0.0))
    return round(total, 2)


def _all_support_tickets(db: Session):
    results = []
    for user in db.query(UserModel).all():
        tickets = get_support_tickets(user.id)
        for ticket in tickets:
            results.append(_serialize_support_ticket(ticket, user))
    return sorted(results, key=lambda item: item["updated_at"], reverse=True)


def _serialize_support_ticket(ticket: dict, user: UserModel):
    messages = list(get_ticket_messages(ticket["id"]))
    internal_notes = ticket.get("internal_notes", [])
    updated_at = ticket.get("updated_at") or (messages[-1]["timestamp"] if messages else ticket.get("created_at")) or iso_now()
    return {
        "id": ticket["id"],
        "user_id": user.id,
        "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "user_email": user.email,
        "subject": ticket.get("subject", "Support Ticket"),
        "description": ticket.get("description", ""),
        "priority": ticket.get("priority", "medium"),
        "status": ticket.get("status", "open"),
        "assigned_to": ticket.get("assigned_agent"),
        "created_at": ticket.get("created_at") or iso_now(),
        "updated_at": updated_at,
        "attachment_name": ticket.get("attachment_name", ""),
        "messages": messages,
        "internal_notes": internal_notes,
    }


def _seed_risk_flags(db: Session):
    if RISK_FLAGS:
        return
    transactions = (
        db.query(TransactionModel, UserModel)
        .join(UserModel, UserModel.id == TransactionModel.user_id)
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .limit(6)
        .all()
    )
    if not transactions:
        return
    seed_types = ["Large Amount", "Unusual Pattern", "Suspicious Activity", "AML Concern"]
    severities = ["medium", "high", "critical", "low"]
    for index, (txn, user) in enumerate(transactions):
        flag_id = f"flag_{uuid.uuid4().hex[:8]}"
        RISK_FLAGS[flag_id] = {
            "id": flag_id,
            "transaction_id": txn.txn_id,
            "user_id": user.id,
            "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
            "type": seed_types[index % len(seed_types)],
            "severity": severities[index % len(severities)],
            "amount": round(float(txn.amount or 0.0), 2),
            "status": "active",
            "created_at": txn.date.isoformat() if txn.date else iso_now(),
            "notes": f"Auto-detected by AML monitor for {txn.txn_id}.",
            "risk_score": min(55 + index * 9, 98),
            "activity_log": [{"action": "created", "actor": "system", "timestamp": iso_now()}],
        }


def _seed_risk_rules():
    if RISK_RULES:
        return
    seeds = [
        ("rule_large_single", "Large Single Transaction", "Flags single transactions above threshold", 100000, {"currency": "USD"}),
        ("rule_velocity", "High Velocity", "Flags more than allowed transactions per hour", 10, {"time_window_minutes": 60}),
        ("rule_rapid_withdraw", "Rapid Withdrawal", "Deposit followed by quick withdrawal", 5, {"time_window_minutes": 5}),
        ("rule_small_deposits", "Multiple Small Deposits", "Structuring detection", 5, {"max_amount": 10000, "time_window_hours": 24}),
    ]
    for rule_id, name, description, threshold, parameters in seeds:
        RISK_RULES[rule_id] = {
            "id": rule_id,
            "name": name,
            "description": description,
            "enabled": True,
            "threshold": threshold,
            "parameters": parameters,
            "last_triggered": None,
        }


def _kyc_row(user: UserModel):
    record = get_kyc_record(user.id)
    status = record.get("status") if record.get("status") != "not_started" else (user.kyc_status or "pending")
    submitted_at = record.get("uploaded_at") or (user.created_at.isoformat() if user.created_at else iso_now())
    submitted_dt = datetime.fromisoformat(submitted_at.replace("Z", "")) if submitted_at else datetime.utcnow()
    waiting_days = max((datetime.utcnow() - submitted_dt).days, 0)
    priority = "high" if status == "pending" and waiting_days > 3 else "normal"
    return {
        "user_id": user.id,
        "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "email": user.email,
        "phone": user.phone,
        "registration_date": user.created_at.isoformat() if user.created_at else iso_now(),
        "submitted_date": submitted_at,
        "document_type": record.get("document_type") or "ID Card",
        "status": status,
        "priority": priority,
        "waiting_days": waiting_days,
        "rejection_reason": record.get("reason", ""),
        "notes": record.get("notes", ""),
        "documents": record.get("documents", []),
        "checklist": {
            "clear_image": True,
            "valid_document": status != "rejected",
            "name_matches": True,
            "address_visible": True,
        },
    }


def _wallet_overview(db: Session):
    users = db.query(UserModel).all()
    wallets = []
    for user in users:
        wallet = _ensure_wallet(user, db)
        wallets.append((user, wallet))
    balances = [wallet.total_balance or 0.0 for _, wallet in wallets] or [0.0]
    active_wallets_aum = sum(wallet.total_balance or 0.0 for user, wallet in wallets if _get_user_status(user) == "active")
    frozen_wallets_aum = sum(wallet.total_balance or 0.0 for user, wallet in wallets if _get_user_status(user) == "frozen")
    top_wallets = sorted((_serialize_wallet(wallet, user, db) for user, wallet in wallets), key=lambda item: item["balance"], reverse=True)[:10]
    growth_chart = []
    running_total = sum(balances)
    for index in range(30):
        day = (datetime.utcnow() - timedelta(days=29 - index)).date().isoformat()
        value = max(running_total - (29 - index) * 125.5, 0)
        growth_chart.append({"date": day, "aum": round(value, 2)})
    return {
        "total_aum": round(sum(balances), 2),
        "average_balance": round(sum(balances) / len(balances), 2) if balances else 0.0,
        "highest_balance": round(max(balances), 2),
        "lowest_balance": round(min(balances), 2),
        "active_wallets_aum": round(active_wallets_aum, 2),
        "frozen_wallets_aum": round(frozen_wallets_aum, 2),
        "savings_goals_total": _goals_total(db),
        "top_users": top_wallets,
        "aum_trend": growth_chart,
    }


def _overview_payload(db: Session):
    users = db.query(UserModel).all()
    transactions = db.query(TransactionModel).all()
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = datetime(last_month_end.year, last_month_end.month, 1)
    recent_users = sorted(users, key=lambda entry: _normalize_datetime(entry.created_at) or datetime.utcnow(), reverse=True)
    active_users = [user for user in users if _get_user_status(user) == "active"]
    pending_kyc = [user for user in users if (user.kyc_status or get_kyc_record(user.id)["status"]) == "pending"]
    support_tickets = _all_support_tickets(db)
    risk_flags = list(RISK_FLAGS.values())
    wallet_summary = _wallet_overview(db)
    fees_this_month = round(sum(abs(float(tx.amount or 0.0)) * 0.015 for tx in transactions if _normalize_datetime(tx.date) and _normalize_datetime(tx.date) >= month_start), 2)
    fees_last_month = round(sum(abs(float(tx.amount or 0.0)) * 0.015 for tx in transactions if _normalize_datetime(tx.date) and last_month_start <= _normalize_datetime(tx.date) <= last_month_end), 2)
    tx_month = [tx for tx in transactions if _normalize_datetime(tx.date) and _normalize_datetime(tx.date) >= month_start]
    tx_last_month = [tx for tx in transactions if _normalize_datetime(tx.date) and last_month_start <= _normalize_datetime(tx.date) <= last_month_end]
    user_growth_chart = []
    tx_volume_chart = []
    revenue_chart = []
    for index in range(30):
        day = (now - timedelta(days=29 - index)).date()
        label = day.isoformat()
        users_count = len([user for user in users if _normalize_datetime(user.created_at) and _normalize_datetime(user.created_at).date() == day])
        day_transactions = [tx for tx in transactions if _normalize_datetime(tx.date) and _normalize_datetime(tx.date).date() == day]
        user_growth_chart.append({"date": label, "users": users_count})
        tx_volume_chart.append({"date": label, "count": len(day_transactions), "amount": round(sum(abs(float(tx.amount or 0.0)) for tx in day_transactions), 2)})
        revenue_chart.append({"date": label, "revenue": round(sum(abs(float(tx.amount or 0.0)) * 0.015 for tx in day_transactions), 2)})
    recent_large = sorted(transactions, key=lambda tx: abs(float(tx.amount or 0.0)), reverse=True)[:5]
    recent_activity = [
        {
            "id": f"activity_user_{user.id}",
            "type": "user_registration",
            "title": f"New user: {user.first_name} {user.last_name}".strip(),
            "subtitle": user.email,
            "timestamp": user.created_at.isoformat() if user.created_at else iso_now(),
        }
        for user in recent_users[:4]
    ] + [
        {
            "id": f"activity_tx_{tx.txn_id}",
            "type": "large_transaction",
            "title": tx.note or tx.merchant or tx.txn_id,
            "subtitle": f"{abs(float(tx.amount or 0.0)):.2f} {tx.currency or 'USD'}",
            "timestamp": tx.date.isoformat() if tx.date else iso_now(),
        }
        for tx in recent_large
    ] + [
        {
            "id": f"activity_admin_{entry['id']}",
            "type": "admin_action",
            "title": entry["action_type"],
            "subtitle": entry["entity_type"],
            "timestamp": entry["timestamp"],
        }
        for entry in ADMIN_ACTIONS[:6]
    ]
    volume_this_month = sum(abs(float(tx.amount or 0.0)) for tx in tx_month)
    volume_last_month = sum(abs(float(tx.amount or 0.0)) for tx in tx_last_month)
    return {
        "kpis": {
            "total_users": len(users),
            "active_users": len(active_users),
            "total_aum": wallet_summary["total_aum"],
            "frozen_accounts": len([user for user in users if _get_user_status(user) == "frozen"]),
            "pending_kyc": len(pending_kyc),
            "total_transactions": len(transactions),
            "open_support_tickets": len([ticket for ticket in support_tickets if ticket["status"] in {"open", "in_progress"}]),
            "active_risk_flags": len([flag for flag in risk_flags if flag["status"] == "active"]),
        },
        "growth": {
            "new_users_this_week": len([user for user in users if _normalize_datetime(user.created_at) and _normalize_datetime(user.created_at) >= now - timedelta(days=7)]),
            "transaction_volume_this_month": round(volume_this_month, 2),
            "transaction_volume_last_month": round(volume_last_month, 2),
            "volume_change_pct": round(((volume_this_month - volume_last_month) / (volume_last_month or 1)) * 100, 2),
        },
        "revenue": {
            "total_fees_collected": round(sum(abs(float(tx.amount or 0.0)) * 0.015 for tx in transactions), 2),
            "revenue_this_month": fees_this_month,
            "revenue_last_month": fees_last_month,
            "average_transaction_value": round(sum(abs(float(tx.amount or 0.0)) for tx in transactions) / len(transactions), 2) if transactions else 0.0,
        },
        "platform_health": {"system_uptime": "99.98%", "api_response_time_ms": 182, "error_rate": 0.12},
        "quick_stats": {
            "pending_kyc": len(pending_kyc),
            "open_support_tickets": len([ticket for ticket in support_tickets if ticket["status"] in {"open", "in_progress"}]),
            "active_risk_flags": len([flag for flag in risk_flags if flag["status"] == "active"]),
            "reconciliation_status": "healthy" if len(RECONCILIATION_RUNS) else "not_run",
        },
        "charts": {
            "user_growth": user_growth_chart,
            "transaction_volume": tx_volume_chart,
            "revenue_trend": revenue_chart,
            "aum_trend": wallet_summary["aum_trend"],
        },
        "recent_registrations": [_serialize_user(user) for user in recent_users[:10]],
        "recent_actions": ADMIN_ACTIONS[:10],
        "recent_activity": recent_activity[:12],
    }


@router.get("/overview")
def get_admin_overview(admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    _seed_risk_flags(db)
    _seed_risk_rules()
    return _overview_payload(db)


@router.get("/users")
def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: str = Query(""),
    status: str = Query("all"),
    kyc_status: str = Query("all"),
    sort_by: str = Query("joined_date"),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    users = db.query(UserModel).all()
    items = []
    for user in users:
        wallet = _ensure_wallet(user, db)
        items.append(_serialize_user(user, wallet))
    if search:
        query = search.lower()
        items = [item for item in items if query in item["name"].lower() or query in item["email"].lower() or query in str(item["phone"] or "").lower() or query in item["id"].lower()]
    if status != "all":
        items = [item for item in items if item["status"] == status]
    if kyc_status != "all":
        items = [item for item in items if item["kyc_status"] == kyc_status]
    if sort_by == "balance":
        items.sort(key=lambda item: item["wallet_balance"], reverse=True)
    elif sort_by == "name":
        items.sort(key=lambda item: item["name"].lower())
    else:
        items.sort(key=lambda item: item["joined_date"], reverse=True)
    total = len(items)
    start = (page - 1) * limit
    paged = items[start:start + limit]
    return {"items": paged, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/users/{user_id}")
def get_user_detail(user_id: str, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _find_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    wallet = _ensure_wallet(user, db)
    linked_accounts = USER_LINKED_ACCOUNTS.get(user.id, [])
    cards = db.query(CardModel).filter(CardModel.user_id == user.id).all()
    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user.id)
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .limit(20)
        .all()
    )
    rewards = _reward_summary(user, db)
    kyc = get_kyc_record(user.id)
    support_tickets = [_serialize_support_ticket(ticket, user) for ticket in get_support_tickets(user.id)]
    budgets = get_budget_categories(user.id, datetime.utcnow().month, datetime.utcnow().year)
    return {
        "user": _serialize_user(user, wallet),
        "wallet": {"balance": wallet.total_balance, "currency": wallet.currency or "USD", "status": _get_user_status(user), "daily_limit": 5000.0, "monthly_limit": 25000.0},
        "kyc": {"status": user.kyc_status or kyc["status"], "documents": kyc.get("documents", []), "uploaded_at": kyc.get("uploaded_at"), "reason": kyc.get("reason", "")},
        "linked_accounts": linked_accounts,
        "recent_transactions": [_serialize_recent_transaction(txn) for txn in transactions],
        "savings_summary": {"count": len(get_user_goals(user.id)), "items": get_user_goals(user.id)},
        "budgets_summary": {"count": len(budgets), "items": budgets},
        "cards": [{"id": card.id, "name": card.name, "last4": card.last4, "status": card.status, "expiry": card.expiry} for card in cards],
        "rewards": {"points": rewards["total_points"], "tier": rewards["tier"]},
        "support_tickets": support_tickets,
        "login_history": get_login_history(user.id),
    }


@router.put("/users/{user_id}/status")
def update_user_status(user_id: str, payload: UserStatusUpdate, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _find_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if payload.status not in {"active", "frozen", "deactivated"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    if payload.status in {"frozen", "deactivated"} and len(payload.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Reason required for freeze/deactivate")
    _set_user_status(user, payload.status)
    db.commit()
    updated = _serialize_user(user, _ensure_wallet(user, db))
    _record_action(admin, "status_change", "user", user.id, {"status": payload.status, "reason": payload.reason}, target_user=user.email)
    return {"success": True, "user": updated}


@router.post("/users/{user_id}/balance-adjust")
def adjust_balance(user_id: str, payload: BalanceAdjustRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _find_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if len(payload.reason.strip()) < 10:
        raise HTTPException(status_code=400, detail="Reason must be at least 10 characters")
    if payload.adjustment_type not in {"add", "deduct"}:
        raise HTTPException(status_code=400, detail="Adjustment type must be add or deduct")
    wallet = _ensure_wallet(user, db)
    if payload.adjustment_type == "deduct" and wallet.available_balance < payload.amount:
        raise HTTPException(status_code=400, detail=f"Cannot deduct {payload.amount:.2f}, current balance is only {wallet.available_balance:.2f}")

    user_account = ensure_user_wallet_account(db, user.id, currency=wallet.currency or "USD", opening_balance=wallet.total_balance or 0.0)
    treasury_account = ensure_system_account(db, "treasury", wallet.currency or "USD")
    if payload.adjustment_type == "add":
        ledger_entries = [
            {"account_id": treasury_account.id, "entry_type": "debit", "amount": Decimal(str(payload.amount))},
            {"account_id": user_account.id, "entry_type": "credit", "amount": Decimal(str(payload.amount))},
        ]
        transaction_type = "deposit"
    else:
        ledger_entries = [
            {"account_id": user_account.id, "entry_type": "debit", "amount": Decimal(str(payload.amount))},
            {"account_id": treasury_account.id, "entry_type": "credit", "amount": Decimal(str(payload.amount))},
        ]
        transaction_type = "refund"

    post_ledger_transaction(
        db=db,
        entries=ledger_entries,
        transaction_type=transaction_type,
        reference_id=f"TXN-ADJ-{uuid.uuid4().hex[:8].upper()}",
        currency=wallet.currency or "USD",
        metadata={"merchant": "Admin Adjustment", "description": payload.reason, "admin_user_id": admin.id},
    )
    sync_wallet_from_ledger(db, user.id, currency=wallet.currency or "USD")
    db.commit()
    _record_action(admin, "balance_adjustment", "wallet", user.id, {"amount": payload.amount, "adjustment_type": payload.adjustment_type, "reason": payload.reason}, target_user=user.email)
    return {"success": True, "user": _serialize_user(user, wallet), "wallet": {"balance": wallet.total_balance}}


@router.post("/deposit")
def admin_deposit(payload: AdminDepositRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _find_user(db, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than 0")
    wallet = _ensure_wallet(user, db)
    user_account = ensure_user_wallet_account(db, user.id, currency=wallet.currency or "USD", opening_balance=wallet.total_balance or 0.0)
    treasury_account = ensure_system_account(db, "treasury", wallet.currency or "USD")
    txn = post_ledger_transaction(
        db=db,
        entries=[
            {"account_id": treasury_account.id, "entry_type": "debit", "amount": Decimal(str(payload.amount))},
            {"account_id": user_account.id, "entry_type": "credit", "amount": Decimal(str(payload.amount))},
        ],
        transaction_type="deposit",
        reference_id=f"TXN-DEP-{uuid.uuid4().hex[:8].upper()}",
        currency=wallet.currency or "USD",
        metadata={
            "merchant": f"Admin deposit via {payload.payment_method}",
            "description": payload.admin_note or f"Admin deposit via {payload.payment_method}",
            "payment_method": payload.payment_method,
            "admin_user_id": admin.id,
        },
    )
    sync_wallet_from_ledger(db, user.id, currency=wallet.currency or "USD")
    db.commit()
    if payload.email_receipt:
        send_email(
            user.email,
            f"Payment Received - ${payload.amount:,.2f}",
            (
                f"<p>Dear {user.first_name or user.email},</p>"
                f"<p>Your ZANK wallet has been credited with <strong>${payload.amount:,.2f}</strong> via {payload.payment_method}.</p>"
                f"<p>Reference: {payload.admin_note or txn.reference_id or 'N/A'}</p><p>Thank you.</p>"
            ),
        )
    _record_action(admin, "admin_deposit", "wallet", user.id, {"amount": payload.amount, "payment_method": payload.payment_method, "email_receipt": payload.email_receipt, "reference": payload.admin_note}, target_user=user.email)
    return {"success": True, "message": "Deposit successful, email sent to user", "user": _serialize_user(user, wallet)}


@router.get("/wallets/overview")
def get_wallets_overview(admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    return _wallet_overview(db)


@router.get("/wallets")
def get_wallets(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("balance_desc"),
    min_balance: float = Query(0),
    max_balance: float | None = Query(None),
    status: str = Query("all"),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = []
    for user in db.query(UserModel).all():
        wallet = _ensure_wallet(user, db)
        rows.append(_serialize_wallet(wallet, user, db))
    rows = [row for row in rows if row["balance"] >= min_balance and (max_balance is None or row["balance"] <= max_balance)]
    if status != "all":
        rows = [row for row in rows if row["status"] == status]
    if sort_by == "balance_asc":
        rows.sort(key=lambda item: item["balance"])
    elif sort_by == "name":
        rows.sort(key=lambda item: item["user_name"].lower())
    else:
        rows.sort(key=lambda item: item["balance"], reverse=True)
    total = len(rows)
    start = (page - 1) * limit
    return {"items": rows[start:start + limit], "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/actions")
def get_actions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    action_type: str = Query("all"),
    admin_user: str = Query(""),
    admin: UserModel = Depends(get_current_admin),
):
    items = list(ADMIN_ACTIONS)
    if action_type != "all":
        items = [item for item in items if item["action_type"] == action_type]
    if admin_user:
        query = admin_user.lower()
        items = [item for item in items if query in item["admin_user"].lower()]
    total = len(items)
    start = (page - 1) * limit
    return {"items": items[start:start + limit], "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/transactions")
def get_admin_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    type: str = Query("all"),
    status: str = Query("all"),
    user_id: str = Query(""),
    date_range: str = Query(""),
    min_amount: float | None = Query(None),
    max_amount: float | None = Query(None),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_risk_flags(db)
    query = db.query(TransactionModel, UserModel).join(UserModel, UserModel.id == TransactionModel.user_id)
    if type != "all":
        query = query.filter((TransactionModel.category.ilike(f"%{type}%")) | (TransactionModel.type.ilike(f"%{type}%")))
    if status != "all":
        query = query.filter(TransactionModel.status == status)
    if user_id:
        pattern = f"%{user_id}%"
        query = query.filter((UserModel.id.ilike(pattern)) | (UserModel.email.ilike(pattern)) | (UserModel.first_name.ilike(pattern)) | (UserModel.last_name.ilike(pattern)))
    if min_amount is not None:
        query = query.filter(TransactionModel.amount >= min_amount)
    if max_amount is not None:
        query = query.filter(TransactionModel.amount <= max_amount)
    if date_range:
        parts = [part.strip() for part in date_range.split(",") if part.strip()]
        if len(parts) == 2:
            start_date = datetime.fromisoformat(parts[0])
            end_date = datetime.fromisoformat(parts[1]) + timedelta(days=1)
            query = query.filter(TransactionModel.date >= start_date, TransactionModel.date <= end_date)
    total = query.count()
    rows = query.order_by(TransactionModel.date.desc(), TransactionModel.id.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [_serialize_admin_transaction(txn, user) for txn, user in rows]
    return {"items": items, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.post("/transactions/{transaction_id}/reverse")
def reverse_transaction(transaction_id: str, payload: TransactionReverseRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    txn = _find_transaction(db, transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if (txn.status or "").lower() == "reversed":
        raise HTTPException(status_code=400, detail=f"This transaction was already reversed on {(txn.date or datetime.utcnow()).date()}")
    user = _find_user(db, txn.user_id)
    wallet = _ensure_wallet(user, db)
    is_credit = (txn.type or "").lower() == "credit"
    amount = abs(float(txn.amount or 0.0))
    if is_credit:
        if wallet.available_balance < amount:
            raise HTTPException(status_code=400, detail="Recipient balance is insufficient for reversal")
        wallet.total_balance -= amount
        wallet.available_balance -= amount
        reversal_type = "debit"
    else:
        wallet.total_balance += amount
        wallet.available_balance += amount
        reversal_type = "credit"
    txn.status = "reversed"
    reversal = TransactionModel(
        user_id=user.id,
        txn_id=f"TXN-REV-{uuid.uuid4().hex[:8].upper()}",
        merchant="Reversal",
        type=reversal_type,
        amount=amount,
        category="reversal",
        note=payload.reason,
        status="completed",
    )
    db.add(reversal)
    db.commit()
    if payload.notify_user:
        send_email(user.email, "Transaction Reversed", f"<p>Your transaction {transaction_id} was reversed.</p><p>Reason: {payload.reason}</p>")
    _record_action(admin, "transaction_reversal", "transaction", transaction_id, {"reason": payload.reason, "notify_user": payload.notify_user}, target_user=user.email)
    return {"success": True, "transaction_id": transaction_id, "reversal_id": reversal.txn_id}


@router.post("/transactions/{transaction_id}/flag")
def flag_transaction(transaction_id: str, payload: TransactionFlagRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    txn = _find_transaction(db, transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if len(payload.notes.strip()) < 20:
        raise HTTPException(status_code=400, detail="Notes must be at least 20 characters")
    user = _find_user(db, txn.user_id)
    flag_id = f"flag_{uuid.uuid4().hex[:8]}"
    RISK_FLAGS[flag_id] = {
        "id": flag_id,
        "transaction_id": txn.txn_id,
        "user_id": user.id,
        "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
        "type": payload.flag_type,
        "severity": payload.severity,
        "amount": round(float(txn.amount or 0.0), 2),
        "status": "active",
        "created_at": iso_now(),
        "notes": payload.notes,
        "risk_score": {"low": 35, "medium": 58, "high": 82, "critical": 95}.get(payload.severity, 50),
        "activity_log": [{"action": "flagged", "actor": admin.email, "timestamp": iso_now()}],
    }
    _record_action(admin, "transaction_flagged", "transaction", txn.txn_id, {"flag_type": payload.flag_type, "severity": payload.severity}, target_user=user.email)
    return {"success": True, "flag_id": flag_id}


@router.get("/reconciliation")
def get_reconciliation(
    date: str = Query(""),
    status: str = Query("all"),
    processor: str = Query("all"),
    admin: UserModel = Depends(get_current_admin),
):
    items = list(RECONCILIATION_RUNS.values())
    if date:
        items = [item for item in items if item["start_date"] <= date <= item["end_date"]]
    if status != "all":
        items = [item for item in items if item["status"] == status]
    if processor != "all":
        items = [item for item in items if item["processor"].lower() == processor.lower()]
    items.sort(key=lambda item: item["created_at"], reverse=True)
    return {"items": items}


@router.post("/reconciliation/run")
def run_reconciliation(payload: ReconciliationRunRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    start_date = datetime.fromisoformat(payload.start_date)
    end_date = datetime.fromisoformat(payload.end_date)
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="Valid date range required")
    matched_transactions = []
    unmatched_transactions = []
    discrepancy_transactions = []
    all_txns = db.query(TransactionModel, UserModel).join(UserModel, UserModel.id == TransactionModel.user_id).all()
    for index, (txn, user) in enumerate(all_txns[:12]):
        item = {"id": txn.txn_id, "user_name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email, "type": txn.category or txn.type, "amount": round(float(txn.amount or 0.0), 2)}
        if index % 6 == 0:
            discrepancy_transactions.append(item)
        elif index % 4 == 0:
            unmatched_transactions.append(item)
        else:
            matched_transactions.append(item)
    extra_transactions = [{"id": f"PROC-{uuid.uuid4().hex[:6].upper()}", "user_name": "Processor Only", "type": payload.processor, "amount": 125.0}]
    record_id = f"rec_{uuid.uuid4().hex[:8]}"
    record = {
        "id": record_id,
        "processor": payload.processor,
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "total_transactions": len(matched_transactions) + len(unmatched_transactions) + len(discrepancy_transactions),
        "matched": len(matched_transactions),
        "unmatched": len(unmatched_transactions),
        "discrepancies": len(discrepancy_transactions),
        "status": "completed",
        "created_at": iso_now(),
        "matched_transactions": matched_transactions,
        "unmatched_transactions": unmatched_transactions,
        "extra_transactions": extra_transactions,
        "discrepancy_transactions": discrepancy_transactions,
    }
    RECONCILIATION_RUNS[record_id] = record
    _record_action(admin, "reconciliation_run", "reconciliation", record_id, {"processor": payload.processor, "start_date": payload.start_date, "end_date": payload.end_date})
    return record


@router.get("/reconciliation/{record_id}")
def get_reconciliation_detail(record_id: str, admin: UserModel = Depends(get_current_admin)):
    record = RECONCILIATION_RUNS.get(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Reconciliation record not found")
    return record


@router.get("/risk/flags")
def get_risk_flags(
    status: str = Query("all"),
    severity: str = Query("all"),
    flag_type: str = Query("all"),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    _seed_risk_flags(db)
    items = list(RISK_FLAGS.values())
    if status != "all":
        items = [item for item in items if item["status"] == status]
    if severity != "all":
        items = [item for item in items if item["severity"] == severity]
    if flag_type != "all":
        items = [item for item in items if item["type"] == flag_type]
    items.sort(key=lambda item: (item["severity"] != "critical", item["created_at"]), reverse=True)
    return {"items": items}


@router.put("/risk/flags/{flag_id}")
def update_risk_flag(flag_id: str, payload: RiskFlagUpdate, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    flag = RISK_FLAGS.get(flag_id)
    if not flag:
        raise HTTPException(status_code=404, detail="Risk flag not found")
    if not payload.notes.strip():
        raise HTTPException(status_code=400, detail="Notes are required")
    if payload.action not in {"dismiss", "escalate"}:
        raise HTTPException(status_code=400, detail="Invalid action")
    flag["status"] = "dismissed" if payload.action == "dismiss" else "escalated"
    flag["notes"] = payload.notes
    flag.setdefault("activity_log", []).append({"action": payload.action, "actor": admin.email, "timestamp": iso_now()})
    if payload.freeze_user:
        user = _find_user(db, flag["user_id"])
        if user:
            _set_user_status(user, "frozen")
            db.commit()
    _record_action(admin, "risk_flag_updated", "risk_flag", flag_id, {"action": payload.action, "freeze_user": payload.freeze_user}, target_user=flag["user_name"])
    return {"success": True, "flag": flag}


@router.get("/risk/rules")
def get_risk_rules(admin: UserModel = Depends(get_current_admin)):
    _seed_risk_rules()
    return {"items": list(RISK_RULES.values())}


@router.put("/risk/rules/{rule_id}")
def update_risk_rule(rule_id: str, payload: RiskRuleUpdate, admin: UserModel = Depends(get_current_admin)):
    _seed_risk_rules()
    rule = RISK_RULES.get(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    if payload.threshold <= 0:
        raise HTTPException(status_code=400, detail="Invalid threshold or parameters")
    rule["enabled"] = payload.enabled
    rule["threshold"] = payload.threshold
    rule["parameters"] = payload.parameters
    _record_action(admin, "risk_rule_updated", "risk_rule", rule_id, {"enabled": payload.enabled, "threshold": payload.threshold})
    return {"success": True, "rule": rule}


@router.get("/compliance/kyc-queue")
def get_kyc_queue(
    status: str = Query("all"),
    priority: str = Query("all"),
    submitted_after: str = Query(""),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = [_kyc_row(user) for user in db.query(UserModel).all()]
    if status != "all":
        rows = [row for row in rows if row["status"] == status]
    if priority != "all":
        rows = [row for row in rows if row["priority"] == priority]
    if submitted_after:
        cutoff = datetime.fromisoformat(submitted_after)
        rows = [row for row in rows if datetime.fromisoformat(row["submitted_date"].replace("Z", "")) >= cutoff]
    rows.sort(key=lambda row: (row["priority"] != "high", row["submitted_date"]))
    pending = [row for row in rows if row["status"] == "pending"]
    approved_today = len([row for row in rows if row["status"] == "verified" and row["submitted_date"][:10] == datetime.utcnow().date().isoformat()])
    rejected_today = len([row for row in rows if row["status"] == "rejected" and row["submitted_date"][:10] == datetime.utcnow().date().isoformat()])
    avg_review = round(sum(row["waiting_days"] for row in pending) / len(pending), 1) if pending else 0.0
    return {
        "items": rows,
        "summary": {
            "pending_review": len(pending),
            "approved_today": approved_today,
            "rejected_today": rejected_today,
            "average_review_time_hours": avg_review * 24,
        },
    }


@router.put("/compliance/kyc/{user_id}")
def update_kyc_status(user_id: str, payload: KycDecisionRequest, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    user = _find_user(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    if payload.action not in {"approve", "reject", "request_reupload"}:
        raise HTTPException(status_code=400, detail="Invalid action")
    if payload.action != "approve" and not payload.rejection_reason.strip():
        raise HTTPException(status_code=400, detail="KYC rejection reason required")
    record = get_kyc_record(user.id)
    if payload.action == "approve":
        user.kyc_status = "verified"
        record["status"] = "verified"
        record["reason"] = ""
        for step in record["steps"]:
            step["completed"] = True
        send_email(user.email, "KYC Approved", "<p>Your KYC has been approved.</p>")
    elif payload.action == "request_reupload":
        user.kyc_status = "rejected"
        record["status"] = "rejected"
        record["reason"] = payload.rejection_reason
        record["notes"] = payload.notes
        send_email(user.email, "KYC Re-upload Required", f"<p>Please re-upload your documents.</p><p>Reason: {payload.rejection_reason}</p>")
    else:
        user.kyc_status = "rejected"
        record["status"] = "rejected"
        record["reason"] = payload.rejection_reason
        record["notes"] = payload.notes
        send_email(user.email, "KYC Rejected", f"<p>Your KYC was rejected.</p><p>Reason: {payload.rejection_reason}</p>")
    db.commit()
    _record_action(admin, "kyc_review", "user", user.id, {"action": payload.action, "rejection_reason": payload.rejection_reason, "notes": payload.notes}, target_user=user.email)
    return {"success": True, "user_id": user.id, "status": user.kyc_status}


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    action_type: str = Query("all"),
    admin_user: str = Query(""),
    date_range: str = Query(""),
    entity_type: str = Query("all"),
    search: str = Query(""),
    admin: UserModel = Depends(get_current_admin),
):
    items = list(ADMIN_ACTIONS)
    if action_type != "all":
        items = [item for item in items if item["action_type"] == action_type]
    if entity_type != "all":
        items = [item for item in items if item["entity_type"] == entity_type]
    if admin_user:
        query = admin_user.lower()
        items = [item for item in items if query in item["admin_user"].lower()]
    if search:
        query = search.lower()
        items = [item for item in items if query in item["entity_id"].lower() or query in item["admin_user"].lower()]
    if date_range:
        parts = [part.strip() for part in date_range.split(",") if part.strip()]
        if len(parts) == 2:
            start = datetime.fromisoformat(parts[0])
            end = datetime.fromisoformat(parts[1]) + timedelta(days=1)
            items = [item for item in items if start <= datetime.fromisoformat(item["timestamp"].replace("Z", "")) <= end]
    total = len(items)
    start_index = (page - 1) * limit
    return {"items": items[start_index:start_index + limit], "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/audit-logs/export")
def export_audit_logs(
    format: str = Query("csv"),
    date_range: str = Query(""),
    action_type: str = Query("all"),
    admin_user: str = Query(""),
    admin: UserModel = Depends(get_current_admin),
):
    if format != "csv":
        raise HTTPException(status_code=400, detail="Export failed, try again")
    items = get_audit_logs(page=1, limit=10000, action_type=action_type, admin_user=admin_user, date_range=date_range, entity_type="all", search="", admin=admin)["items"]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["timestamp", "admin_user", "action_type", "entity_type", "entity_id", "details", "ip_address"])
    for item in items:
        writer.writerow([item["timestamp"], item["admin_user"], item["action_type"], item["entity_type"], item["entity_id"], json.dumps(item["details"]), item["ip_address"]])
    filename = f"audit_logs_{datetime.utcnow().date().isoformat()}.csv"
    return Response(content=buffer.getvalue().encode("utf-8"), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/support/tickets")
def get_admin_support_tickets(
    status: str = Query("all"),
    priority: str = Query("all"),
    assigned_to: str = Query("all"),
    user_id: str = Query(""),
    admin: UserModel = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    tickets = _all_support_tickets(db)
    if status != "all":
        tickets = [ticket for ticket in tickets if ticket["status"] == status]
    if priority != "all":
        tickets = [ticket for ticket in tickets if ticket["priority"] == priority]
    if assigned_to == "unassigned":
        tickets = [ticket for ticket in tickets if not ticket["assigned_to"]]
    elif assigned_to == "me":
        tickets = [ticket for ticket in tickets if ticket["assigned_to"] == admin.email]
    elif assigned_to not in {"all", "", None}:
        tickets = [ticket for ticket in tickets if ticket["assigned_to"] == assigned_to]
    if user_id:
        query = user_id.lower()
        tickets = [ticket for ticket in tickets if query in ticket["user_id"].lower() or query in ticket["user_email"].lower() or query in ticket["id"].lower()]
    response_times = []
    for ticket in tickets:
        if ticket["messages"]:
            first_admin = next((message for message in ticket["messages"] if message.get("sender") == "agent"), None)
            if first_admin:
                created = datetime.fromisoformat(ticket["created_at"].replace("Z", ""))
                replied = datetime.fromisoformat(first_admin["timestamp"].replace("Z", ""))
                response_times.append((replied - created).total_seconds() / 3600)
    avg_response = round(sum(response_times) / len(response_times), 1) if response_times else 0.0
    return {
        "items": tickets,
        "summary": {
            "open_tickets": len([ticket for ticket in tickets if ticket["status"] == "open"]),
            "in_progress": len([ticket for ticket in tickets if ticket["status"] == "in_progress"]),
            "resolved_today": len([ticket for ticket in tickets if ticket["status"] == "resolved" and ticket["updated_at"][:10] == datetime.utcnow().date().isoformat()]),
            "avg_response_time_hours": avg_response,
        },
    }


@router.put("/support/tickets/{ticket_id}")
def update_support_ticket(ticket_id: str, payload: SupportTicketUpdate, admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    found_ticket = None
    found_user = None
    for user in db.query(UserModel).all():
        for ticket in get_support_tickets(user.id):
            if ticket["id"] == ticket_id:
                found_ticket = ticket
                found_user = user
                break
        if found_ticket:
            break
    if not found_ticket or not found_user:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if payload.status:
        found_ticket["status"] = payload.status
    if payload.assigned_agent is not None:
        found_ticket["assigned_agent"] = payload.assigned_agent or None
    if payload.internal_note:
        found_ticket.setdefault("internal_notes", []).append({"id": f"note_{uuid.uuid4().hex[:8]}", "author": admin.email, "message": payload.internal_note, "timestamp": iso_now()})
    if payload.reply_message:
        if not payload.reply_message.strip():
            raise HTTPException(status_code=400, detail="Reply not sent, try again")
        messages = get_ticket_messages(ticket_id)
        messages.append({"id": f"msg_{uuid.uuid4().hex[:8]}", "sender": "agent", "message": payload.reply_message.strip(), "timestamp": iso_now()})
        if found_ticket.get("status") == "open":
            found_ticket["status"] = "in_progress"
        send_email(found_user.email, f"Support update for {ticket_id}", f"<p>{payload.reply_message.strip()}</p>")
    found_ticket["updated_at"] = iso_now()
    _record_action(admin, "support_ticket_updated", "support_ticket", ticket_id, payload.model_dump(), target_user=found_user.email)
    return {"success": True, "ticket": _serialize_support_ticket(found_ticket, found_user)}


@router.get("/settings")
def get_admin_settings(admin: UserModel = Depends(get_current_admin)):
    return ADMIN_SETTINGS


@router.put("/settings")
def update_admin_settings(payload: AdminSettingsUpdate, admin: UserModel = Depends(get_current_admin)):
    maintenance = payload.maintenance_mode or {}
    if maintenance.get("enabled") and not str(maintenance.get("message", "")).strip():
        raise HTTPException(status_code=400, detail="Maintenance message is required")
    ADMIN_SETTINGS["transaction_fees"] = payload.transaction_fees
    ADMIN_SETTINGS["withdrawal_limits"] = payload.withdrawal_limits
    ADMIN_SETTINGS["deposit_limits"] = payload.deposit_limits
    ADMIN_SETTINGS["feature_flags"] = payload.feature_flags
    ADMIN_SETTINGS["maintenance_mode"] = payload.maintenance_mode
    ADMIN_SETTINGS["last_modified_by"] = admin.email
    ADMIN_SETTINGS["last_modified_at"] = iso_now()
    _record_action(admin, "settings_updated", "settings", "platform", {"sections": ["fees", "limits", "features", "maintenance"]})
    return ADMIN_SETTINGS


@router.get("/settings/integrations")
def get_admin_integrations(admin: UserModel = Depends(get_current_admin)):
    return {"items": ADMIN_INTEGRATIONS}


@router.get("/export/users")
def export_users_csv(admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = get_users(page=1, limit=10000, search="", status="all", kyc_status="all", sort_by="joined_date", admin=admin, db=db)["items"]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["user_id", "name", "email", "phone", "status", "kyc_status", "balance", "joined_date"])
    for row in rows:
        writer.writerow([row["id"], row["name"], row["email"], row["phone"], row["status"], row["kyc_status"], row["wallet_balance"], row["joined_date"]])
    return Response(content=buffer.getvalue().encode("utf-8"), media_type="text/csv")


@router.get("/export/wallets")
def export_wallets_csv(admin: UserModel = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = get_wallets(page=1, limit=10000, sort_by="balance_desc", min_balance=0, max_balance=None, status="all", admin=admin, db=db)["items"]
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["user_id", "user_name", "balance", "currency", "status", "last_transaction_date"])
    for row in rows:
        writer.writerow([row["user_id"], row["user_name"], row["balance"], row["currency"], row["status"], row["last_transaction_date"]])
    return Response(content=buffer.getvalue().encode("utf-8"), media_type="text/csv")
