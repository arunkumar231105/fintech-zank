from __future__ import annotations

from ..core.database import SessionLocal
from ..models import Account, LedgerEntry, Wallet
from .audit_service import log_audit_event
from .wallet_service import refresh_wallet_balance_cache


def on_ledger_transaction_posted(db, transaction_id):
    entries = db.query(LedgerEntry).filter(LedgerEntry.transaction_id == transaction_id).all()
    affected_wallets = set()
    for entry in entries:
        account = db.query(Account).filter(Account.id == entry.account_id).first()
        if not account or account.account_type != "user_wallet":
            continue
        wallet = db.query(Wallet).filter(Wallet.ledger_account_id == account.id).first()
        if not wallet:
            continue
        affected_wallets.add(wallet.id)
        refresh_wallet_balance_cache(db, wallet.id)
        log_audit_event(
            db,
            actor_id=wallet.user_id,
            action="wallet_balance_refresh",
            resource_type="wallet",
            resource_id=wallet.id,
            metadata={"transaction_id": transaction_id, "ledger_entry_id": entry.id},
            ip_address=None,
        )
    return list(affected_wallets)


def on_ledger_entry_created(db, entry_id):
    entry = db.query(LedgerEntry).filter(LedgerEntry.id == entry_id).first()
    if not entry:
        return None
    account = db.query(Account).filter(Account.id == entry.account_id).first()
    if not account or account.account_type != "user_wallet":
        return None
    wallet = db.query(Wallet).filter(Wallet.ledger_account_id == account.id).first()
    if not wallet:
        return None
    refresh_wallet_balance_cache(db, wallet.id)
    return wallet.id


def process_ledger_wallet_events(transaction_ids=None, entry_ids=None):
    db = SessionLocal()
    try:
        for transaction_id in transaction_ids or []:
            on_ledger_transaction_posted(db, transaction_id)
        for entry_id in entry_ids or []:
            on_ledger_entry_created(db, entry_id)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()

