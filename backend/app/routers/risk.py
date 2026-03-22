from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..core.dependencies import get_current_admin, get_current_user
from ..models import AmlFlag, FraudScore, KycRecord, TransactionLimit, User, VelocityCheck
from ..services.audit_service import log_audit_event
from ..services.risk_service import ensure_default_transaction_limits

router = APIRouter()


class KycSubmissionRequest(BaseModel):
    full_name: str
    date_of_birth: str
    nationality: str
    document_type: str
    document_number: str
    document_expiry: str
    level: str = "basic"

    @field_validator("full_name", "nationality", "document_type", "document_number", "level", mode="before")
    @classmethod
    def validate_non_empty_strings(cls, value: str):
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError("This field is required")
        return normalized

    @field_validator("date_of_birth", "document_expiry", mode="before")
    @classmethod
    def validate_date_strings(cls, value: str):
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError("This field is required")
        try:
            date.fromisoformat(normalized)
        except ValueError as exc:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.") from exc
        return normalized


class RejectKycRequest(BaseModel):
    reason: str


class UpdateTransactionLimitRequest(BaseModel):
    kyc_level: str
    transaction_type: str
    daily_limit: float
    monthly_limit: float
    per_transaction_limit: float


def _serialize_kyc(record: KycRecord):
    user = record.user
    user_name = None
    user_email = None
    if user:
        user_name = f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email
        user_email = user.email
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_name": user_name,
        "user_email": user_email,
        "status": record.status,
        "level": record.level,
        "full_name": record.full_name,
        "date_of_birth": record.date_of_birth.isoformat() if record.date_of_birth else None,
        "nationality": record.nationality,
        "document_type": record.document_type,
        "document_number": record.document_number,
        "document_expiry": record.document_expiry.isoformat() if record.document_expiry else None,
        "verified_at": record.verified_at.isoformat() if record.verified_at else None,
        "rejected_reason": record.rejected_reason,
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


