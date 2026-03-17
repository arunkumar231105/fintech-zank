import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import User as UserModel
from ..schemas import UserResponse
from pydantic import BaseModel

router = APIRouter()

# Dev-friendly in-memory stores for preferences and linked accounts.
# Context is sufficient here because this app only needs lightweight shared user/wallet state.
USER_NOTIFICATION_PREFS = {}
USER_LINKED_ACCOUNTS = {}

class ProfileUpdate(BaseModel):
    first_name: str
    last_name: str
    phone: str
    country: str
    timezone: str


class NotificationPreferencesUpdate(BaseModel):
    transactionAlerts: bool
    securityAlerts: bool
    promotionalEmails: bool
    budgetWarnings: bool
    savingsMilestones: bool
    weeklyDigest: bool


class LinkedAccountCreate(BaseModel):
    provider: str
    bankName: str
    type: str
    accountNumber: str


def _default_notification_preferences():
    return {
        "transactionAlerts": True,
        "securityAlerts": True,
        "promotionalEmails": False,
        "budgetWarnings": True,
        "savingsMilestones": True,
        "weeklyDigest": False,
    }


def _get_linked_accounts(user_id: str):
    if user_id not in USER_LINKED_ACCOUNTS:
        USER_LINKED_ACCOUNTS[user_id] = []
    return USER_LINKED_ACCOUNTS[user_id]

@router.get("/profile", response_model=UserResponse)
def get_user_profile(current_user: UserModel = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "country": current_user.country,
        "timezone": current_user.timezone,
        "kyc_status": current_user.kyc_status,
        "loyalty_tier": current_user.loyalty_tier,
        "avatar_url": current_user.avatar_url,
        "is_active": current_user.is_active,
        "is_verified": current_user.is_verified,
    }

@router.put("/profile")
def update_profile(
    profile_data: ProfileUpdate, 
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.first_name = profile_data.first_name
    current_user.last_name = profile_data.last_name
    current_user.phone = profile_data.phone
    current_user.country = profile_data.country
    current_user.timezone = profile_data.timezone
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "success": True, 
        "message": "Profile updated."
    }

@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Persist a generated avatar URL so the frontend sees stable state after upload.
    avatar_url = f"https://api.dicebear.com/7.x/initials/svg?seed={current_user.first_name}%20{current_user.last_name}%20{uuid.uuid4().hex[:6]}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)
    return {"success": True, "avatarUrl": avatar_url}

@router.get("/notifications/preferences")
def get_preferences(current_user: UserModel = Depends(get_current_user)):
    prefs = USER_NOTIFICATION_PREFS.setdefault(current_user.id, _default_notification_preferences())
    return prefs


@router.put("/notifications/preferences")
def update_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: UserModel = Depends(get_current_user),
):
    USER_NOTIFICATION_PREFS[current_user.id] = payload.model_dump()
    return {"success": True, "preferences": USER_NOTIFICATION_PREFS[current_user.id]}

@router.get("/linked-accounts")
def get_linked_accounts(current_user: UserModel = Depends(get_current_user)):
    return {"accounts": _get_linked_accounts(current_user.id)}


@router.post("/linked-accounts")
def add_linked_account(
    payload: LinkedAccountCreate,
    current_user: UserModel = Depends(get_current_user),
):
    accounts = _get_linked_accounts(current_user.id)
    account = {
        "id": f"acc_{uuid.uuid4().hex[:10]}",
        "provider": payload.provider,
        "bankName": payload.bankName,
        "type": payload.type,
        "last4": payload.accountNumber[-4:],
        "linked": True,
    }
    accounts.append(account)
    return {"success": True, "account": account, "accounts": accounts}


@router.delete("/linked-accounts/{account_id}")
def remove_linked_account(
    account_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    accounts = _get_linked_accounts(current_user.id)
    remaining = [account for account in accounts if account["id"] != account_id]
    if len(remaining) == len(accounts):
        raise HTTPException(status_code=404, detail="Linked account not found")
    USER_LINKED_ACCOUNTS[current_user.id] = remaining
    return {"success": True, "accounts": remaining}
