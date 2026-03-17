from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import Transaction as TransactionModel, User as UserModel
from .dashboard_state import get_budget_categories, get_user_goals

router = APIRouter()


def _period_bounds(period: str):
    now = datetime.utcnow()
    if period == "week":
        start = datetime(now.year, now.month, now.day) - timedelta(days=6)
    elif period == "year":
        start = datetime(now.year, 1, 1)
    elif period == "month":
        start = datetime(now.year, now.month, 1)
    else:
        raise HTTPException(status_code=400, detail="Period must be week, month, or year")
    return start, now


def _label_for_date(date_value: datetime, period: str) -> str:
    if period == "year":
        return date_value.strftime("%b")
    if period == "month":
        return date_value.strftime("%b %d")
    return date_value.strftime("%a")


def _load_transactions(user_id: str, start: datetime, end: datetime, db: Session):
    return (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == user_id, TransactionModel.date >= start, TransactionModel.date <= end)
        .order_by(TransactionModel.date.asc(), TransactionModel.id.asc())
        .all()
    )


def _spending_payload(user_id: str, period: str, db: Session):
    start, end = _period_bounds(period)
    transactions = _load_transactions(user_id, start, end, db)

    chart_map = {}
    category_map = {}
    income = 0.0
    expenses = 0.0

    for txn in transactions:
        timestamp = txn.date or datetime.utcnow()
        key = timestamp.strftime("%Y-%m" if period == "year" else "%Y-%m-%d")
        label = _label_for_date(timestamp, period)
        chart_map.setdefault(key, {"label": label, "income": 0.0, "expenses": 0.0})

        amount = abs(float(txn.amount or 0.0))
        if (txn.type or "").lower() == "credit":
            income += amount
            chart_map[key]["income"] += amount
        else:
            expenses += amount
            chart_map[key]["expenses"] += amount
            category = (txn.category or "other").strip()
            category_map[category] = category_map.get(category, 0.0) + amount

    categories = []
    total_spending = sum(category_map.values())
    palette = ["#2affc4", "#38bdf8", "#f59e0b", "#f87171", "#a78bfa", "#fb7185", "#22c55e"]
    for index, (name, value) in enumerate(sorted(category_map.items(), key=lambda item: item[1], reverse=True)):
        categories.append({
            "name": name,
            "value": round(value, 2),
            "percentage": round((value / total_spending) * 100, 1) if total_spending else 0.0,
            "color": palette[index % len(palette)],
        })

    current_budgets = get_budget_categories(user_id, datetime.utcnow().month, datetime.utcnow().year)
    budget_vs_actual = []
    for entry in current_budgets:
        spent = category_map.get(entry["category"], 0.0) or category_map.get(entry["category"].lower(), 0.0)
        budget_vs_actual.append({
            "category": entry["category"],
            "budget": float(entry["limit"]),
            "actual": round(float(spent), 2),
        })

    chart = list(chart_map.values())
    return {
        "period": period,
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "net": round(income - expenses, 2),
        "chart": chart,
        "categories": categories,
        "top_categories": categories[:5],
        "budget_vs_actual": budget_vs_actual,
    }


def _health_score(user: UserModel, db: Session):
    spending = _spending_payload(user.id, "month", db)
    income = spending["income"]
    expenses = spending["expenses"]
    wallet_balance = float(user.wallet.available_balance if user.wallet else 0.0)
    savings_total = sum(float(goal.get("current_amount", 0.0)) for goal in get_user_goals(user.id))

    savings_rate = ((income - expenses) / income) if income > 0 else (1.0 if wallet_balance > 0 else 0.0)
    savings_component = max(0.0, min(30.0, savings_rate * 30.0))

    budgets = get_budget_categories(user.id, datetime.utcnow().month, datetime.utcnow().year)
    budget_total = sum(float(item.get("limit", 0.0)) for item in budgets)
    budget_adherence_ratio = 1.0
    if budget_total > 0:
        budget_adherence_ratio = max(0.0, min(1.0, (budget_total - max(spending["expenses"] - budget_total, 0.0)) / budget_total))
    budget_component = budget_adherence_ratio * 25.0

    tx_count = len(_load_transactions(user.id, datetime.utcnow() - timedelta(days=30), datetime.utcnow(), db))
    activity_component = min(20.0, tx_count * 2.0)

    balance_reference = max(income * 0.25, 500.0)
    balance_component = min(25.0, (wallet_balance + savings_total * 0.2) / balance_reference * 25.0)

    score = round(max(0.0, min(100.0, savings_component + budget_component + activity_component + balance_component)))
    if score <= 40:
        color = "red"
        label = "Needs Attention"
    elif score <= 70:
        color = "yellow"
        label = "Stable"
    else:
        color = "green"
        label = "Strong"

    breakdown = {
        "savings_rate": round(savings_component, 1),
        "budget_adherence": round(budget_component, 1),
        "transaction_activity": round(activity_component, 1),
        "wallet_balance": round(balance_component, 1),
    }

    tips = []
    if savings_component < 20:
        tips.append("Increase savings by 5% to improve your score.")
    if budget_component < 18:
        tips.append("Reduce over-budget categories to strengthen budget adherence.")
    if wallet_balance < 250:
        tips.append("Maintain a higher wallet cushion for emergencies.")
    if not tips:
        tips.append("Your financial habits look healthy. Keep your budget consistent.")

    return {"score": score, "color": color, "label": label, "breakdown": breakdown, "tips": tips}


@router.get("/spending")
def get_spending(
    period: str = Query("month"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _spending_payload(current_user.id, period, db)


@router.get("/health-score")
def get_health_score(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    return _health_score(current_user, db)


@router.get("/overview")
def get_analytics_overview(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    spending = _spending_payload(current_user.id, "month", db)
    health = _health_score(current_user, db)
    last_7_days = _spending_payload(current_user.id, "week", db)
    active_goals = get_user_goals(current_user.id)
    top_category = spending["top_categories"][0] if spending["top_categories"] else None

    budgets = get_budget_categories(current_user.id, datetime.utcnow().month, datetime.utcnow().year)
    budget_total = sum(float(item.get("limit", 0.0)) for item in budgets)
    adherence = round(max(0.0, min(100.0, (budget_total - max(spending["expenses"] - budget_total, 0.0)) / budget_total * 100)), 1) if budget_total > 0 else 100.0

    return {
        "total_income": spending["income"],
        "total_expenses": spending["expenses"],
        "active_savings_goals": len(active_goals),
        "budget_adherence": adherence,
        "mini_chart": last_7_days["chart"],
        "top_category": top_category,
        "health_score": health["score"],
    }
