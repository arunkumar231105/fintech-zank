from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import AmlFlag, FraudScore, KycRecord, Transaction, TransactionLimit, User, VelocityCheck
from .audit_service import log_audit_event


KYC_LEVEL_ORDER = {"basic": 1, "standard": 2, "enhanced": 3}
DEFAULT_LIMITS = {
    "basic": {
        "transfer": {"daily": "500", "monthly": "2000", "per_tx": "200"},
        "withdrawal": {"daily": "200", "monthly": "1000", "per_tx": "100"},
    },
    "standard": {
        "transfer": {"daily": "5000", "monthly": "20000", "per_tx": "2000"},
        "withdrawal": {"daily": "2000", "monthly": "10000", "per_tx": "1000"},
    },
    "enhanced": {
        "transfer": {"daily": "50000", "monthly": "200000", "per_tx": "20000"},
        "withdrawal": {"daily": "20000", "monthly": "100000", "per_tx": "10000"},
    },
}


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


def ensure_default_transaction_limits(db: Session):
    for kyc_level, definitions in DEFAULT_LIMITS.items():
        for transaction_type, values in definitions.items():
            existing = db.query(TransactionLimit).filter(
                TransactionLimit.kyc_level == kyc_level,
                TransactionLimit.transaction_type == transaction_type,
            ).first()
            if existing:
                continue
            db.add(TransactionLimit(
                kyc_level=kyc_level,
                transaction_type=transaction_type,
                daily_limit=_to_decimal(values["daily"]),
                monthly_limit=_to_decimal(values["monthly"]),
                per_transaction_limit=_to_decimal(values["per_tx"]),
            ))
    db.flush()


def _get_user_kyc_level(db: Session, user_id: str) -> str:
    record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    return (record.level if record and record.status == "approved" else "basic") or "basic"


def check_kyc_status(db: Session, user_id: str, required_level: str):
    record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    if not record:
        raise HTTPException(status_code=403, detail="KYC verification required")
    if record.status != "approved":
        raise HTTPException(status_code=403, detail="KYC not approved")
    if KYC_LEVEL_ORDER.get(record.level or "basic", 0) < KYC_LEVEL_ORDER.get(required_level or "basic", 0):
        raise HTTPException(status_code=403, detail="Higher KYC level required")
    return True


def check_transaction_limits(db: Session, user_id: str, transaction_type: str, amount):
    txn_amount = _to_decimal(amount)
    ensure_default_transaction_limits(db)
    kyc_level = _get_user_kyc_level(db, user_id)
    limits = db.query(TransactionLimit).filter(
        TransactionLimit.kyc_level == kyc_level,
        TransactionLimit.transaction_type == transaction_type,
    ).first()
    if not limits:
        return True
    if txn_amount > _to_decimal(limits.per_transaction_limit):
        raise HTTPException(status_code=400, detail="Per transaction limit exceeded")

    now = datetime.utcnow()
    day_start = datetime(now.year, now.month, now.day)
    month_start = datetime(now.year, now.month, 1)
    daily_total = _to_decimal(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.transaction_type == transaction_type, Transaction.date >= day_start)
        .scalar()
    )
    monthly_total = _to_decimal(
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.transaction_type == transaction_type, Transaction.date >= month_start)
        .scalar()
    )
    if daily_total + txn_amount > _to_decimal(limits.daily_limit):
        raise HTTPException(status_code=400, detail="Daily transaction limit exceeded")
    if monthly_total + txn_amount > _to_decimal(limits.monthly_limit):
        raise HTTPException(status_code=400, detail="Monthly transaction limit exceeded")
    return True


def check_velocity(db: Session, user_id: str, transaction_type: str, amount):
    now = datetime.utcnow()
    hour_start = now - timedelta(hours=1)
    day_start = now - timedelta(hours=24)
    hourly_count = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.date >= hour_start).count()
    if hourly_count > 10:
        raise HTTPException(status_code=429, detail="Velocity limit exceeded")
    daily_count = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.date >= day_start).count()
    if daily_count > 50:
        raise HTTPException(status_code=429, detail="Daily velocity limit exceeded")
    db.add(VelocityCheck(
        user_id=user_id,
        transaction_type=transaction_type,
        amount=_to_decimal(amount),
        window_start=hour_start,
        window_end=now,
    ))
    db.flush()
    return True


