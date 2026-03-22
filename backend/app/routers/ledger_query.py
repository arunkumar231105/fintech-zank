import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_admin
from ..models import Account, AuditLog, LedgerEntry, Transaction, TransactionEvent, User
from ..services.ledger_service import get_realtime_balance, serialize_ledger_entry

router = APIRouter()


class LedgerTransactionFilterRequest(BaseModel):
    account_id: str | None = None
    user_search: str | None = None
    status: str | None = None
    transaction_type: str | None = None
    from_date: str | None = None
    to_date: str | None = None
    limit: int = 20
    offset: int = 0


def _serialize_transaction(transaction: Transaction):
    entries = [serialize_ledger_entry(entry) for entry in sorted(transaction.ledger_entries, key=lambda item: (item.created_at or datetime.utcnow(), item.id))]
    metadata = transaction.metadata_json or {}
    return {
        "id": transaction.id,
        "reference_id": transaction.reference_id or transaction.txn_id,
        "type": transaction.transaction_type or transaction.type,
        "status": transaction.status,
        "amount": float(transaction.amount or 0),
        "currency": transaction.currency or "USD",
        "created_at": transaction.date.isoformat() if transaction.date else None,
        "posted_at": transaction.posted_at.isoformat() if transaction.posted_at else None,
        "metadata": metadata,
        "from_user": metadata.get("from_user_id") or metadata.get("user_id"),
        "to_user": metadata.get("to_user_id") or metadata.get("merchant_id") or metadata.get("merchant"),
        "fee": float(metadata.get("fee", 0) or 0),
        "entries": entries,
    }


@router.post("/transactions")
def query_ledger_transactions(payload: LedgerTransactionFilterRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    query = db.query(Transaction).options(joinedload(Transaction.ledger_entries))
    if payload.account_id:
        query = query.join(LedgerEntry).filter(LedgerEntry.account_id == payload.account_id)
    if payload.user_search:
        pattern = f"%{payload.user_search}%"
        query = query.filter(
            (Transaction.user_id.ilike(pattern))
            | (Transaction.reference_id.ilike(pattern))
            | (Transaction.txn_id.ilike(pattern))
        )
    if payload.status:
        query = query.filter(Transaction.status == payload.status)
    if payload.transaction_type:
        query = query.filter(Transaction.transaction_type == payload.transaction_type)
    if payload.from_date:
        query = query.filter(Transaction.date >= datetime.fromisoformat(payload.from_date))
    if payload.to_date:
        query = query.filter(Transaction.date <= datetime.fromisoformat(payload.to_date))
    total = query.distinct(Transaction.id).count()
    items = (
        query.distinct(Transaction.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .offset(payload.offset)
        .limit(payload.limit)
        .all()
    )
    return {
        "items": [_serialize_transaction(item) for item in items],
        "pagination": {"limit": payload.limit, "offset": payload.offset, "total": total},
    }


@router.get("/transactions/{transaction_id}")
def get_query_transaction(transaction_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.ledger_entries))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    payload = _serialize_transaction(transaction)
    events = (
        db.query(TransactionEvent)
        .filter(TransactionEvent.transaction_id == transaction.id)
        .order_by(TransactionEvent.created_at.asc(), TransactionEvent.id.asc())
        .all()
    )
    payload["events"] = [
        {
            "id": event.id,
            "from_status": event.from_status,
            "to_status": event.to_status,
            "actor_id": event.actor_id,
            "metadata": event.metadata_json or {},
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }
        for event in events
    ]
    return payload


@router.get("/accounts/{account_id}")
def get_account_details(account_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    realtime = get_realtime_balance(db, account_id)
    return {
        "id": account.id,
        "user_id": account.user_id,
        "account_type": account.account_type,
        "currency": account.currency,
        "status": account.status,
        "balance_cached": float(account.balance_cached or 0),
        "realtime_balance": float(realtime),
        "created_at": account.created_at.isoformat() if account.created_at else None,
    }


@router.get("/accounts/{account_id}/entries")
def get_account_entries(
    account_id: str,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    from_date: str | None = None,
    to_date: str | None = None,
    entry_type: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = (
        db.query(LedgerEntry)
        .options(joinedload(LedgerEntry.transaction))
        .filter(LedgerEntry.account_id == account_id)
    )
    if from_date:
        query = query.filter(LedgerEntry.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(LedgerEntry.created_at <= datetime.fromisoformat(to_date))
    if entry_type:
        query = query.filter(LedgerEntry.entry_type == entry_type)
    total = query.count()
    items = query.order_by(LedgerEntry.created_at.desc(), LedgerEntry.id.desc()).offset(offset).limit(limit).all()
    return {"items": [serialize_ledger_entry(item) for item in items], "pagination": {"limit": limit, "offset": offset, "total": total}}


@router.get("/accounts/{account_id}/balance")
def get_account_balance(account_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    cached = float(account.balance_cached or 0)
    realtime = float(get_realtime_balance(db, account_id))
    return {
        "account_id": account.id,
        "cached_balance": cached,
        "realtime_balance": realtime,
        "currency": account.currency,
        "is_reconciled": cached == realtime,
    }


@router.get("/audit-logs")
def get_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    action: str = Query("all"),
    actor: str = Query(""),
    resource_type: str = Query("all"),
    from_date: str | None = None,
    to_date: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).options(joinedload(AuditLog.actor))
    if action != "all":
        query = query.filter(AuditLog.action == action)
    if actor:
        query = query.join(User, User.id == AuditLog.actor_id, isouter=True).filter((User.email.ilike(f"%{actor}%")) | (User.first_name.ilike(f"%{actor}%")) | (User.last_name.ilike(f"%{actor}%")))
    if resource_type != "all":
        query = query.filter(AuditLog.resource_type == resource_type)
    if from_date:
        query = query.filter(AuditLog.timestamp >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(AuditLog.timestamp <= datetime.fromisoformat(to_date))
    total = query.count()
    rows = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).offset((page - 1) * limit).limit(limit).all()
    items = [
        {
            "id": row.id,
            "actor": (f"{row.actor.first_name or ''} {row.actor.last_name or ''}".strip() if row.actor else "System") or (row.actor.email if row.actor else "System"),
            "actor_email": row.actor.email if row.actor else "",
            "action": row.action,
            "resource_type": row.resource_type,
            "resource_id": row.resource_id,
            "metadata": row.metadata_json or {},
            "ip_address": row.ip_address,
            "timestamp": row.timestamp.isoformat() if row.timestamp else None,
        }
        for row in rows
    ]
    return {"items": items, "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/audit-logs/export")
def export_audit_logs(
    action: str = Query("all"),
    actor: str = Query(""),
    resource_type: str = Query("all"),
    from_date: str | None = None,
    to_date: str | None = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    result = get_audit_logs(1, 10000, action, actor, resource_type, from_date, to_date, admin, db)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["timestamp", "actor", "action", "resource_type", "resource_id", "ip_address"])
    for item in result["items"]:
        writer.writerow([item["timestamp"], item["actor"], item["action"], item["resource_type"], item["resource_id"], item["ip_address"]])
    filename = f"audit_logs_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(content=buffer.getvalue().encode("utf-8"), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
