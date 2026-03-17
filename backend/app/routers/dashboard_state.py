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
REWARD_OFFER_ACTIVATIONS = {}
SECURITY_SETTINGS_STORE = {}
KYC_STORE = {}
SESSION_STORE = {}
LOGIN_HISTORY_STORE = {}
NOTIFICATION_STORE = {}
SUPPORT_TICKET_STORE = {}
SUPPORT_CHAT_STORE = {}


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


def get_reward_activations(user_id: str) -> set:
    return REWARD_OFFER_ACTIVATIONS.setdefault(user_id, set())


def get_security_settings(user_id: str) -> dict:
    return SECURITY_SETTINGS_STORE.setdefault(user_id, {
        "two_factor_enabled": False,
        "biometric_enabled": False,
        "last_password_change": iso_now(),
    })


def get_kyc_record(user_id: str) -> dict:
    return KYC_STORE.setdefault(user_id, {
        "status": "not_started",
        "reason": "",
        "document_type": "",
        "uploaded_at": None,
        "steps": [
            {"label": "Email Verified", "completed": True},
            {"label": "Phone Verified", "completed": True},
            {"label": "Identity Document", "completed": False},
            {"label": "Address Proof", "completed": False},
            {"label": "Selfie Verification", "completed": False},
        ],
    })


def get_sessions(user_id: str) -> list:
    return SESSION_STORE.setdefault(user_id, [])


def get_login_history(user_id: str) -> list:
    return LOGIN_HISTORY_STORE.setdefault(user_id, [])


def get_notifications(user_id: str) -> list:
    return NOTIFICATION_STORE.setdefault(user_id, [])


def get_support_tickets(user_id: str) -> list:
    return SUPPORT_TICKET_STORE.setdefault(user_id, [])


def get_ticket_messages(ticket_id: str) -> list:
    return SUPPORT_CHAT_STORE.setdefault(ticket_id, [])
