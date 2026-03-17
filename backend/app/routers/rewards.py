from fastapi import APIRouter
router = APIRouter()
@router.get("/")
def get_rewards(): return {"tier": "Gold", "totalPoints": 7820, "nextTierPoints": 10000, "cashbackEarned": 142.30, "streakDays": 14}
@router.get("/offers")
def get_offers(): return {"offers": []}
@router.post("/offers/{offer_id}/activate")
def activate_offer(offer_id: str): return {"success": True}
@router.get("/history")
def get_history(): return {"history": []}
@router.post("/redeem")
def redeem_points(): return {"success": True, "amountCredited": 5.0}
