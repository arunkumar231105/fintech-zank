import hashlib
import json
from decimal import Decimal
from datetime import datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..models import Account, LedgerEntry, Transaction, User
from ..services.audit_service import log_audit_event
from ..services.idempotency_service import check_idempotency_key, cleanup_expired_keys_task, save_idempotency_key
from ..services.ledger_service import (
    create_reversal_transaction,
    get_cached_balance,
    get_realtime_balance,
    post_ledger_transaction,
    serialize_ledger_entry,
)

router = APIRouter()


class LedgerEntryInput(BaseModel):
    account_id: str
    entry_type: str
    amount: Decimal = Field(..., gt=0)


class LedgerPostRequest(BaseModel):
    entries: list[LedgerEntryInput]
    transaction_type: str
    reference_id: str
    currency: str = "USD"
    metadata: dict[str, Any] | None = None


def _serialize_transaction(transaction: Transaction):
    entries = [serialize_ledger_entry(entry) for entry in transaction.ledger_entries]
    return {
        "transaction_id": transaction.id,
        "reference_id": transaction.reference_id or transaction.txn_id,
        "transaction_type": transaction.transaction_type or transaction.type,
        "status": transaction.status,
        "amount": float(transaction.amount or 0),
        "currency": transaction.currency or "USD",
        "created_at": transaction.date.isoformat() if transaction.date else None,
        "posted_at": transaction.posted_at.isoformat() if transaction.posted_at else None,
        "metadata": transaction.metadata_json,
        "entries": entries,
    }


@router.post("/post")
def post_internal_ledger_transaction(
    payload: LedgerPostRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    background_tasks.add_task(cleanup_expired_keys_task)
    idempotency_key = request.headers.get("Idempotency-Key", "").strip()
    request_hash = hashlib.sha256(json.dumps(payload.model_dump(mode="json"), sort_keys=True, default=str).encode("utf-8")).hexdigest()

    if idempotency_key:
        existing = check_idempotency_key(db, idempotency_key)
        if existing is not None:
            return existing
        save_idempotency_key(db, idempotency_key, request_hash, None, "processing")
        db.commit()

    try:
        transaction = post_ledger_transaction(
            db=db,
            entries=[entry.model_dump() for entry in payload.entries],
            transaction_type=payload.transaction_type,
            reference_id=payload.reference_id,
            currency=payload.currency,
            metadata={**(payload.metadata or {}), "posted_by_admin_id": admin.id},
        )
        db.commit()
        db.refresh(transaction)
    except ValueError as exc:
        if idempotency_key:
            save_idempotency_key(db, idempotency_key, request_hash, {"detail": str(exc)}, "failed")
            db.commit()
        raise HTTPException(status_code=400, detail=str(exc))

    response_payload = {
        "transaction_id": transaction.id,
        "status": transaction.status,
        "posted_at": transaction.posted_at.isoformat() if transaction.posted_at else None,
    }
    if idempotency_key:
        save_idempotency_key(db, idempotency_key, request_hash, response_payload, "completed")
        db.commit()
    log_audit_event(
        db,
        actor_id=admin.id,
        action="ledger_post",
        resource_type="transaction",
        resource_id=transaction.id,
        metadata={"reference_id": transaction.reference_id, "transaction_type": transaction.transaction_type},
        ip_address=request.client.host if request.client else None,
    )
    return response_payload


@router.get("/balance/{account_id}")
def get_ledger_balance(account_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found.")
    if current_user.role != "admin" and account.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed to view this account balance.")
    cached = get_cached_balance(db, account_id)
    realtime = get_realtime_balance(db, account_id)
    return {
        "account_id": account.id,
        "cached_balance": float(cached),
        "realtime_balance": float(realtime),
        "currency": account.currency,
    }


@router.get("/entries/{account_id}")
def get_account_ledger_entries(
    account_id: str,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    from_date: str | None = None,
    to_date: str | None = None,
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
    total = query.count()
    entries = query.order_by(LedgerEntry.created_at.desc(), LedgerEntry.id.desc()).offset(offset).limit(limit).all()
    return {
        "items": [serialize_ledger_entry(entry) for entry in entries],
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total,
        },
    }


@router.get("/transaction/{transaction_id}")
def get_ledger_transaction(transaction_id: int, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.ledger_entries))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    return _serialize_transaction(transaction)


@router.post("/reverse/{transaction_id}")
def reverse_ledger_transaction(transaction_id: int, request: Request, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    transaction = create_reversal_transaction(db, transaction_id)
    db.commit()
    db.refresh(transaction)
    log_audit_event(
        db,
        actor_id=admin.id,
        action="ledger_reversal",
        resource_type="transaction",
        resource_id=transaction.id,
        metadata={"reference_id": transaction.reference_id, "reversal_of": transaction.metadata_json.get("reversal_of") if transaction.metadata_json else None},
        ip_address=request.client.host if request.client else None,
    )
    return {
        "transaction_id": transaction.id,
        "reference_id": transaction.reference_id,
        "status": transaction.status,
        "posted_at": transaction.posted_at.isoformat() if transaction.posted_at else None,
    }
