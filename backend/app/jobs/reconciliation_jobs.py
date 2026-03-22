from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler

from ..core.database import SessionLocal
from ..services.idempotency_service import cleanup_expired_keys
from ..services.reconciliation_service import (
    run_ach_reconciliation,
    run_bank_settlement_reconciliation,
    run_card_processor_reconciliation,
)
from ..services.risk_service import ensure_default_transaction_limits
from ..services.wallet_service import expire_old_holds


scheduler = BackgroundScheduler(timezone="UTC")


def _run_job(job_fn):
    db = SessionLocal()
    try:
        ensure_default_transaction_limits(db)
        job_fn(db)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()


def bank_settlement_job():
    _run_job(run_bank_settlement_reconciliation)


def ach_reconciliation_job():
    _run_job(run_ach_reconciliation)


def card_processor_job():
    _run_job(run_card_processor_reconciliation)


def expire_holds_job():
    db = SessionLocal()
    try:
        expire_old_holds(db)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()


def cleanup_idempotency_job():
    db = SessionLocal()
    try:
        cleanup_expired_keys(db)
    finally:
        db.close()


def start_scheduler():
    if scheduler.running:
        return scheduler
    scheduler.add_job(bank_settlement_job, "cron", hour=0, minute=0, id="bank_settlement_job", replace_existing=True)
    scheduler.add_job(ach_reconciliation_job, "cron", hour=1, minute=0, id="ach_reconciliation_job", replace_existing=True)
    scheduler.add_job(card_processor_job, "cron", hour=2, minute=0, id="card_processor_job", replace_existing=True)
    scheduler.add_job(expire_holds_job, "interval", minutes=30, id="expire_holds_job", replace_existing=True)
    scheduler.add_job(cleanup_idempotency_job, "interval", hours=1, id="cleanup_idempotency_job", replace_existing=True)
    scheduler.start()
    return scheduler


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
