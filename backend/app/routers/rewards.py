from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import Transaction as TransactionModel, User as UserModel, Wallet as WalletModel
from .dashboard_state import get_notifications, get_reward_activations, iso_now

router = APIRouter()

POINTS_PER_DOLLAR = 1
REDEEM_RATE = 100
OFFER_SEED = [
    {"id": "offer_stream", "merchant": "Stream+", "title": "Streaming weekend cashback", "cashback_percent": 5, "days": 9, "icon": "📺"},
    {"id": "offer_fuel", "merchant": "FuelGo", "title": "Fuel refill boost", "cashback_percent": 3, "days": 5, "icon": "⛽"},
    {"id": "offer_grocery", "merchant": "FreshCart", "title": "Groceries cashback", "cashback_percent": 4, "days": 12, "icon": "🛒"},
]


class RedeemRequest(BaseModel):
    points_to_redeem: int


def _wallet_for_user(current_user: UserModel, db: Session):
    wallet = current_user.wallet
    if wallet:
        return wallet
    wallet = WalletModel(
        wallet_id=f"ZANK-{current_user.id[:8].upper()}",
        user_id=current_user.id,
        total_balance=0.0,
        available_balance=0.0,
        held_balance=0.0,
        account_number=f"472988210012{current_user.id.replace('-', '')[:4].upper()}",
        routing_number="021000021",
    )
    db.add(wallet)
    db.commit()
    db.refresh(wallet)
    return wallet


def _reward_history(current_user: UserModel, db: Session):
    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == current_user.id)
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .limit(20)
        .all()
    )
    history = []
    for txn in transactions:
        amount = abs(float(txn.amount or 0.0))
        if amount <= 0:
            continue
        is_redeem = (txn.category or "").lower() == "rewards" and str(txn.note or "").lower().startswith("redeemed")
        history.append({
            "id": txn.txn_id,
            "date": txn.date.isoformat() if txn.date else iso_now(),
            "description": txn.note or txn.merchant or "Reward points earned",
            "points": -int(round(amount * REDEEM_RATE)) if is_redeem else int(round(amount * POINTS_PER_DOLLAR)),
            "source": "redeem" if is_redeem else "cashback" if (txn.type or "").lower() == "debit" else "bonus",
            "cashback_amount": round(amount * 0.01, 2) if (txn.type or "").lower() == "debit" else 0.0,
        })
    return history


def _reward_summary(current_user: UserModel, db: Session):
    history = _reward_history(current_user, db)
    total_points = max(0, sum(item["points"] for item in history))
    cashback_earned = round(sum(item["cashback_amount"] for item in history), 2)
    transaction_days = {item["date"][:10] for item in history}
    streak_days = min(len(transaction_days), 30)
    if total_points >= 10000:
        tier = "Platinum"
        next_tier_points = 10000
    elif total_points >= 5000:
        tier = "Gold"
        next_tier_points = 10000
    elif total_points >= 1000:
        tier = "Silver"
        next_tier_points = 5000
    else:
        tier = "Bronze"
        next_tier_points = 1000

    return {
        "tier": tier,
        "total_points": total_points,
        "next_tier_points": next_tier_points,
        "cashback_earned": cashback_earned,
        "streak_days": streak_days,
        "conversion_rate": {"points": REDEEM_RATE, "wallet_amount": 1},
        "next_unlock": max(next_tier_points - total_points, 0),
        "history": history,
    }


def _offers_for_user(user_id: str):
    now = datetime.utcnow()
    activated = get_reward_activations(user_id)
    offers = []
    for seed in OFFER_SEED:
        expiry = now + timedelta(days=seed["days"])
        offers.append({
            "id": seed["id"],
            "merchant": seed["merchant"],
            "title": seed["title"],
            "cashback_percent": seed["cashback_percent"],
            "expiry_date": expiry.date().isoformat(),
            "active": seed["id"] in activated,
            "expired": expiry < now,
            "icon": seed["icon"],
        })
    return offers


