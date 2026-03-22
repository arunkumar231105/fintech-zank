from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models import IdempotencyKey


def check_idempotency_key(db: Session, key: str):
    record = db.query(IdempotencyKey).filter(IdempotencyKey.key == key).first()
    if not record:
        return None
    if record.expires_at and record.expires_at < datetime.utcnow():
        return None
    if record.status == "processing":
        raise HTTPException(status_code=409, detail="Request with this Idempotency-Key is already processing.")
    return record.response


def save_idempotency_key(db: Session, key: str, request_hash: str, response, status: str):
    expires_at = datetime.utcnow() + timedelta(hours=24)
    record = db.query(IdempotencyKey).filter(IdempotencyKey.key == key).first()
    if record:
      record.request_hash = request_hash
      record.response = response
      record.status = status
      record.expires_at = expires_at
      return record
    record = IdempotencyKey(
        key=key,
        request_hash=request_hash,
        response=response,
        status=status,
        expires_at=expires_at,
    )
    db.add(record)
    return record


def cleanup_expired_keys(db: Session):
    db.query(IdempotencyKey).filter(IdempotencyKey.expires_at < datetime.utcnow()).delete()
    db.commit()


def cleanup_expired_keys_task():
    db = SessionLocal()
    try:
        cleanup_expired_keys(db)
    finally:
        db.close()
