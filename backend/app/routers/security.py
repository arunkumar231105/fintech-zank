from datetime import datetime, timedelta
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from ..core.dependencies import get_current_user
from ..models import User as UserModel
from .dashboard_state import (
    get_kyc_record,
    get_login_history,
    get_notifications,
    get_security_settings,
    get_sessions,
    iso_now,
    SESSION_STORE,
)

router = APIRouter()


class SecuritySettingsUpdate(BaseModel):
    two_factor_enabled: bool
    biometric_enabled: bool


def _mask_ip(value: str) -> str:
    parts = value.split(".")
    if len(parts) == 4:
      return ".".join(parts[:3] + ["XXX"])
    return value


def _ensure_session_data(current_user: UserModel):
    sessions = get_sessions(current_user.id)
    if not sessions:
        sessions.extend([
            {
                "id": f"sess_{uuid.uuid4().hex[:8]}",
                "device_name": "Current Browser",
                "browser": "Chrome",
                "ip_address": "192.168.10.42",
                "location": "Karachi, PK",
                "last_active": iso_now(),
                "is_current": True,
                "device_fingerprint": current_user.id[:12],
            },
            {
                "id": f"sess_{uuid.uuid4().hex[:8]}",
                "device_name": "Mobile App",
                "browser": "Android",
                "ip_address": "10.0.0.21",
                "location": "Lahore, PK",
                "last_active": (datetime.utcnow() - timedelta(hours=3)).isoformat(),
                "is_current": False,
                "device_fingerprint": current_user.id[-12:],
            },
        ])
    history = get_login_history(current_user.id)
    if not history:
        history.extend([
            {
                "id": f"log_{uuid.uuid4().hex[:8]}",
                "device_name": "Current Browser",
                "browser": "Chrome",
                "ip_address": "192.168.10.42",
                "location": "Karachi, PK",
                "timestamp": iso_now(),
                "status": "success",
            },
            {
                "id": f"log_{uuid.uuid4().hex[:8]}",
                "device_name": "Unknown Device",
                "browser": "Firefox",
                "ip_address": "45.22.11.91",
                "location": "Unknown",
                "timestamp": (datetime.utcnow() - timedelta(days=1)).isoformat(),
                "status": "failed",
            },
        ])


def _serialize_kyc(record: dict):
    steps = record["steps"]
    completed_steps = len([step for step in steps if step["completed"]])
    return {
        "status": record["status"],
        "reason": record.get("reason", ""),
        "steps": steps,
        "completed_steps": completed_steps,
        "total_steps": len(steps),
        "document_type": record.get("document_type", ""),
        "uploaded_at": record.get("uploaded_at"),
    }


@router.get("/kyc")
def get_kyc(current_user: UserModel = Depends(get_current_user)):
    return _serialize_kyc(get_kyc_record(current_user.id))


@router.post("/kyc/upload")
async def upload_kyc(
    document_type: str = Form(...),
    document_file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
):
    allowed_types = {"image/jpeg", "image/png", "application/pdf"}
    if document_file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Upload failed, try again")
    content = await document_file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Upload failed, try again")

    record = get_kyc_record(current_user.id)
    record["status"] = "pending"
    record["reason"] = ""
    record["document_type"] = document_type
    record["uploaded_at"] = iso_now()
    for step in record["steps"]:
        if step["label"] in {"Identity Document", "Address Proof"}:
            step["completed"] = True

    get_notifications(current_user.id).insert(0, {
        "id": f"notif_kyc_{datetime.utcnow().timestamp()}",
        "type": "security",
        "title": "KYC submitted",
        "message": "Your documents are under review.",
        "timestamp": iso_now(),
        "read": False,
    })
    return {"success": True, "kyc": _serialize_kyc(record)}


@router.get("/settings")
def get_settings(current_user: UserModel = Depends(get_current_user)):
    return get_security_settings(current_user.id)


@router.put("/settings")
def update_settings(payload: SecuritySettingsUpdate, current_user: UserModel = Depends(get_current_user)):
    settings = get_security_settings(current_user.id)
    settings["two_factor_enabled"] = payload.two_factor_enabled
    settings["biometric_enabled"] = payload.biometric_enabled
    settings["updated_at"] = iso_now()
    get_notifications(current_user.id).insert(0, {
        "id": f"notif_sec_{datetime.utcnow().timestamp()}",
        "type": "security",
        "title": "Security settings updated",
        "message": "Your account protection settings were changed.",
        "timestamp": iso_now(),
        "read": False,
    })
    return settings


@router.get("/sessions")
def get_sessions_route(current_user: UserModel = Depends(get_current_user)):
    _ensure_session_data(current_user)
    return {
        "sessions": [
            {
                **entry,
                "ip_address": _mask_ip(entry["ip_address"]),
            }
            for entry in get_sessions(current_user.id)
        ]
    }


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, current_user: UserModel = Depends(get_current_user)):
    _ensure_session_data(current_user)
    sessions = get_sessions(current_user.id)
    session = next((entry for entry in sessions if entry["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["is_current"]:
        raise HTTPException(status_code=400, detail="Current session cannot be revoked from this action")
    SESSION_STORE[current_user.id] = [entry for entry in sessions if entry["id"] != session_id]
    return {"success": True}


@router.delete("/sessions")
def revoke_all_sessions(current_user: UserModel = Depends(get_current_user)):
    _ensure_session_data(current_user)
    SESSION_STORE[current_user.id] = [entry for entry in get_sessions(current_user.id) if entry["is_current"]]
    return {"success": True}


@router.get("/login-history")
def get_history(current_user: UserModel = Depends(get_current_user)):
    _ensure_session_data(current_user)
    suspicious = any(entry["status"] != "success" for entry in get_login_history(current_user.id))
    return {
        "history": [
            {**entry, "ip_address": _mask_ip(entry["ip_address"])}
            for entry in get_login_history(current_user.id)
        ],
        "suspicious_activity": suspicious,
    }
