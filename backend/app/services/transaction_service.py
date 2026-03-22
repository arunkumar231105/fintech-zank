from __future__ import annotations

import hashlib
import json
import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Transaction, User
from .audit_service import log_audit_event
from .idempotency_service import check_idempotency_key, save_idempotency_key
from .ledger_service import ensure_system_account, post_ledger_transaction
from .risk_service import run_all_compliance_checks
from .transaction_state_machine import transition_transaction
from .wallet_service import create_wallet, get_wallet_by_user, get_wallet_balance


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


def _hash_payload(payload) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


def _create_processing_transaction(db: Session, user_id: str | None, transaction_type: str, amount: Decimal, currency: str, reference_id: str, metadata=None):
    transaction = Transaction(
        user_id=user_id,
        txn_id=reference_id,
        reference_id=reference_id,
        transaction_type=transaction_type,
        type=transaction_type,
        amount=float(amount),
        currency=currency,
        category=transaction_type,
        status="pending",
        note=(metadata or {}).get("description"),
        metadata_json=metadata or {},
    )
    db.add(transaction)
    db.flush()
    return transaction


def _serialize_result(transaction: Transaction, amount: Decimal, currency: str, extra=None):
    payload = {
        "transaction_id": transaction.id,
        "reference_id": transaction.reference_id or transaction.txn_id,
        "status": transaction.status,
        "amount": float(amount),
        "currency": currency,
    }
    if extra:
        payload.update(extra)
    return payload


def process_transfer(db: Session, from_user_id: str, to_user_id: str, amount, currency: str, idempotency_key: str, ip_address: str | None = None):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required.")

    transfer_amount = _to_decimal(amount)
    payload_hash = _hash_payload({"from_user_id": from_user_id, "to_user_id": to_user_id, "amount": str(transfer_amount), "currency": currency})
    existing = check_idempotency_key(db, idempotency_key)
    if existing:
        return existing

    run_all_compliance_checks(db, from_user_id, "transfer", transfer_amount, ip_address)
    sender_wallet = create_wallet(db, from_user_id, currency)
    receiver_wallet = create_wallet(db, to_user_id, currency)
    if sender_wallet.status != "active" or receiver_wallet.status != "active":
        raise HTTPException(status_code=400, detail="Both wallets must be active.")

    sender_balance = get_wallet_balance(db, sender_wallet.id)
    if sender_balance["available_balance"] < transfer_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance.")

    reference_id = f"TXN-TRF-{uuid.uuid4().hex[:10].upper()}"
    transaction = _create_processing_transaction(
        db,
        user_id=from_user_id,
        transaction_type="transfer",
        amount=transfer_amount,
        currency=currency,
        reference_id=reference_id,
        metadata={"from_user_id": from_user_id, "to_user_id": to_user_id},
    )
    save_idempotency_key(db, idempotency_key, payload_hash, {"status": "processing"}, "processing")
    db.flush()

    transition_transaction(db, transaction.id, "processing", actor_id=from_user_id, metadata={"idempotency_key": idempotency_key})
    post_ledger_transaction(
        db=db,
        entries=[
            {"account_id": sender_wallet.ledger_account_id, "entry_type": "debit", "amount": transfer_amount},
            {"account_id": receiver_wallet.ledger_account_id, "entry_type": "credit", "amount": transfer_amount},
        ],
        transaction_type="transfer",
        reference_id=reference_id,
        currency=currency,
        metadata={"from_user_id": from_user_id, "to_user_id": to_user_id},
        existing_transaction=transaction,
        final_status="processing",
    )
    transition_transaction(db, transaction.id, "completed", actor_id=from_user_id, metadata={"from_user_id": from_user_id, "to_user_id": to_user_id})
    result = _serialize_result(transaction, transfer_amount, currency)
    save_idempotency_key(db, idempotency_key, payload_hash, result, "completed")
    db.flush()
    log_audit_event(db, from_user_id, "transaction_transfer", "transaction", transaction.id, {"to_user_id": to_user_id, "amount": str(transfer_amount)}, ip_address)
    return result


def process_deposit(db: Session, user_id: str, amount, currency: str, reference_id: str):
    deposit_amount = _to_decimal(amount)
    wallet = create_wallet(db, user_id, currency)
    if wallet.status != "active":
        raise HTTPException(status_code=400, detail="Wallet is not active.")
    transaction = _create_processing_transaction(
        db,
        user_id=user_id,
        transaction_type="deposit",
        amount=deposit_amount,
        currency=currency,
        reference_id=reference_id,
        metadata={"user_id": user_id},
    )
    transition_transaction(db, transaction.id, "processing", actor_id=user_id, metadata={"user_id": user_id})
    clearing_account = ensure_system_account(db, "ach_clearing", currency)
    post_ledger_transaction(
        db=db,
        entries=[
            {"account_id": clearing_account.id, "entry_type": "debit", "amount": deposit_amount},
            {"account_id": wallet.ledger_account_id, "entry_type": "credit", "amount": deposit_amount},
        ],
        transaction_type="deposit",
        reference_id=reference_id,
        currency=currency,
        metadata={"user_id": user_id},
        existing_transaction=transaction,
        final_status="processing",
    )
    transition_transaction(db, transaction.id, "completed", actor_id=user_id, metadata={"user_id": user_id})
    log_audit_event(db, user_id, "transaction_deposit", "transaction", transaction.id, {"amount": str(deposit_amount)}, None)
    return _serialize_result(transaction, deposit_amount, currency)


