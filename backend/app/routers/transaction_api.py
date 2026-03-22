from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..models import Transaction, TransactionEvent, User
from ..services.ledger_service import serialize_ledger_entry
from ..services.transaction_service import process_deposit, process_payment, process_transfer, process_withdrawal

router = APIRouter()


class TransferRequest(BaseModel):
    to_user_id: str | None = None
    recipient: str | None = None
    amount: Decimal
    currency: str = "USD"


class DepositRequest(BaseModel):
    amount: Decimal
    currency: str = "USD"
    reference_id: str


class WithdrawalRequest(BaseModel):
    amount: Decimal
    currency: str = "USD"
    reference_id: str | None = None


class PaymentRequest(BaseModel):
    amount: Decimal
    currency: str = "USD"
    merchant_id: str
    reference_id: str


def _resolve_recipient_user(db: Session, value: str) -> User:
    recipient = db.query(User).filter((User.id == value) | (User.email == value)).first()
    if not recipient:
        raise HTTPException(status_code=404, detail="Recipient user not found.")
    return recipient


@router.post("/transfer")
def transfer_money(
    payload: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    request: Request = None,
):
    recipient_id = payload.to_user_id
    if not recipient_id and payload.recipient:
        recipient = _resolve_recipient_user(db, payload.recipient.strip())
        recipient_id = recipient.id
    if not recipient_id:
        raise HTTPException(status_code=400, detail="Recipient user is required.")
    result = process_transfer(db, current_user.id, recipient_id, payload.amount, payload.currency, idempotency_key or "", request.client.host if request and request.client else None)
    db.commit()
    return result


@router.post("/deposit")
def deposit_money(payload: DepositRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    result = process_deposit(db, admin.id, payload.amount, payload.currency, payload.reference_id)
    db.commit()
    return result


@router.post("/withdraw")
def withdraw_money(payload: WithdrawalRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db), request: Request = None):
    reference_id = payload.reference_id or f"TXN-WDR-{uuid.uuid4().hex[:10].upper()}"
    result = process_withdrawal(db, current_user.id, payload.amount, payload.currency, reference_id, request.client.host if request and request.client else None)
    db.commit()
    return result


@router.post("/payment")
def pay_merchant(
    payload: PaymentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    request: Request = None,
):
    result = process_payment(db, current_user.id, payload.amount, payload.currency, payload.merchant_id, payload.reference_id, idempotency_key or "", request.client.host if request and request.client else None)
    db.commit()
    return result


@router.get("/details/{transaction_id}")
def get_transaction_details(transaction_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    transaction = (
        db.query(Transaction)
        .options(joinedload(Transaction.ledger_entries))
        .filter(Transaction.id == transaction_id)
        .first()
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    if current_user.role != "admin" and transaction.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You cannot access this transaction.")
    events = (
        db.query(TransactionEvent)
        .filter(TransactionEvent.transaction_id == transaction.id)
        .order_by(TransactionEvent.created_at.asc(), TransactionEvent.id.asc())
        .all()
    )
    return {
        "id": transaction.id,
        "reference_id": transaction.reference_id or transaction.txn_id,
        "type": transaction.transaction_type or transaction.type,
        "status": transaction.status,
        "amount": float(transaction.amount or 0),
        "currency": transaction.currency or "USD",
        "created_at": transaction.date.isoformat() if transaction.date else None,
        "posted_at": transaction.posted_at.isoformat() if transaction.posted_at else None,
        "metadata": transaction.metadata_json or {},
        "entries": [serialize_ledger_entry(entry) for entry in transaction.ledger_entries],
        "events": [
            {
                "id": event.id,
                "from_status": event.from_status,
                "to_status": event.to_status,
                "actor_id": event.actor_id,
                "metadata": event.metadata_json or {},
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ],
    }
