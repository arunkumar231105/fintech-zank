from fastapi import APIRouter, Depends
from ..core.dependencies import get_current_user, get_current_admin
router = APIRouter()

@router.get("/users")
def get_users(admin: dict = Depends(get_current_admin)):
    return {
        "total": 2041882,
        "users": [{
            "id": "UID-44021", "name": "Jordan Rivera", "email": "jordan@example.com",
            "balance": 12450.80, "kyc": "in-review", "status": "active", "risk": "low"
        }]
    }

@router.get("/overview")
def get_admin_overview(admin: dict = Depends(get_current_admin)):
    return {
      "totalUsers": 2041882, "totalAUM": 45800000, "dailyVolume": 1240000, "riskFlags": 14,
      "pendingKYC": 45, "frozenAccounts": 3, "revenue30d": 82400, "openTickets": 78
    }

@router.post("/users/{user_id}/balance-adjust")
def adjust_balance(user_id: str, admin: dict = Depends(get_current_admin)):
    return {"success": True, "newBalance": 12950.80}
