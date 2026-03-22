from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_admin
from ..models import ReconciliationAlert, ReconciliationReport, User
from ..services.reconciliation_service import (
    resolve_alert,
    run_ach_reconciliation,
    run_bank_settlement_reconciliation,
    run_card_processor_reconciliation,
)

router = APIRouter()


class ReconciliationRunRequest(BaseModel):
    job_type: str


def _serialize_report(report: ReconciliationReport):
    return {
        "id": report.id,
        "job_type": report.job_type,
        "status": report.status,
        "ledger_balance": float(report.ledger_balance or 0),
        "external_balance": float(report.external_balance or 0),
        "difference": float(report.difference or 0),
        "metadata": report.metadata_json or {},
        "alert_raised": report.alert_raised,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "completed_at": report.completed_at.isoformat() if report.completed_at else None,
    }


def _serialize_alert(alert: ReconciliationAlert):
    return {
        "id": alert.id,
        "report_id": alert.report_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "message": alert.message,
        "resolved": alert.resolved,
        "resolved_by": alert.resolved_by,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


@router.post("/run")
def run_reconciliation_job(payload: ReconciliationRunRequest, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    job_type = (payload.job_type or "").lower()
    if job_type == "bank_settlement":
        report = run_bank_settlement_reconciliation(db)
    elif job_type == "ach_file":
        report = run_ach_reconciliation(db)
    elif job_type == "card_processor":
        report = run_card_processor_reconciliation(db)
    else:
        raise HTTPException(status_code=400, detail="Unsupported reconciliation job type.")
    db.commit()
    return _serialize_report(report)


@router.get("/reports")
def list_reconciliation_reports(
    job_type: str | None = None,
    status: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(ReconciliationReport)
    if job_type:
        query = query.filter(ReconciliationReport.job_type == job_type)
    if status:
        query = query.filter(ReconciliationReport.status == status)
    if from_date:
        query = query.filter(ReconciliationReport.created_at >= datetime.fromisoformat(from_date))
    if to_date:
        query = query.filter(ReconciliationReport.created_at <= datetime.fromisoformat(to_date))
    total = query.count()
    items = query.order_by(ReconciliationReport.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_serialize_report(item) for item in items], "pagination": {"limit": limit, "offset": offset, "total": total}}


@router.get("/reports/{report_id}")
def get_reconciliation_report(report_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    report = db.query(ReconciliationReport).options(joinedload(ReconciliationReport.alerts)).filter(ReconciliationReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Reconciliation report not found.")
    payload = _serialize_report(report)
    payload["alerts"] = [_serialize_alert(alert) for alert in report.alerts]
    return payload


@router.get("/alerts")
def list_reconciliation_alerts(
    resolved: bool | None = None,
    severity: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(ReconciliationAlert)
    if resolved is not None:
        query = query.filter(ReconciliationAlert.resolved == resolved)
    if severity:
        query = query.filter(ReconciliationAlert.severity == severity)
    total = query.count()
    items = query.order_by(ReconciliationAlert.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": [_serialize_alert(item) for item in items], "pagination": {"limit": limit, "offset": offset, "total": total}}


@router.post("/alerts/{alert_id}/resolve")
def resolve_reconciliation_alert(alert_id: str, admin: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    alert = resolve_alert(db, alert_id, admin.id)
    db.commit()
    return _serialize_alert(alert)
