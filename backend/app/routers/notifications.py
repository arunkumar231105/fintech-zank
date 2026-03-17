from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from ..core.dependencies import get_current_user
from ..models import User as UserModel
from .dashboard_state import get_notifications, iso_now

router = APIRouter()


def _seed_notifications(current_user: UserModel):
    items = get_notifications(current_user.id)
    if not items:
        items.extend([
            {
                "id": f"notif_{datetime.utcnow().timestamp()}_welcome",
                "type": "system",
                "title": "Welcome to Zank",
                "message": f"Hi {current_user.first_name}, your dashboard is ready.",
                "timestamp": iso_now(),
                "read": False,
            }
        ])
    return items


@router.get("")
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    unread_only: bool = False,
    current_user: UserModel = Depends(get_current_user),
):
    items = list(_seed_notifications(current_user))
    items.sort(key=lambda item: item["timestamp"], reverse=True)
    if unread_only:
        items = [item for item in items if not item["read"]]
    total = len(items)
    start = (page - 1) * limit
    return {
        "items": items[start:start + limit],
        "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        "unread_count": len([item for item in _seed_notifications(current_user) if not item["read"]]),
    }


@router.put("/{notification_id}/read")
def mark_read(notification_id: str, current_user: UserModel = Depends(get_current_user)):
    items = _seed_notifications(current_user)
    notification = next((item for item in items if item["id"] == notification_id), None)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification["read"] = True
    return {"success": True}


@router.put("/read-all")
def mark_all(current_user: UserModel = Depends(get_current_user)):
    for item in _seed_notifications(current_user):
        item["read"] = True
    return {"success": True}
