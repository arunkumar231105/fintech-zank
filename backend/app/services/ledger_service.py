from __future__ import annotations

from decimal import Decimal
from datetime import datetime
from typing import Iterable
import uuid

from fastapi import HTTPException
from sqlalchemy import event, func
from sqlalchemy.orm import Session, Session as SessionBase

from ..models import Account, LedgerEntry, Transaction, User, Wallet


VALID_ACCOUNT_TYPES = {
    "user_wallet",
    "settlement_pool",
    "fee_revenue",
    "ach_clearing",
    "card_processor",
    "treasury",
}
VALID_ACCOUNT_STATUSES = {"active", "frozen", "closed"}
VALID_TRANSACTION_TYPES = {"transfer", "deposit", "withdrawal", "payment", "fee", "refund", "reversal"}
VALID_TRANSACTION_STATUSES = {"pending", "processing", "posted", "failed", "reversed"}
VALID_ENTRY_TYPES = {"debit", "credit"}
SYSTEM_ACCOUNT_TYPES = {"settlement_pool", "fee_revenue", "ach_clearing", "card_processor", "treasury"}


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _amount_to_float(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.00000001")))


def _queue_wallet_event(session: Session, transaction_id=None, entry_ids=None):
    transaction_ids = session.info.setdefault("wallet_event_transaction_ids", [])
    queued_entry_ids = session.info.setdefault("wallet_event_entry_ids", [])
    if transaction_id is not None and transaction_id not in transaction_ids:
        transaction_ids.append(transaction_id)
    for entry_id in entry_ids or []:
        if entry_id not in queued_entry_ids:
            queued_entry_ids.append(entry_id)


@event.listens_for(SessionBase, "after_commit")
def _run_wallet_events_after_commit(session):
    transaction_ids = session.info.pop("wallet_event_transaction_ids", [])
    entry_ids = session.info.pop("wallet_event_entry_ids", [])
    if not transaction_ids and not entry_ids:
        return
    from .wallet_events import process_ledger_wallet_events
    process_ledger_wallet_events(transaction_ids=transaction_ids, entry_ids=entry_ids)


@event.listens_for(SessionBase, "after_rollback")
def _clear_wallet_event_queue(session):
    session.info.pop("wallet_event_transaction_ids", None)
    session.info.pop("wallet_event_entry_ids", None)


def _validate_entries(entries: Iterable[dict]) -> list[dict]:
    normalized = []
    for raw in entries:
        account_id = str(raw.get("account_id", "")).strip()
        entry_type = str(raw.get("entry_type", "")).strip().lower()
        amount = _to_decimal(raw.get("amount", 0))
        if not account_id:
            raise ValueError("Each entry must include an account_id.")
        if entry_type not in VALID_ENTRY_TYPES:
            raise ValueError(f"Invalid entry_type '{entry_type}'.")
        if amount <= 0:
            raise ValueError("Ledger entry amount must be greater than zero.")
        normalized.append({"account_id": account_id, "entry_type": entry_type, "amount": amount})
    if len(normalized) < 2:
        raise ValueError("A ledger transaction requires at least two entries.")
    return normalized


def ensure_system_account(db: Session, account_type: str, currency: str = "USD") -> Account:
    if account_type not in SYSTEM_ACCOUNT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported system account type '{account_type}'.")
    account = (
        db.query(Account)
        .filter(Account.user_id.is_(None), Account.account_type == account_type, Account.currency == currency)
        .first()
    )
    if account:
        return account
    account = Account(
        id=str(uuid.uuid4()),
        user_id=None,
        account_type=account_type,
        currency=currency,
        status="active",
        balance_cached=Decimal("0"),
    )
    db.add(account)
    db.flush()
    return account


def ensure_user_wallet_account(db: Session, user_id: str, currency: str = "USD", opening_balance=None) -> Account:
    account = (
        db.query(Account)
        .filter(Account.user_id == user_id, Account.account_type == "user_wallet", Account.currency == currency)
        .first()
    )
    if account:
        return account

    account = Account(
        id=str(uuid.uuid4()),
        user_id=user_id,
        account_type="user_wallet",
        currency=currency,
        status="active",
        balance_cached=Decimal("0"),
    )
    db.add(account)
    db.flush()

    opening_amount = _to_decimal(opening_balance or 0)
    if opening_amount > 0:
        treasury = ensure_system_account(db, "treasury", currency)
        post_ledger_transaction(
            db=db,
            entries=[
                {"account_id": treasury.id, "entry_type": "debit", "amount": opening_amount},
                {"account_id": account.id, "entry_type": "credit", "amount": opening_amount},
            ],
            transaction_type="deposit",
            reference_id=f"LEDGER-OPEN-{uuid.uuid4().hex[:12].upper()}",
            currency=currency,
            metadata={"source": "wallet_opening_balance", "user_id": user_id},
        )
    return account


def post_ledger_transaction(
    db: Session,
    entries,
    transaction_type: str,
    reference_id: str,
    currency: str,
    metadata=None,
    existing_transaction: Transaction | None = None,
    final_status: str = "posted",
) -> Transaction:
    normalized_entries = _validate_entries(entries)
    transaction_type = str(transaction_type).strip().lower()
    if transaction_type not in VALID_TRANSACTION_TYPES:
        raise ValueError(f"Invalid transaction_type '{transaction_type}'.")
    if not reference_id:
        raise ValueError("reference_id is required.")
    if not existing_transaction and db.query(Transaction).filter(Transaction.reference_id == reference_id).first():
        raise ValueError("reference_id already exists.")

    account_ids = [entry["account_id"] for entry in normalized_entries]
    accounts = (
        db.query(Account)
        .filter(Account.id.in_(account_ids))
        .with_for_update()
        .all()
    )
    account_map = {account.id: account for account in accounts}
    if len(account_map) != len(set(account_ids)):
        missing = sorted(set(account_ids) - set(account_map.keys()))
        raise ValueError(f"Account not found: {', '.join(missing)}")

    for account in accounts:
        if account.status != "active":
            raise ValueError(f"Account {account.id} is not active.")
        if account.currency != currency:
            raise ValueError("Currency mismatch detected")

    debit_total = sum(entry["amount"] for entry in normalized_entries if entry["entry_type"] == "debit")
    credit_total = sum(entry["amount"] for entry in normalized_entries if entry["entry_type"] == "credit")
    if debit_total != credit_total:
        raise ValueError("Debits must equal credits")

    projected_balances = {}
    for entry in normalized_entries:
        account = account_map[entry["account_id"]]
        current_balance = projected_balances.get(account.id, _to_decimal(account.balance_cached or 0))
        next_balance = current_balance - entry["amount"] if entry["entry_type"] == "debit" else current_balance + entry["amount"]
        if account.account_type == "user_wallet" and next_balance < 0:
            raise ValueError("Insufficient wallet balance")
        projected_balances[account.id] = next_balance

    owner_user_id = next((account.user_id for account in accounts if account.user_id), None)
    now = datetime.utcnow()

    try:
        if existing_transaction is not None:
            transaction = existing_transaction
            transaction.user_id = transaction.user_id or owner_user_id
            transaction.txn_id = transaction.txn_id or reference_id
            transaction.reference_id = reference_id
            transaction.transaction_type = transaction_type
            transaction.merchant = (metadata or {}).get("merchant") if metadata else transaction.merchant
            transaction.type = transaction_type
            transaction.amount = _amount_to_float(debit_total)
            transaction.currency = currency
            transaction.category = transaction_type
            transaction.note = (metadata or {}).get("description") if metadata else transaction.note
            transaction.date = transaction.date or now
            transaction.metadata_json = metadata if metadata is not None else transaction.metadata_json
        else:
            transaction = Transaction(
                user_id=owner_user_id,
                txn_id=reference_id,
                reference_id=reference_id,
                transaction_type=transaction_type,
                merchant=(metadata or {}).get("merchant") if metadata else None,
                type=transaction_type,
                amount=_amount_to_float(debit_total),
                currency=currency,
                category=transaction_type,
                status="pending",
                note=(metadata or {}).get("description") if metadata else None,
                date=now,
                metadata_json=metadata,
            )
            db.add(transaction)
        db.flush()

        created_entry_ids = []
        for entry in normalized_entries:
            account = account_map[entry["account_id"]]
            current_balance = _to_decimal(account.balance_cached or 0)
            next_balance = current_balance - entry["amount"] if entry["entry_type"] == "debit" else current_balance + entry["amount"]
            ledger_entry = LedgerEntry(
                id=str(uuid.uuid4()),
                transaction_id=transaction.id,
                account_id=account.id,
                entry_type=entry["entry_type"],
                amount=entry["amount"],
                currency=currency,
                balance_after=next_balance,
            )
            db.add(ledger_entry)
            account.balance_cached = next_balance
            db.flush()
            created_entry_ids.append(ledger_entry.id)

        transaction.status = final_status
        if final_status in {"posted", "completed", "reversed"}:
            transaction.posted_at = datetime.utcnow()
        db.flush()
        _queue_wallet_event(db, transaction.id, created_entry_ids)
        return transaction
    except ValueError:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to post ledger transaction: {exc}") from exc


def create_reversal_transaction(db: Session, original_transaction_id) -> Transaction:
    original = (
        db.query(Transaction)
        .filter(Transaction.id == original_transaction_id)
        .first()
    )
    if not original:
        raise HTTPException(status_code=404, detail="Original transaction not found.")
    if original.status == "reversed":
        raise HTTPException(status_code=400, detail="Transaction has already been reversed.")

    original_entries = (
        db.query(LedgerEntry)
        .filter(LedgerEntry.transaction_id == original.id)
        .order_by(LedgerEntry.created_at.asc(), LedgerEntry.id.asc())
        .all()
    )
    if not original_entries:
        raise HTTPException(status_code=400, detail="Original transaction has no ledger entries.")

    reversal_entries = []
    for entry in original_entries:
        reversal_entries.append(
            {
                "account_id": entry.account_id,
                "entry_type": "credit" if entry.entry_type == "debit" else "debit",
                "amount": _to_decimal(entry.amount),
            }
        )

    reversal = post_ledger_transaction(
        db=db,
        entries=reversal_entries,
        transaction_type="reversal",
        reference_id=f"{original.reference_id or original.txn_id or f'TXN-{original.id}'}-REV-{uuid.uuid4().hex[:6].upper()}",
        currency=original.currency or "USD",
        metadata={"reversal_of": original.id, "original_reference_id": original.reference_id or original.txn_id},
    )
    original.status = "reversed"
    original.posted_at = original.posted_at or datetime.utcnow()
    db.flush()
    return reversal


def get_realtime_balance(db: Session, account_id: str) -> Decimal:
    credit_sum = (
        db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
        .filter(LedgerEntry.account_id == account_id, LedgerEntry.entry_type == "credit")
        .scalar()
    )
    debit_sum = (
        db.query(func.coalesce(func.sum(LedgerEntry.amount), 0))
        .filter(LedgerEntry.account_id == account_id, LedgerEntry.entry_type == "debit")
        .scalar()
    )
    return _to_decimal(credit_sum) - _to_decimal(debit_sum)


def get_cached_balance(db: Session, account_id: str) -> Decimal:
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    return _to_decimal(account.balance_cached or 0)


def sync_wallet_from_ledger(db: Session, user_id: str, currency: str = "USD") -> dict | None:
    account = ensure_user_wallet_account(db, user_id, currency=currency)
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        return None
    cached = get_cached_balance(db, account.id)
    wallet.total_balance = _amount_to_float(cached)
    wallet.available_balance = _amount_to_float(cached)
    db.flush()
    return {"account_id": account.id, "cached_balance": cached}


def serialize_ledger_entry(entry: LedgerEntry) -> dict:
    transaction = entry.transaction
    return {
        "id": entry.id,
        "transaction_id": transaction.id if transaction else None,
        "account_id": entry.account_id,
        "reference_id": transaction.reference_id if transaction else None,
        "type": transaction.transaction_type if transaction else None,
        "status": transaction.status if transaction else None,
        "amount": float(entry.amount or 0),
        "entry_type": entry.entry_type,
        "currency": entry.currency,
        "balance_after": float(entry.balance_after or 0),
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "posted_at": transaction.posted_at.isoformat() if transaction and transaction.posted_at else None,
        "metadata": transaction.metadata_json if transaction else None,
    }
