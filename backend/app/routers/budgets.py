from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import Transaction as TransactionModel, User as UserModel
from .dashboard_state import get_budget_categories, upsert_budget_categories

router = APIRouter()


class BudgetItem(BaseModel):
    category: str
    limit: float


class BudgetUpdateRequest(BaseModel):
    month: int
    year: int
    categories: list[BudgetItem]


def _validate_period(month: int, year: int):
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
    if year < 2020 or year > 2100:
        raise HTTPException(status_code=400, detail="Year is out of range")


def _spent_by_category(user_id: str, month: int, year: int, db: Session) -> dict:
    start = datetime(year, month, 1)
    end = datetime(year + (1 if month == 12 else 0), 1 if month == 12 else month + 1, 1)
    transactions = (
        db.query(TransactionModel)
        .filter(
            TransactionModel.user_id == user_id,
            TransactionModel.date >= start,
            TransactionModel.date < end,
            TransactionModel.type != "credit",
        )
        .all()
    )

    spent = {}
    for txn in transactions:
        category = (txn.category or "other").strip().lower()
        spent[category] = spent.get(category, 0.0) + abs(float(txn.amount or 0.0))
    return spent


def _serialize_budgets(items: list, spent_lookup: dict) -> tuple[list, dict]:
    serialized = []
    total_budget = 0.0
    total_spent = 0.0

    for entry in items:
        category = entry["category"].strip()
        key = category.lower()
        limit = max(float(entry.get("limit", 0.0)), 0.0)
        spent = float(spent_lookup.get(key, 0.0))
        progress = round((spent / limit) * 100, 1) if limit > 0 else 0.0
        serialized.append({
            "category": category,
            "limit": limit,
            "spent": spent,
            "progress": progress,
            "status": "over" if limit > 0 and spent > limit else "warning" if limit > 0 and spent >= limit * 0.8 else "on_track",
        })
        total_budget += limit
        total_spent += spent

    summary = {
        "total_budget": total_budget,
        "total_spent": total_spent,
        "remaining": total_budget - total_spent,
        "adherence": round(max(0.0, ((total_budget - max(total_spent - total_budget, 0.0)) / total_budget) * 100), 1) if total_budget > 0 else 100.0,
    }
    return serialized, summary


@router.get("")
def get_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020, le=2100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_period(month, year)
    items = get_budget_categories(current_user.id, month, year)
    spent_lookup = _spent_by_category(current_user.id, month, year, db)
    budgets, summary = _serialize_budgets(items, spent_lookup)
    return {"month": month, "year": year, "budgets": budgets, "summary": summary}


@router.put("")
def update_budgets(
    payload: BudgetUpdateRequest,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _validate_period(payload.month, payload.year)
    categories = []
    seen = set()
    for item in payload.categories:
        category = item.category.strip()
        if not category:
            raise HTTPException(status_code=400, detail="Category name is required")
        key = category.lower()
        if key in seen:
            raise HTTPException(status_code=400, detail="Duplicate categories are not allowed")
        if item.limit < 0:
            raise HTTPException(status_code=400, detail="Budget limit must be 0 or greater")
        seen.add(key)
        categories.append({"category": category, "limit": float(item.limit)})

    saved = upsert_budget_categories(current_user.id, payload.month, payload.year, categories)
    spent_lookup = _spent_by_category(current_user.id, payload.month, payload.year, db)
    budgets, summary = _serialize_budgets(saved, spent_lookup)
    return {"success": True, "month": payload.month, "year": payload.year, "budgets": budgets, "summary": summary}
