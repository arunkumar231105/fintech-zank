from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Transaction, TransactionEvent
from .audit_service import log_audit_event


ALLOWED_TRANSITIONS = {
    "pending": {"processing", "failed"},
    "processing": {"completed", "failed", "reversed"},
    "completed": {"reversed"},
    "failed": set(),
    "reversed": set(),
}


def transition_transaction(db: Session, transaction_id, new_status: str, actor_id=None, metadata=None):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found.")

    current_status = (transaction.status or "pending").lower()
    target_status = (new_status or "").lower()
    if target_status not in ALLOWED_TRANSITIONS.get(current_status, set()):
        raise ValueError("Invalid status transition")

    transaction.status = target_status
    event = TransactionEvent(
        transaction_id=transaction.id,
        from_status=current_status,
        to_status=target_status,
        actor_id=actor_id,
        metadata_json=metadata or {},
    )
    db.add(event)
    db.flush()

    log_audit_event(
        db,
        actor_id=actor_id,
        action="transaction_status_transition",
        resource_type="transaction",
        resource_id=transaction.id,
        metadata={"from_status": current_status, "to_status": target_status, **(metadata or {})},
        ip_address=None,
    )
    return transaction

