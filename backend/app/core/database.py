from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

from .config import get_settings

settings = get_settings()
DATABASE_URL = settings.database_url

# Fix for async postgres URLs from some providers 
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine_kwargs = {"connect_args": connect_args}
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_size": 10,
        "max_overflow": 20,
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Called on startup."""
    from ..models import User, Wallet, Card, Transaction, PendingRegistration, OTPCode, RefreshToken, PasswordResetToken, Account, LedgerEntry, IdempotencyKey, AuditLog, WalletHold, TransactionEvent, ReconciliationReport, ReconciliationAlert, KycRecord, TransactionLimit, VelocityCheck, AmlFlag, FraudScore  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _sync_legacy_schema()


def _sync_legacy_schema():
    if DATABASE_URL.startswith("sqlite"):
        return

    statements = [
        "ALTER TABLE wallets ADD COLUMN IF NOT EXISTS ledger_account_id VARCHAR",
        "ALTER TABLE wallets ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active'",
        "ALTER TABLE wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP",
        "UPDATE wallets SET status = 'active' WHERE status IS NULL",
        "UPDATE wallets SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL",
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference_id VARCHAR",
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR",
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ",
        "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB",
        "UPDATE transactions SET reference_id = txn_id WHERE reference_id IS NULL AND txn_id IS NOT NULL",
        "UPDATE transactions SET transaction_type = type WHERE transaction_type IS NULL AND type IS NOT NULL",
        "UPDATE transactions SET posted_at = date WHERE posted_at IS NULL AND date IS NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_wallets_ledger_account_id ON wallets (ledger_account_id)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_reference_id ON transactions (reference_id)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_status ON transactions (status)",
        "CREATE INDEX IF NOT EXISTS ix_transactions_created_at ON transactions (date)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