def check_aml_triggers(db: Session, user_id: str, amount, transaction_type: str):
    txn_amount = _to_decimal(amount)
    now = datetime.utcnow()
    last_24 = now - timedelta(hours=24)
    flags = []

    near_threshold_transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.date >= last_24,
        Transaction.amount >= float(Decimal("8000")),
        Transaction.amount < float(Decimal("10000")),
    ).all()
    total_near_threshold = sum(_to_decimal(tx.amount) for tx in near_threshold_transactions)
    if len(near_threshold_transactions) > 3 and total_near_threshold >= Decimal("8000"):
        flags.append(("structuring", "high", {"count": len(near_threshold_transactions), "total": str(total_near_threshold)}))

    if transaction_type == "withdrawal":
        recent_deposit = db.query(Transaction).filter(
            Transaction.user_id == user_id,
            Transaction.transaction_type == "deposit",
            Transaction.date >= now - timedelta(minutes=10),
            Transaction.amount == float(txn_amount),
        ).first()
        if recent_deposit:
            flags.append(("rapid_movement", "critical", {"recent_deposit_id": recent_deposit.id}))

    if txn_amount >= Decimal("10000"):
        flags.append(("large_cash", "high", {"amount": str(txn_amount)}))

    user_average = _to_decimal(
        db.query(func.coalesce(func.avg(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id)
        .scalar()
    )
    if user_average > 0 and txn_amount > (user_average * Decimal("5")):
        flags.append(("unusual_pattern", "medium", {"average_amount": str(user_average), "amount": str(txn_amount)}))

    created_flags = []
    for flag_type, severity, metadata in flags:
        flag = AmlFlag(
            user_id=user_id,
            transaction_id=None,
            flag_type=flag_type,
            severity=severity,
            status="open",
            metadata_json=metadata,
        )
        db.add(flag)
        db.flush()
        created_flags.append(flag)
        log_audit_event(db, user_id, "aml_flag_created", "aml_flag", flag.id, {"flag_type": flag_type, "severity": severity, **metadata}, None)
        if severity == "critical":
            raise HTTPException(status_code=403, detail=f"AML check blocked transaction: {flag_type}")
    return {"passed": True, "flags": created_flags}


def calculate_fraud_score(db: Session, user_id: str, transaction_type: str, amount, ip_address: str | None):
    txn_amount = _to_decimal(amount)
    user = db.query(User).filter(User.id == user_id).first()
    score = 0
    factors = {}
    now = datetime.utcnow()

    if user and user.created_at:
        created_at = user.created_at.replace(tzinfo=None) if getattr(user.created_at, "tzinfo", None) else user.created_at
        if created_at >= now - timedelta(days=7):
            score += 20
            factors["new_account"] = 20

    average_amount = _to_decimal(
        db.query(func.coalesce(func.avg(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id)
        .scalar()
    )
    if average_amount > 0 and txn_amount > average_amount * Decimal("3"):
        score += 15
        factors["unusual_amount"] = 15

    hour_count = db.query(Transaction).filter(Transaction.user_id == user_id, Transaction.date >= now - timedelta(hours=1)).count()
    if hour_count > 5:
        score += 20
        factors["high_velocity"] = 20

    open_flags = db.query(AmlFlag).filter(AmlFlag.user_id == user_id, AmlFlag.status.in_(["open", "under_review"])).count()
    if open_flags:
        score += 25
        factors["aml_flagged"] = 25

    kyc_record = db.query(KycRecord).filter(KycRecord.user_id == user_id).first()
    if not kyc_record or kyc_record.status != "approved":
        score += 30
        factors["kyc_not_verified"] = 30

    failed_logins = AuditLogProxy.count_failed_logins(db, user_id, now - timedelta(hours=24))
    if failed_logins > 3:
        score += 10
        factors["multiple_failed_logins"] = 10

    score = max(0, min(100, score))
    if score <= 30:
        risk_level = "low"
    elif score <= 60:
        risk_level = "medium"
    elif score <= 80:
        risk_level = "high"
    else:
        risk_level = "critical"

    fraud_score = FraudScore(
        user_id=user_id,
        transaction_id=None,
        score=score,
        risk_level=risk_level,
        factors=factors,
    )
    db.add(fraud_score)
    db.flush()
    if risk_level == "critical":
        raise HTTPException(status_code=403, detail="Critical fraud risk detected")
    if risk_level == "high":
        log_audit_event(db, user_id, "fraud_score_high", "fraud_score", fraud_score.id, {"score": score, "risk_level": risk_level}, ip_address)
    return {"score": score, "risk_level": risk_level, "factors": factors}


def run_all_compliance_checks(db: Session, user_id: str, transaction_type: str, amount, ip_address: str | None):
    if transaction_type not in {"transfer", "withdrawal", "withdraw"}:
        required_level = "standard" if transaction_type == "payment" else "basic"
        check_kyc_status(db, user_id, required_level)
    check_transaction_limits(db, user_id, transaction_type, amount)
    check_velocity(db, user_id, transaction_type, amount)
    check_aml_triggers(db, user_id, amount, transaction_type)
    calculate_fraud_score(db, user_id, transaction_type, amount, ip_address)
    return True


class AuditLogProxy:
    @staticmethod
    def count_failed_logins(db: Session, user_id: str, since: datetime) -> int:
        from ..models import AuditLog

        return db.query(AuditLog).filter(
            AuditLog.actor_id == user_id,
            AuditLog.action == "user_login_failed",
            AuditLog.timestamp >= since,
        ).count()