@router.post("/kyc")
def submit_kyc(payload: KycSubmissionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(KycRecord).filter(KycRecord.user_id == current_user.id).first()
    if not record:
        record = KycRecord(user_id=current_user.id)
        db.add(record)
    record.status = "submitted"
    record.level = payload.level
    record.full_name = payload.full_name
    record.date_of_birth = date.fromisoformat(payload.date_of_birth)
    record.nationality = payload.nationality
    record.document_type = payload.document_type
    record.document_number = payload.document_number
    record.document_expiry = date.fromisoformat(payload.document_expiry)
    record.rejected_reason = None
    db.flush()
    log_audit_event(db, current_user.id, "kyc_submitted", "kyc_record", record.id, {"level": record.level}, None)
    db.commit()
    return _serialize_kyc(record)


@router.get("/kyc/me")
def get_my_kyc(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    record = db.query(KycRecord).filter(KycRecord.user_id == current_user.id).first()
    if not record:
        return {
            "status": "pending",
            "level": "basic",
            "full_name": "",
            "date_of_birth": None,
            "nationality": "",
            "document_type": "",
            "document_number": "",
            "document_expiry": None,
            "verified_at": None,
            "rejected_reason": None,
            "created_at": None,
            "updated_at": None,
        }
    return _serialize_kyc(record)


@router.get("/kyc-queue")
def get_kyc_queue(
    status: str | None = "submitted",
    level: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(KycRecord)
    if status and status != "all":
        query = query.filter(KycRecord.status == status)
    if level and level != "all":
        query = query.filter(KycRecord.level == level)
    total = query.count()
    items = query.order_by(KycRecord.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_serialize_kyc(item) for item in items], "pagination": {"limit": limit, "offset": offset, "total": total}}


@router.get("/kyc/{user_id}")
def get_user_kyc(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != "admin" and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="You cannot access this KYC record.")
    record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KYC record not found.")
    return _serialize_kyc(record)


@router.post("/kyc/{user_id}/approve")
def approve_kyc(user_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.email == admin.email:
        raise HTTPException(status_code=403, detail="Admin cannot approve their own KYC.")
    record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KYC record not found.")
    record.status = "approved"
    record.verified_at = datetime.utcnow()
    record.rejected_reason = None
    db.flush()
    log_audit_event(db, admin.id, "kyc_approved", "kyc_record", record.id, {"user_id": user_id}, None)
    db.commit()
    return _serialize_kyc(record)


@router.post("/kyc/{user_id}/reject")
def reject_kyc(user_id: str, payload: RejectKycRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    if target_user.email == admin.email:
        raise HTTPException(status_code=403, detail="Admin cannot approve or reject their own KYC.")
    record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="KYC record not found.")
    record.status = "rejected"
    record.rejected_reason = payload.reason
    db.flush()
    log_audit_event(db, admin.id, "kyc_rejected", "kyc_record", record.id, {"user_id": user_id, "reason": payload.reason}, None)
    db.commit()
    return _serialize_kyc(record)


@router.get("/aml-flags")
def get_aml_flags(
    status: str | None = None,
    severity: str | None = None,
    flag_type: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AmlFlag)
    if status and status != "all":
        query = query.filter(AmlFlag.status == status)
    if severity and severity != "all":
        query = query.filter(AmlFlag.severity == severity)
    if flag_type and flag_type != "all":
        query = query.filter(AmlFlag.flag_type == flag_type)
    total = query.count()
    items = query.order_by(AmlFlag.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "user_name": (f"{item.user.first_name or ''} {item.user.last_name or ''}".strip() if item.user else None),
                "user_email": item.user.email if item.user else None,
                "transaction_id": item.transaction_id,
                "flag_type": item.flag_type,
                "severity": item.severity,
                "status": item.status,
                "metadata": item.metadata_json or {},
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
        "pagination": {"limit": limit, "offset": offset, "total": total},
    }


@router.post("/aml-flags/{flag_id}/review")
def review_aml_flag(flag_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    flag = db.query(AmlFlag).filter(AmlFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="AML flag not found.")
    flag.status = "under_review"
    db.flush()
    log_audit_event(db, admin.id, "aml_flag_review", "aml_flag", flag.id, {"user_id": flag.user_id}, None)
    db.commit()
    return {"id": flag.id, "status": flag.status}


@router.post("/aml-flags/{flag_id}/clear")
def clear_aml_flag(flag_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    flag = db.query(AmlFlag).filter(AmlFlag.id == flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="AML flag not found.")
    flag.status = "cleared"
    db.flush()
    log_audit_event(db, admin.id, "aml_flag_cleared", "aml_flag", flag.id, {"user_id": flag.user_id}, None)
    db.commit()
    return {"id": flag.id, "status": flag.status}


@router.get("/fraud-scores")
def get_fraud_scores(
    risk_level: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(FraudScore)
    if risk_level and risk_level != "all":
        query = query.filter(FraudScore.risk_level == risk_level)
    if from_date:
        query = query.filter(FraudScore.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(FraudScore.created_at <= datetime.fromisoformat(to_date))
    total = query.count()
    items = query.order_by(FraudScore.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "id": item.id,
                "user_id": item.user_id,
                "user_name": (f"{item.user.first_name or ''} {item.user.last_name or ''}".strip() if item.user else None),
                "user_email": item.user.email if item.user else None,
                "transaction_id": item.transaction_id,
                "score": item.score,
                "risk_level": item.risk_level,
                "factors": item.factors or {},
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
        "pagination": {"limit": limit, "offset": offset, "total": total},
    }


@router.get("/fraud-scores/{user_id}")
def get_user_fraud_scores(user_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    items = db.query(FraudScore).filter(FraudScore.user_id == user_id).order_by(FraudScore.created_at.desc()).all()
    return {
        "items": [
            {
                "id": item.id,
                "score": item.score,
                "risk_level": item.risk_level,
                "factors": item.factors or {},
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ]
    }


@router.get("/transaction-limits")
def list_transaction_limits(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_default_transaction_limits(db)
    items = db.query(TransactionLimit).order_by(TransactionLimit.kyc_level.asc(), TransactionLimit.transaction_type.asc()).all()
    db.commit()
    return {
        "items": [
            {
                "id": item.id,
                "kyc_level": item.kyc_level,
                "transaction_type": item.transaction_type,
                "daily_limit": float(item.daily_limit or 0),
                "monthly_limit": float(item.monthly_limit or 0),
                "per_transaction_limit": float(item.per_transaction_limit or 0),
            }
            for item in items
        ]
    }


@router.put("/transaction-limits")
def update_transaction_limits(payload: UpdateTransactionLimitRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    ensure_default_transaction_limits(db)
    item = db.query(TransactionLimit).filter(
        TransactionLimit.kyc_level == payload.kyc_level,
        TransactionLimit.transaction_type == payload.transaction_type,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Transaction limit not found.")
    item.daily_limit = payload.daily_limit
    item.monthly_limit = payload.monthly_limit
    item.per_transaction_limit = payload.per_transaction_limit
    db.flush()
    log_audit_event(db, admin.id, "transaction_limits_updated", "transaction_limit", item.id, {"kyc_level": item.kyc_level, "transaction_type": item.transaction_type}, None)
    db.commit()
    return {
        "id": item.id,
        "kyc_level": item.kyc_level,
        "transaction_type": item.transaction_type,
        "daily_limit": float(item.daily_limit or 0),
        "monthly_limit": float(item.monthly_limit or 0),
        "per_transaction_limit": float(item.per_transaction_limit or 0),
    }


@router.get("/velocity-violations")
def get_velocity_violations_today(admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total = db.query(VelocityCheck).filter(VelocityCheck.created_at >= today).count()
    return {"count": total}
