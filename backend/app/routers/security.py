from fastapi import APIRouter
router = APIRouter()
@router.get("/kyc")
def get_kyc(): return {"status": "in-review", "steps": [], "completedSteps": 3, "totalSteps": 5}
@router.post("/kyc/upload")
def upload_kyc(): return {"success": True}
@router.get("/settings")
def get_settings(): return {"twoFactorEnabled": True, "biometricEnabled": False, "loginNotifications": True, "sessionTimeout": 15}
@router.put("/settings")
def update_settings(): return {"success": True}
@router.get("/sessions")
def get_sessions(): return {"sessions": []}
@router.get("/login-history")
def get_history(): return {"history": []}
