import random
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..core.email_utils import send_email
from ..models import Card as CardModel, OTPCode, Transaction as TransactionModel, User as UserModel

router = APIRouter()

CARD_META = {}


class CardCreate(BaseModel):
    card_name: str
    daily_limit: float
    monthly_limit: float


class CardStatusUpdate(BaseModel):
    status: str


class CardLimitsUpdate(BaseModel):
    daily_limit: float
    monthly_limit: float


class CardControlsUpdate(BaseModel):
    allowed_categories: list[str]
    blocked_merchants: list[str]


def _card_meta(card_id: int):
    if card_id not in CARD_META:
        seed = random.randint(1000, 9999)
        CARD_META[card_id] = {
            "card_number": f"4729 8821 0012 {seed}",
            "cvv": str(random.randint(100, 999)),
            "monthly_limit": 5000.0,
            "allowed_categories": ["groceries", "travel", "online shopping"],
            "blocked_merchants": [],
        }
    return CARD_META[card_id]


def _serialize_card(card: CardModel, owner: UserModel):
    meta = _card_meta(card.id)
    return {
        "id": str(card.id),
        "card_name": card.name,
        "last4": card.last4,
        "masked_number": f"**** {card.last4}",
        "holder": f"{owner.first_name} {owner.last_name}".strip(),
        "expiry": card.expiry,
        "status": card.status,
        "daily_limit": card.daily_limit,
        "monthly_limit": meta["monthly_limit"],
        "allowed_categories": meta["allowed_categories"],
        "blocked_merchants": meta["blocked_merchants"],
        "brand": "Zank Virtual",
        "type": card.type,
        "color": card.color,
    }


def _serialize_card_transaction(txn: TransactionModel):
    return {
        "id": txn.txn_id,
        "description": txn.note or txn.merchant or "Card transaction",
        "merchant": txn.merchant,
        "amount": abs(txn.amount or 0),
        "type": txn.type or "debit",
        "status": txn.status or "completed",
        "timestamp": txn.date.isoformat() if txn.date else datetime.utcnow().isoformat(),
        "category": txn.category or "Card",
    }


def _generate_otp():
    return str(random.randint(100000, 999999))


@router.get("/")
def get_cards(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    cards = db.query(CardModel).filter(CardModel.user_id == current_user.id).order_by(CardModel.id.desc()).all()
    return {"cards": [_serialize_card(card, current_user) for card in cards]}


@router.post("/")
def create_card(req: CardCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    if len(req.card_name.strip()) < 3 or len(req.card_name.strip()) > 20:
        raise HTTPException(status_code=400, detail="Card name must be between 3 and 20 characters")
    if req.daily_limit <= 0 or req.monthly_limit <= 0:
        raise HTTPException(status_code=400, detail="Card limits must be greater than 0")
    if req.daily_limit > req.monthly_limit:
        raise HTTPException(status_code=400, detail="Daily limit cannot exceed monthly limit")

    full_number = f"4729 8821 0012 {random.randint(1000, 9999)}"
    card = CardModel(
        user_id=current_user.id,
        name=req.card_name.strip(),
        last4=full_number[-4:],
        expiry=(datetime.utcnow() + timedelta(days=900)).strftime("%m/%y"),
        status="active",
        daily_limit=req.daily_limit,
        color=random.choice(["aqua", "ember", "violet"]),
        type="virtual",
    )
    db.add(card)
    db.commit()
    db.refresh(card)

    meta = _card_meta(card.id)
    meta["card_number"] = full_number
    meta["monthly_limit"] = req.monthly_limit

    return {"success": True, "card": _serialize_card(card, current_user)}


@router.post("/{card_id}/details/otp")
def send_card_details_otp(
    card_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    db.query(OTPCode).filter(OTPCode.user_id == current_user.id, OTPCode.used == False).update({"used": True})  # noqa: E712
    otp = _generate_otp()
    record = OTPCode(
        user_id=current_user.id,
        code=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        used=False,
    )
    db.add(record)
    db.commit()

    send_email(
        current_user.email,
        "Zank AI - Card Details OTP",
        f"<h3>Card Details Verification</h3><p>Your OTP is <strong>{otp}</strong>. It expires in 10 minutes.</p>",
    )
    return {"success": True, "message": "OTP sent to your email."}


@router.get("/{card_id}/details")
def get_card_details(
    card_id: int,
    otp: str = Query(..., min_length=6, max_length=6),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    otp_record = (
        db.query(OTPCode)
        .filter(OTPCode.user_id == current_user.id, OTPCode.used == False)  # noqa: E712
        .order_by(OTPCode.id.desc())
        .first()
    )
    if not otp_record or otp_record.code != otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP, try again")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired OTP, try again")
    otp_record.used = True
    db.commit()

    meta = _card_meta(card.id)
    recent_transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == current_user.id, TransactionModel.note.ilike(f"%card:{card.id}%"))
        .order_by(TransactionModel.date.desc())
        .limit(10)
        .all()
    )

    return {
        **_serialize_card(card, current_user),
        "card_number": meta["card_number"],
        "cvv": meta["cvv"],
        "recent_transactions": [_serialize_card_transaction(txn) for txn in recent_transactions],
    }


@router.put("/{card_id}/status")
def update_card_status(
    card_id: int,
    payload: CardStatusUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.status not in {"active", "frozen"}:
        raise HTTPException(status_code=400, detail="Status must be active or frozen")
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.status = payload.status
    db.commit()
    return {"success": True, "card": _serialize_card(card, current_user)}


@router.put("/{card_id}/limits")
def update_card_limits(
    card_id: int,
    payload: CardLimitsUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.daily_limit <= 0 or payload.monthly_limit <= 0:
        raise HTTPException(status_code=400, detail="Card limits must be greater than 0")
    if payload.daily_limit > payload.monthly_limit:
        raise HTTPException(status_code=400, detail="Daily limit cannot exceed monthly limit")
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.daily_limit = payload.daily_limit
    meta = _card_meta(card.id)
    meta["monthly_limit"] = payload.monthly_limit
    db.commit()
    return {"success": True, "card": _serialize_card(card, current_user)}


@router.put("/{card_id}/controls")
def update_card_controls(
    card_id: int,
    payload: CardControlsUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    meta = _card_meta(card.id)
    meta["allowed_categories"] = payload.allowed_categories
    meta["blocked_merchants"] = payload.blocked_merchants
    return {"success": True, "card": _serialize_card(card, current_user)}


@router.delete("/{card_id}")
def delete_card(
    card_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    card = db.query(CardModel).filter(CardModel.id == card_id, CardModel.user_id == current_user.id).first()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    db.delete(card)
    db.commit()
    CARD_META.pop(card_id, None)
    return {"success": True}
