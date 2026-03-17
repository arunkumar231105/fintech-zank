from datetime import datetime


DEFAULT_BUDGET_CATEGORIES = [
    "groceries",
    "fuel",
    "entertainment",
    "dining",
    "shopping",
    "bills",
    "travel",
]

SAVINGS_STORE = {}
BUDGET_STORE = {}


def month_key(month: int, year: int) -> str:
    return f"{year:04d}-{month:02d}"


def get_user_goals(user_id: str) -> list:
    return SAVINGS_STORE.setdefault(user_id, [])


def get_goal(user_id: str, goal_id: str):
    return next((goal for goal in get_user_goals(user_id) if goal["id"] == goal_id), None)


def get_budget_categories(user_id: str, month: int, year: int) -> list:
    key = month_key(month, year)
    entries = BUDGET_STORE.setdefault(user_id, {})
    if key not in entries:
        entries[key] = [{"category": name, "limit": 0.0} for name in DEFAULT_BUDGET_CATEGORIES]
    return entries[key]


def upsert_budget_categories(user_id: str, month: int, year: int, categories: list) -> list:
    BUDGET_STORE.setdefault(user_id, {})[month_key(month, year)] = categories
    return BUDGET_STORE[user_id][month_key(month, year)]


def iso_now() -> str:
    return datetime.utcnow().isoformat()
