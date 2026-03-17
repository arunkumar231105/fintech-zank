from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import Transaction as TransactionModel, User as UserModel, Wallet as WalletModel
from .dashboard_state import SAVINGS_STORE, get_goal, get_user_goals, iso_now

router = APIRouter()


class SavingsGoalCreate(BaseModel):
    name: str
    target_amount: float
    deadline: str
    icon: str = "🎯"


class SavingsGoalUpdate(BaseModel):
    name: str
    target_amount: float
    deadline: str


class SavingsContribution(BaseModel):
    amount: float


def _parse_deadline(value: str) -> datetime:
    try:
        deadline = datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Deadline must be a valid date") from exc
    if deadline.date() <= datetime.utcnow().date():
        raise HTTPException(status_code=400, detail="Deadline must be in the future")
    return deadline


def _wallet_for_user(current_user: UserModel, db: Session) -> WalletModel:
    wallet = current_user.wallet
    if wallet:
        return wallet
    wallet = WalletModel(
        wallet_id=f"ZANK-{uuid.uuid4().hex[:8].upper()}",
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


def _goal_payload(goal: dict) -> dict:
    target = max(float(goal["target_amount"]), 0.0)
    current = max(float(goal.get("current_amount", 0.0)), 0.0)
    percent = round((current / target) * 100, 1) if target else 0.0
    return {
        "id": goal["id"],
        "name": goal["name"],
        "target_amount": target,
        "current_amount": current,
        "deadline": goal["deadline"],
        "icon": goal.get("icon") or "🎯",
        "progress": min(percent, 999.0),
        "contributions": goal.get("contributions", []),
        "created_at": goal.get("created_at") or iso_now(),
    }


def _summary(goals: list) -> dict:
    total_saved = sum(float(goal.get("current_amount", 0.0)) for goal in goals)
    total_target = sum(float(goal.get("target_amount", 0.0)) for goal in goals)
    return {
        "total_saved": total_saved,
        "total_target": total_target,
        "active_goals": len(goals),
    }


@router.get("")
def get_savings(current_user: UserModel = Depends(get_current_user)):
    goals = get_user_goals(current_user.id)
    return {
        "goals": [_goal_payload(goal) for goal in goals],
        "summary": _summary(goals),
    }


@router.post("")
def create_goal(
    req: SavingsGoalCreate,
    current_user: UserModel = Depends(get_current_user),
):
    if len(req.name.strip()) < 3 or len(req.name.strip()) > 50:
        raise HTTPException(status_code=400, detail="Goal name must be between 3 and 50 characters")
    if req.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be greater than 0")

    deadline = _parse_deadline(req.deadline)
    goal = {
        "id": f"goal_{uuid.uuid4().hex[:10]}",
        "name": req.name.strip(),
        "target_amount": float(req.target_amount),
        "current_amount": 0.0,
        "deadline": deadline.date().isoformat(),
        "icon": req.icon or "🎯",
        "contributions": [],
        "created_at": iso_now(),
    }
    SAVINGS_STORE.setdefault(current_user.id, []).insert(0, goal)
    return {"success": True, "goal": _goal_payload(goal)}


@router.post("/{goal_id}/contribute")
def contribute_to_goal(
    goal_id: str,
    req: SavingsContribution,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = get_goal(current_user.id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    wallet = _wallet_for_user(current_user, db)
    if wallet.available_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    wallet.total_balance -= req.amount
    wallet.available_balance -= req.amount
    goal["current_amount"] = float(goal.get("current_amount", 0.0)) + float(req.amount)
    contribution = {
        "id": f"contrib_{uuid.uuid4().hex[:8]}",
        "amount": float(req.amount),
        "date": iso_now(),
    }
    goal.setdefault("contributions", []).insert(0, contribution)

    txn = TransactionModel(
        user_id=current_user.id,
        txn_id=f"TXN-SAVE-{uuid.uuid4().hex[:6].upper()}",
        merchant=goal["name"],
        type="debit",
        amount=req.amount,
        category="Savings",
        note=f"Savings contribution to {goal['name']}",
        status="completed",
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "message": f"${req.amount:,.2f} added to {goal['name']}",
        "goal": _goal_payload(goal),
        "wallet": {
            "totalBalance": wallet.total_balance,
            "availableBalance": wallet.available_balance,
            "heldBalance": wallet.held_balance,
        },
        "transaction": {
            "id": txn.txn_id,
            "merchant": txn.merchant,
            "type": "debit",
            "amount": -abs(req.amount),
            "category": txn.category,
            "status": txn.status,
            "note": txn.note,
            "date": txn.date.isoformat() if txn.date else iso_now(),
        },
    }


@router.put("/{goal_id}")
def update_goal(
    goal_id: str,
    req: SavingsGoalUpdate,
    current_user: UserModel = Depends(get_current_user),
):
    goal = get_goal(current_user.id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")
    if len(req.name.strip()) < 3 or len(req.name.strip()) > 50:
        raise HTTPException(status_code=400, detail="Goal name must be between 3 and 50 characters")
    if req.target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be greater than 0")

    deadline = _parse_deadline(req.deadline)
    goal["name"] = req.name.strip()
    goal["target_amount"] = float(req.target_amount)
    goal["deadline"] = deadline.date().isoformat()
    return {"success": True, "goal": _goal_payload(goal)}


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goals = get_user_goals(current_user.id)
    goal = get_goal(current_user.id, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Savings goal not found")

    wallet = _wallet_for_user(current_user, db)
    refund_amount = float(goal.get("current_amount", 0.0))
    wallet.total_balance += refund_amount
    wallet.available_balance += refund_amount

    txn = TransactionModel(
        user_id=current_user.id,
        txn_id=f"TXN-SVR-{uuid.uuid4().hex[:6].upper()}",
        merchant=goal["name"],
        type="credit",
        amount=refund_amount,
        category="Savings Refund",
        note=f"Refund from deleted savings goal {goal['name']}",
        status="completed",
    )
    db.add(txn)

    SAVINGS_STORE[current_user.id] = [entry for entry in goals if entry["id"] != goal_id]
    db.commit()

    return {
        "success": True,
        "returned_amount": refund_amount,
        "wallet": {
            "totalBalance": wallet.total_balance,
            "availableBalance": wallet.available_balance,
            "heldBalance": wallet.held_balance,
        },
    }
