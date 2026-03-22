from __future__ import annotations

from sqlalchemy.orm import Session

from ..core.database import SessionLocal
from ..models import AuditLog


def log_audit_event(db: Session, actor_id, action, resource_type, resource_id, metadata=None, ip_address=None):
    audit_db = SessionLocal()
    try:
        entry = AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id),
            metadata_json=metadata or {},
            ip_address=ip_address,
        )
        audit_db.add(entry)
        audit_db.commit()
    except Exception:
        try:
            audit_db.rollback()
        except Exception:
            pass
    finally:
        try:
            audit_db.close()
        except Exception:
            pass