def process_withdrawal(db: Session, user_id: str, amount, currency: str, reference_id: str, ip_address: str | None = None):
    withdrawal_amount = _to_decimal(amount)
    run_all_compliance_checks(db, user_id, "withdrawal", withdrawal_amount, ip_address)
    wallet = create_wallet(db, user_id, currency)
    if wallet.status != "active":
        raise HTTPException(status_code=400, detail="Wallet is not active.")
    wallet_balance = get_wallet_balance(db, wallet.id)
    if wallet_balance["available_balance"] < withdrawal_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance.")
    transaction = _create_processing_transaction(
        db,
        user_id=user_id,
        transaction_type="withdrawal",
        amount=withdrawal_amount,
        currency=currency,
        reference_id=reference_id,
        metadata={"user_id": user_id},
    )
    transition_transaction(db, transaction.id, "processing", actor_id=user_id, metadata={"user_id": user_id})
    clearing_account = ensure_system_account(db, "ach_clearing", currency)
    post_ledger_transaction(
        db=db,
        entries=[
            {"account_id": wallet.ledger_account_id, "entry_type": "debit", "amount": withdrawal_amount},
            {"account_id": clearing_account.id, "entry_type": "credit", "amount": withdrawal_amount},
        ],
        transaction_type="withdrawal",
        reference_id=reference_id,
        currency=currency,
        metadata={"user_id": user_id},
        existing_transaction=transaction,
        final_status="processing",
    )
    transition_transaction(db, transaction.id, "completed", actor_id=user_id, metadata={"user_id": user_id})
    log_audit_event(db, user_id, "transaction_withdrawal", "transaction", transaction.id, {"amount": str(withdrawal_amount)}, ip_address)
    return _serialize_result(transaction, withdrawal_amount, currency)


def process_payment(db: Session, user_id: str, amount, currency: str, merchant_id: str, reference_id: str, idempotency_key: str, ip_address: str | None = None):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required.")

    payment_amount = _to_decimal(amount)
    fee = (payment_amount * Decimal("0.015")).quantize(Decimal("0.00000001"))
    net_amount = payment_amount - fee
    payload_hash = _hash_payload({"user_id": user_id, "merchant_id": merchant_id, "amount": str(payment_amount), "currency": currency})
    existing = check_idempotency_key(db, idempotency_key)
    if existing:
        return existing

    run_all_compliance_checks(db, user_id, "payment", payment_amount, ip_address)
    wallet = create_wallet(db, user_id, currency)
    merchant_wallet = create_wallet(db, merchant_id, currency)
    wallet_balance = get_wallet_balance(db, wallet.id)
    if wallet.status != "active" or merchant_wallet.status != "active":
        raise HTTPException(status_code=400, detail="Both wallets must be active.")
    if wallet_balance["available_balance"] < payment_amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance.")

    transaction = _create_processing_transaction(
        db,
        user_id=user_id,
        transaction_type="payment",
        amount=payment_amount,
        currency=currency,
        reference_id=reference_id,
        metadata={"user_id": user_id, "merchant_id": merchant_id, "fee": str(fee), "net_amount": str(net_amount)},
    )
    save_idempotency_key(db, idempotency_key, payload_hash, {"status": "processing"}, "processing")
    db.flush()

    transition_transaction(db, transaction.id, "processing", actor_id=user_id, metadata={"merchant_id": merchant_id})
    fee_account = ensure_system_account(db, "fee_revenue", currency)
    post_ledger_transaction(
        db=db,
        entries=[
            {"account_id": wallet.ledger_account_id, "entry_type": "debit", "amount": payment_amount},
            {"account_id": merchant_wallet.ledger_account_id, "entry_type": "credit", "amount": net_amount},
            {"account_id": fee_account.id, "entry_type": "credit", "amount": fee},
        ],
        transaction_type="payment",
        reference_id=reference_id,
        currency=currency,
        metadata={"user_id": user_id, "merchant_id": merchant_id, "fee": str(fee), "net_amount": str(net_amount)},
        existing_transaction=transaction,
        final_status="processing",
    )
    transition_transaction(db, transaction.id, "completed", actor_id=user_id, metadata={"merchant_id": merchant_id, "fee": str(fee)})
    result = _serialize_result(transaction, payment_amount, currency, {"fee": float(fee), "net_amount": float(net_amount)})
    save_idempotency_key(db, idempotency_key, payload_hash, result, "completed")
    db.flush()
    log_audit_event(db, user_id, "transaction_payment", "transaction", transaction.id, {"merchant_id": merchant_id, "fee": str(fee), "net_amount": str(net_amount)}, ip_address)
    return result
