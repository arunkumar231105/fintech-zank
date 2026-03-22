from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Wallet, WalletHold
from .ledger_service import ensure_user_wallet_account, get_cached_balance, get_realtime_balance


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


def create_wallet(db: Session, user_id: str, currency: str = "USD") -> Wallet:
    existing = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if existing:
        if not existing.ledger_account_id:
            account = ensure_user_wallet_account(db, user_id, currency=currency)
            existing.ledger_account_id = account.id
            existing.currency = existing.currency or currency
            existing.status = existing.status or "active"
            db.flush()
        return existing

    account = ensure_user_wallet_account(db, user_id, currency=currency)
    wallet = Wallet(
        wallet_id=f"ZANK-{user_id.replace('-', '')[:8].upper()}",
        user_id=user_id,
        ledger_account_id=account.id,
        total_balance=0.0,
        available_balance=0.0,
        held_balance=0.0,
        currency=currency,
        status="active",
        account_number=f"472988210012{user_id.replace('-', '')[:4].upper()}",
        routing_number="021000021",
    )
    db.add(wallet)
    db.flush()
    refresh_wallet_balance_cache(db, wallet.id)
    return wallet


def get_wallet_by_user(db: Session, user_id: str) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    if not wallet.ledger_account_id:
        account = ensure_user_wallet_account(db, user_id, currency=wallet.currency or "USD")
        wallet.ledger_account_id = account.id
        db.flush()
    return wallet


def get_wallet_by_identifier(db: Session, wallet_identifier) -> Wallet:
    wallet = None
    if str(wallet_identifier).isdigit():
        wallet = db.query(Wallet).filter(Wallet.id == int(wallet_identifier)).first()
    if not wallet:
        wallet = db.query(Wallet).filter(Wallet.wallet_id == str(wallet_identifier)).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    if not wallet.ledger_account_id:
        account = ensure_user_wallet_account(db, wallet.user_id, currency=wallet.currency or "USD")
        wallet.ledger_account_id = account.id
        db.flush()
    return wallet


def get_held_amount(db: Session, wallet_id: int) -> Decimal:
    held = (
        db.query(func.coalesce(func.sum(WalletHold.amount), 0))
        .filter(WalletHold.wallet_id == wallet_id, WalletHold.status == "held")
        .scalar()
    )
    return _to_decimal(held)


def refresh_wallet_balance_cache(db: Session, wallet_id: int) -> dict:
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    if not wallet.ledger_account_id:
        account = ensure_user_wallet_account(db, wallet.user_id, currency=wallet.currency or "USD")
        wallet.ledger_account_id = account.id
    cached = get_cached_balance(db, wallet.ledger_account_id)
    realtime = get_realtime_balance(db, wallet.ledger_account_id)
    held = get_held_amount(db, wallet.id)
    available = cached - held
    wallet.total_balance = float(cached)
    wallet.available_balance = float(available)
    wallet.held_balance = float(held)
    db.flush()
    return {
        "wallet_id": wallet.id,
        "cached_balance": cached,
        "realtime_balance": realtime,
        "held_amount": held,
        "available_balance": available,
        "currency": wallet.currency or "USD",
        "status": wallet.status or "active",
    }


def get_wallet_balance(db: Session, wallet_id: int) -> dict:
    return refresh_wallet_balance_cache(db, wallet_id)


def place_hold(db: Session, wallet_id: int, amount, reason: str | None = None, expires_in_minutes: int = 30) -> WalletHold:
    wallet = db.query(Wallet).filter(Wallet.id == wallet_id).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found.")
    if (wallet.status or "active") != "active":
        raise HTTPException(status_code=400, detail="Wallet is not active.")

    balance = get_wallet_balance(db, wallet.id)
    hold_amount = _to_decimal(amount)
    if hold_amount <= 0:
        raise HTTPException(status_code=400, detail="Hold amount must be greater than zero.")
    if balance["available_balance"] < hold_amount:
        raise HTTPException(status_code=400, detail="Insufficient available balance.")

    hold = WalletHold(
        wallet_id=wallet.id,
        amount=hold_amount,
        reason=reason,
        status="held",
        expires_at=datetime.utcnow() + timedelta(minutes=max(1, expires_in_minutes)),
    )
    db.add(hold)
    db.flush()
    refresh_wallet_balance_cache(db, wallet.id)
    return hold


def release_hold(db: Session, hold_id: str) -> WalletHold:
    hold = db.query(WalletHold).filter(WalletHold.id == hold_id).first()
    if not hold:
        raise HTTPException(status_code=404, detail="Hold not found.")
    hold.status = "released"
    db.flush()
    refresh_wallet_balance_cache(db, hold.wallet_id)
    return hold


def capture_hold(db: Session, hold_id: str) -> WalletHold:
    hold = db.query(WalletHold).filter(WalletHold.id == hold_id).first()
    if not hold:
        raise HTTPException(status_code=404, detail="Hold not found.")
    hold.status = "captured"
    db.flush()
    refresh_wallet_balance_cache(db, hold.wallet_id)
    return hold


def expire_old_holds(db: Session) -> int:
    now = datetime.utcnow()
    holds = db.query(WalletHold).filter(WalletHold.status == "held", WalletHold.expires_at < now).all()
    affected_wallets = set()
    for hold in holds:
        hold.status = "expired"
        affected_wallets.add(hold.wallet_id)
    db.flush()
    for wallet_id in affected_wallets:
        refresh_wallet_balance_cache(db, wallet_id)
    return len(holds)

