from __future__ import annotations

import os
from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload

from ..models import Account, LedgerEntry, ReconciliationAlert, ReconciliationReport, Transaction
from .audit_service import log_audit_event
from .ledger_service import ensure_system_account, get_realtime_balance


def _to_decimal(value) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


def _severity_for_difference(difference: Decimal) -> str:
    absolute = abs(_to_decimal(difference))
    if absolute < Decimal("100"):
        return "low"
    if absolute < Decimal("1000"):
        return "medium"
    if absolute < Decimal("10000"):
        return "high"
    return "critical"


def _create_report(db: Session, job_type: str, ledger_balance: Decimal, external_balance: Decimal, metadata=None):
    difference = ledger_balance - external_balance
    status = "passed" if difference == 0 else "mismatch"
    report = ReconciliationReport(
        job_type=job_type,
        status=status,
        ledger_balance=ledger_balance,
        external_balance=external_balance,
        difference=difference,
        metadata_json=metadata or {},
        alert_raised=difference != 0,
        completed_at=datetime.utcnow(),
    )
    db.add(report)
    db.flush()
    alerts = []
    if difference != 0:
        alert = ReconciliationAlert(
            report_id=report.id,
            alert_type=f"{job_type}_mismatch",
            severity=_severity_for_difference(difference),
            message=f"{job_type} reconciliation difference detected: {difference}",
            resolved=False,
        )
        db.add(alert)
        db.flush()
        alerts.append(alert)
    return report, alerts


def run_bank_settlement_reconciliation(db: Session):
    account = ensure_system_account(db, "settlement_pool", "USD")
    entries = (
        db.query(LedgerEntry)
        .options(joinedload(LedgerEntry.transaction))
        .filter(LedgerEntry.account_id == account.id)
        .all()
    )
    ledger_balance = get_realtime_balance(db, account.id)
    external_balance = _to_decimal(os.getenv("MOCK_BANK_BALANCE", "0"))
    report, alerts = _create_report(
        db,
        "bank_settlement",
        ledger_balance,
        external_balance,
        metadata={"entry_count": len(entries), "account_id": account.id},
    )
    log_audit_event(db, None, "reconciliation_run", "reconciliation_report", report.id, {"job_type": "bank_settlement", "difference": str(report.difference)}, None)
    return report


def run_ach_reconciliation(db: Session):
    account = ensure_system_account(db, "ach_clearing", "USD")
    since = datetime.utcnow() - timedelta(hours=24)
    transactions = db.query(Transaction).filter(Transaction.transaction_type.in_(["deposit", "withdrawal"]), Transaction.date >= since).all()
    ledger_balance = get_realtime_balance(db, account.id)
    external_balance = _to_decimal(os.getenv("MOCK_ACH_BALANCE", "0"))
    report, alerts = _create_report(
        db,
        "ach_file",
        ledger_balance,
        external_balance,
        metadata={"transaction_count": len(transactions), "account_id": account.id},
    )
    log_audit_event(db, None, "reconciliation_run", "reconciliation_report", report.id, {"job_type": "ach_file", "difference": str(report.difference)}, None)
    return report


def run_card_processor_reconciliation(db: Session):
    account = ensure_system_account(db, "card_processor", "USD")
    since = datetime.utcnow() - timedelta(hours=24)
    transactions = db.query(Transaction).filter(Transaction.transaction_type == "payment", Transaction.date >= since).all()
    ledger_balance = get_realtime_balance(db, account.id)
    external_balance = _to_decimal(os.getenv("MOCK_CARD_PROCESSOR_BALANCE", "0"))
    report, alerts = _create_report(
        db,
        "card_processor",
        ledger_balance,
        external_balance,
        metadata={"transaction_count": len(transactions), "account_id": account.id},
    )
    log_audit_event(db, None, "reconciliation_run", "reconciliation_report", report.id, {"job_type": "card_processor", "difference": str(report.difference)}, None)
    return report


def resolve_alert(db: Session, alert_id: str, resolved_by_user_id: str):
    alert = db.query(ReconciliationAlert).filter(ReconciliationAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Reconciliation alert not found.")
    alert.resolved = True
    alert.resolved_by = resolved_by_user_id
    alert.resolved_at = datetime.utcnow()
    db.flush()
    log_audit_event(db, resolved_by_user_id, "reconciliation_alert_resolved", "reconciliation_alert", alert.id, {"report_id": alert.report_id}, None)
    return alert