@router.get("")
def get_rewards(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    summary = _reward_summary(current_user, db)
    return {
        "tier": summary["tier"],
        "total_points": summary["total_points"],
        "next_tier_points": summary["next_tier_points"],
        "cashback_earned": summary["cashback_earned"],
        "streak_days": summary["streak_days"],
        "conversion_rate": summary["conversion_rate"],
        "next_unlock": summary["next_unlock"],
    }


@router.get("/offers")
def get_offers(current_user: UserModel = Depends(get_current_user)):
    return {"offers": _offers_for_user(current_user.id)}


@router.post("/offers/{offer_id}/activate")
def activate_offer(offer_id: str, current_user: UserModel = Depends(get_current_user)):
    offers = _offers_for_user(current_user.id)
    offer = next((entry for entry in offers if entry["id"] == offer_id), None)
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    if offer["expired"]:
        raise HTTPException(status_code=400, detail="Offer has expired")
    activations = get_reward_activations(current_user.id)
    activations.add(offer_id)
    get_notifications(current_user.id).insert(0, {
        "id": f"notif_reward_{offer_id}_{datetime.utcnow().timestamp()}",
        "type": "rewards",
        "title": "Offer activated",
        "message": f"{offer['title']} is active on your account.",
        "timestamp": iso_now(),
        "read": False,
    })
    return {"success": True, "offer_id": offer_id, "message": f"Offer activated! Earn {offer['cashback_percent']}% on your next purchase."}


@router.get("/history")
def get_history(
    type: str = Query("all"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    history = _reward_summary(current_user, db)["history"]
    if type != "all":
        history = [entry for entry in history if entry["source"] == type.lower()]
    total = len(history)
    start = (page - 1) * limit
    items = history[start:start + limit]
    this_month = datetime.utcnow().strftime("%Y-%m")
    last_month = (datetime.utcnow().replace(day=1) - timedelta(days=1)).strftime("%Y-%m")
    this_month_points = sum(item["points"] for item in history if item["date"].startswith(this_month))
    last_month_points = sum(item["points"] for item in history if item["date"].startswith(last_month))
    return {
        "history": items,
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        "trend": {"this_month_points": this_month_points, "last_month_points": last_month_points},
    }


@router.post("/redeem")
def redeem_points(
    payload: RedeemRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.points_to_redeem <= 0 or payload.points_to_redeem % REDEEM_RATE != 0:
        raise HTTPException(status_code=400, detail="You need at least 100 points to redeem")

    summary = _reward_summary(current_user, db)
    if payload.points_to_redeem > summary["total_points"]:
        raise HTTPException(status_code=400, detail="Insufficient points balance")

    wallet = _wallet_for_user(current_user, db)
    amount_credited = round(payload.points_to_redeem / REDEEM_RATE, 2)
    wallet.total_balance += amount_credited
    wallet.available_balance += amount_credited

    txn = TransactionModel(
        user_id=current_user.id,
        txn_id=f"TXN-RED-{datetime.utcnow().strftime('%H%M%S%f')[-8:]}",
        merchant="Rewards Redemption",
        type="credit",
        amount=amount_credited,
        category="Rewards",
        note=f"Redeemed {payload.points_to_redeem} points",
        status="completed",
    )
    db.add(txn)
    db.commit()

    get_notifications(current_user.id).insert(0, {
        "id": f"notif_redeem_{datetime.utcnow().timestamp()}",
        "type": "rewards",
        "title": "Points redeemed",
        "message": f"{payload.points_to_redeem} points added {amount_credited:.2f} to your wallet.",
        "timestamp": iso_now(),
        "read": False,
    })

    return {
        "success": True,
        "amount_credited": amount_credited,
        "wallet": {
            "totalBalance": wallet.total_balance,
            "availableBalance": wallet.available_balance,
            "heldBalance": wallet.held_balance,
        },
    }
