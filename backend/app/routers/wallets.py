from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..models import User, WalletHold
from ..services.wallet_service import (
    create_wallet,
    get_held_amount,
    get_wallet_balance,
    get_wallet_by_identifier,
    get_wallet_by_user,
    place_hold,
    refresh_wallet_balance_cache,
    release_hold,
)

router = APIRouter()


class PlaceHoldRequest(BaseModel):
    amount: Decimal
    reason: str | None = None
    expires_in_minutes: int = 30


class WalletStatusRequest(BaseModel):
    status: str


def _serialize_hold(hold: WalletHold):
    return {
        "id": hold.id,
        "wallet_id": hold.wallet_id,
        "amount": float(hold.amount or 0),
        "reason": hold.reason,
        "status": hold.status,
        "expires_at": hold.expires_at.isoformat() if hold.expires_at else None,
        "created_at": hold.created_at.isoformat() if hold.created_at else None,
    }


@router.get("/me")
def get_my_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_wallet_for_user(current_user.id, current_user=current_user, db=db)


@router.get("/{user_id}")
def get_wallet_for_user(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You can only access your own wallet.")
    wallet = create_wallet(db, user_id, currency=(current_user.wallet.currency if current_user.id == user_id and current_user.wallet else "USD"))
    balances = get_wallet_balance(db, wallet.id)
    db.commit()
    return {
        "wallet_id": wallet.wallet_id,
        "id": wallet.id,
        "user_id": wallet.user_id,
        "ledger_account_id": wallet.ledger_account_id,
        "currency": wallet.currency,
        "status": wallet.status or "active",
        "created_at": wallet.created_at.isoformat() if wallet.created_at else None,
        "balance_cached": float(balances["cached_balance"]),
        "realtime_balance": float(balances["realtime_balance"]),
        "held_amount": float(balances["held_amount"]),
        "available_balance": float(balances["available_balance"]),
    }


@router.get("/{wallet_id}/balance")
def get_balance_for_wallet(wallet_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = get_wallet_by_identifier(db, wallet_id)
    if current_user.role != "admin" and wallet.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only access your own wallet.")
    balance = get_wallet_balance(db, wallet.id)
    db.commit()
    return {
        "wallet_id": wallet.wallet_id,
        "cached_balance": float(balance["cached_balance"]),
        "realtime_balance": float(balance["realtime_balance"]),
        "held_amount": float(balance["held_amount"]),
        "available_balance": float(balance["available_balance"]),
        "currency": balance["currency"],
        "status": balance["status"],
    }


@router.post("/{wallet_id}/holds")
def create_wallet_hold(wallet_id: str, payload: PlaceHoldRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    wallet = get_wallet_by_identifier(db, wallet_id)
    hold = place_hold(db, wallet.id, payload.amount, payload.reason, payload.expires_in_minutes)
    db.commit()
    db.refresh(hold)
    return _serialize_hold(hold)


@router.delete("/holds/{hold_id}")
def release_wallet_hold(hold_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    hold = release_hold(db, hold_id)
    db.commit()
    db.refresh(hold)
    return _serialize_hold(hold)


@router.put("/{wallet_id}/status")
def update_wallet_status(wallet_id: str, payload: WalletStatusRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    wallet = get_wallet_by_identifier(db, wallet_id)
    next_status = (payload.status or "").lower()
    if next_status not in {"active", "frozen", "closed"}:
        raise HTTPException(status_code=400, detail="Invalid wallet status.")
    wallet.status = next_status
    refresh_wallet_balance_cache(db, wallet.id)
    db.commit()
    return {"wallet_id": wallet.wallet_id, "status": wallet.status}


@router.get("/{wallet_id}/holds")
def list_wallet_holds(wallet_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    wallet = get_wallet_by_identifier(db, wallet_id)
    holds = db.query(WalletHold).filter(WalletHold.wallet_id == wallet.id).order_by(WalletHold.created_at.desc()).all()
    return {
        "wallet_id": wallet.wallet_id,
        "held_amount": float(get_held_amount(db, wallet.id)),
        "items": [_serialize_hold(hold) for hold in holds],
    }
