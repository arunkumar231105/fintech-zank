from decimal import Decimal

from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, Date, ForeignKey, Numeric, Index, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class PendingRegistration(Base):
    __tablename__ = "pending_registrations"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    verification_token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String, unique=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String, default="user")
    country = Column(String, nullable=True)
    timezone = Column(String, nullable=True)
    kyc_status = Column(String, default="pending")
    loyalty_tier = Column(String, default="Bronze")
    avatar_url = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    wallet = relationship("Wallet", back_populates="owner", uselist=False)
    cards = relationship("Card", back_populates="owner")
    transactions = relationship("Transaction", back_populates="owner")
    accounts = relationship("Account", back_populates="owner")
    audit_logs = relationship("AuditLog", back_populates="actor")
    kyc_record = relationship("KycRecord", back_populates="user", uselist=False)

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class OTPCode(Base):
    __tablename__ = "otp_codes"
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code = Column(String, index=True)
    expires_at = Column(DateTime)
    used = Column(Boolean, default=False)

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(String, unique=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, index=True)
    ledger_account_id = Column(String, ForeignKey("accounts.id"), unique=True, nullable=True, index=True)
    total_balance = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    held_balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    status = Column(String, default="active", nullable=False)
    account_number = Column(String, unique=True)
    routing_number = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="wallet")
    ledger_account = relationship("Account", back_populates="wallet", uselist=False)
    holds = relationship("WalletHold", back_populates="wallet")

class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    last4 = Column(String)
    expiry = Column(String)
    status = Column(String, default="active")
    daily_limit = Column(Float, default=1000.0)
    color = Column(String, default="aqua")
    type = Column(String, default="virtual")
    owner = relationship("User", back_populates="cards")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"))
    txn_id = Column(String, unique=True, index=True)
    reference_id = Column(String, unique=True, index=True, nullable=True)
    transaction_type = Column(String, index=True, nullable=True)
    merchant = Column(String)
    type = Column(String)
    amount = Column(Float)
    currency = Column(String, default="USD")
    category = Column(String)
    status = Column(String, default="completed")
    note = Column(String, nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    posted_at = Column(DateTime(timezone=True), nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)
    owner = relationship("User", back_populates="transactions")
    ledger_entries = relationship("LedgerEntry", back_populates="transaction")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    account_type = Column(String, nullable=False, index=True)
    currency = Column(String, default="USD", nullable=False)
    status = Column(String, default="active", nullable=False)
    balance_cached = Column(Numeric(20, 8), default=Decimal("0"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="accounts")
    ledger_entries = relationship("LedgerEntry", back_populates="account")
    wallet = relationship("Wallet", back_populates="ledger_account", uselist=False)

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, index=True)
    account_id = Column(String, ForeignKey("accounts.id"), nullable=False, index=True)
    entry_type = Column(String, nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)
    currency = Column(String, nullable=False)
    balance_after = Column(Numeric(20, 8), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transaction = relationship("Transaction", back_populates="ledger_entries")
    account = relationship("Account", back_populates="ledger_entries")

    __table_args__ = (
        Index("ix_ledger_entries_created_at", "created_at"),
    )


def _immutable_ledger_entry(*_args, **_kwargs):
    raise ValueError("Ledger entries are immutable and cannot be updated or deleted.")


event.listen(LedgerEntry, "before_update", _immutable_ledger_entry)
event.listen(LedgerEntry, "before_delete", _immutable_ledger_entry)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    key = Column(String, primary_key=True, nullable=False)
    request_hash = Column(String, nullable=False)
    response = Column(JSONB, nullable=True)
    status = Column(String, default="processing", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String, nullable=False)
    resource_type = Column(String, nullable=False, index=True)
    resource_id = Column(String, nullable=False)
    metadata_json = Column("metadata", JSONB, nullable=True)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    actor = relationship("User", back_populates="audit_logs")


class WalletHold(Base):
    __tablename__ = "wallet_holds"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False, index=True)
    amount = Column(Numeric(20, 8), nullable=False)
    reason = Column(String, nullable=True)
    status = Column(String, default="held", nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wallet = relationship("Wallet", back_populates="holds")


class TransactionEvent(Base):
    __tablename__ = "transaction_events"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False, index=True)
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    transaction = relationship("Transaction")
    actor = relationship("User")


class ReconciliationReport(Base):
    __tablename__ = "reconciliation_reports"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    job_type = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, index=True)
    ledger_balance = Column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    external_balance = Column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    difference = Column(Numeric(20, 8), nullable=False, default=Decimal("0"))
    metadata_json = Column("metadata", JSONB, nullable=True)
    alert_raised = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    alerts = relationship("ReconciliationAlert", back_populates="report")


class ReconciliationAlert(Base):
    __tablename__ = "reconciliation_alerts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    report_id = Column(String, ForeignKey("reconciliation_reports.id"), nullable=False, index=True)
    alert_type = Column(String, nullable=False)
    severity = Column(String, nullable=False, index=True)
    message = Column(String, nullable=False)
    resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolved_by = Column(String, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    report = relationship("ReconciliationReport", back_populates="alerts")
    resolver = relationship("User")


class KycRecord(Base):
    __tablename__ = "kyc_records"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    status = Column(String, default="pending", nullable=False)
    level = Column(String, default="basic", nullable=False)
    full_name = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    nationality = Column(String, nullable=True)
    document_type = Column(String, nullable=True)
    document_number = Column(String, nullable=True)
    document_expiry = Column(Date, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    rejected_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="kyc_record")


class TransactionLimit(Base):
    __tablename__ = "transaction_limits"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    kyc_level = Column(String, nullable=False, index=True)
    transaction_type = Column(String, nullable=False, index=True)
    daily_limit = Column(Numeric(20, 8), nullable=False)
    monthly_limit = Column(Numeric(20, 8), nullable=False)
    per_transaction_limit = Column(Numeric(20, 8), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class VelocityCheck(Base):
    __tablename__ = "velocity_checks"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    transaction_type = Column(String, nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)
    window_start = Column(DateTime(timezone=True), nullable=False)
    window_end = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_velocity_checks_window_range", "window_start", "window_end"),
    )


class AmlFlag(Base):
    __tablename__ = "aml_flags"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    flag_type = Column(String, nullable=False, index=True)
    severity = Column(String, nullable=False)
    status = Column(String, default="open", nullable=False, index=True)
    metadata_json = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    transaction = relationship("Transaction")


class FraudScore(Base):
    __tablename__ = "fraud_scores"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True)
    score = Column(Integer, nullable=False, index=True)
    risk_level = Column(String, nullable=False, index=True)
    factors = Column(JSONB, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    transaction = relationship("Transaction")
