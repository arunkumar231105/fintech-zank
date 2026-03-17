from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
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
    user_id = Column(String, ForeignKey("users.id"))
    total_balance = Column(Float, default=0.0)
    available_balance = Column(Float, default=0.0)
    held_balance = Column(Float, default=0.0)
    currency = Column(String, default="USD")
    account_number = Column(String, unique=True)
    routing_number = Column(String)
    owner = relationship("User", back_populates="wallet")

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
    merchant = Column(String)
    type = Column(String)
    amount = Column(Float)
    currency = Column(String, default="USD")
    category = Column(String)
    status = Column(String, default="completed")
    note = Column(String, nullable=True)
    date = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="transactions")
