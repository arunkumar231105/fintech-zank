from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..core.email_utils import send_email
from ..models import User as UserModel, Wallet as WalletModel, Transaction as TransactionModel, OTPCode
from pydantic import BaseModel
import uuid
import random

router = APIRouter()

class WithdrawRequest(BaseModel):
    amount: float
    destinationAccountId: str
    otp: str


class WithdrawOtpRequest(BaseModel):
    amount: float
    destinationAccountId: str


class RequestMoneyRequest(BaseModel):
    contact: str
    amount: float
    message: str = ""

class SendMoneyRequest(BaseModel):
    recipientEmail: str
    amount: float
    note: str = ""
    otp: str = ""


def _serialize_transaction(txn: TransactionModel):
    tx_type = txn.type or "debit"
    amount = txn.amount if tx_type == "credit" else -abs(txn.amount)
    timestamp = txn.date or datetime.utcnow()
    return {
        "id": txn.txn_id,
        "merchant": txn.merchant,
        "type": tx_type,
        "amount": amount,
        "category": txn.category or "Transfer",
        "status": txn.status or "completed",
        "note": txn.note,
        "date": timestamp.isoformat() if hasattr(timestamp, "isoformat") else str(timestamp),
    }


def _generate_otp():
    return str(random.randint(100000, 999999))

@router.get("/")
def get_wallet(current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = current_user.wallet
    if not wallet:
        wallet = WalletModel(
            wallet_id=f"ZANK-{uuid.uuid4().hex[:8].upper()}",
            user_id=current_user.id,
            total_balance=0.0,
            available_balance=0.0,
            held_balance=0.0,
            account_number=f"472988210012{current_user.id.replace('-', '')[:4].upper()}",
            routing_number="021000021"
        )
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    transactions = (
        db.query(TransactionModel)
        .filter(TransactionModel.user_id == current_user.id)
        .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
        .limit(5)
        .all()
    )

    today_key = datetime.utcnow().date().isoformat()
    today_spend = sum(txn.amount for txn in transactions if (txn.type or "") == "debit" and str((txn.date or datetime.utcnow()).date()) == today_key)
    month_key = datetime.utcnow().strftime("%Y-%m")
    month_spend = sum(txn.amount for txn in transactions if (txn.type or "") == "debit" and (txn.date or datetime.utcnow()).strftime("%Y-%m") == month_key)

    return {
        "walletId": wallet.wallet_id,
        "totalBalance": wallet.total_balance,
        "availableBalance": wallet.available_balance,
        "heldBalance": wallet.held_balance,
        "currency": wallet.currency,
        "accountNumber": wallet.account_number,
        "routingNumber": wallet.routing_number,
        "bankName": "Zank Bank (Member FDIC)",
        "iban": f"US29ZANK{wallet.account_number.replace('-','')}",
        "status": "active",
        "dailyLimit": 5000.0,
        "monthlyLimit": 25000.0,
        "todaySpend": today_spend,
        "monthSpend": month_spend,
        "recentTransactions": [_serialize_transaction(txn) for txn in transactions],
    }

@router.post("/send")
def send_money(req: SendMoneyRequest, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = current_user.wallet
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if wallet.available_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    
    wallet.total_balance -= req.amount
    wallet.available_balance -= req.amount
    
    txn = TransactionModel(
        user_id=current_user.id,
        txn_id=f"TXN-SEND-{uuid.uuid4().hex[:6].upper()}",
        merchant=req.recipientEmail,
        type="debit",
        amount=req.amount,
        category="Transfer",
        note=req.note,
        status="completed",
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "transactionId": txn.txn_id,
        "recipient": {"email": req.recipientEmail},
        "wallet": {
            "totalBalance": wallet.total_balance,
            "availableBalance": wallet.available_balance,
            "heldBalance": wallet.held_balance,
        },
        "transaction": _serialize_transaction(txn),
    }


@router.post("/withdraw/send-otp")
def send_withdraw_otp(req: WithdrawOtpRequest, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = current_user.wallet
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if wallet.available_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    if not req.destinationAccountId:
        raise HTTPException(status_code=400, detail="Destination account is required")

    db.query(OTPCode).filter(OTPCode.user_id == current_user.id, OTPCode.used == False).update({"used": True})  # noqa: E712

    otp = _generate_otp()
    otp_record = OTPCode(
        user_id=current_user.id,
        code=otp,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        used=False,
    )
    db.add(otp_record)
    db.commit()

    html = (
        f"<h3>Withdraw Verification Code</h3>"
        f"<p>Your Zank AI withdrawal OTP is: <strong>{otp}</strong>.</p>"
        f"<p>This code is valid for 10 minutes.</p>"
    )
    send_email(current_user.email, "Zank AI - Withdraw OTP", html)

    return {"success": True, "message": "OTP sent to your email."}


@router.post("/withdraw")
def withdraw_funds(req: WithdrawRequest, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet = current_user.wallet
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if len(req.otp) != 6 or not req.otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must be 6 digits")
    if wallet.available_balance < req.amount:
        raise HTTPException(status_code=400, detail="Insufficient funds")
    if not req.destinationAccountId:
        raise HTTPException(status_code=400, detail="Destination account is required")

    otp_record = (
        db.query(OTPCode)
        .filter(OTPCode.user_id == current_user.id, OTPCode.used == False)  # noqa: E712
        .order_by(OTPCode.id.desc())
        .first()
    )
    if not otp_record or otp_record.code != req.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if otp_record.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="OTP expired")

    otp_record.used = True

    wallet.total_balance -= req.amount
    wallet.available_balance -= req.amount
    txn = TransactionModel(
        user_id=current_user.id,
        txn_id=f"TXN-WDR-{uuid.uuid4().hex[:6].upper()}",
        merchant=req.destinationAccountId,
        type="debit",
        amount=req.amount,
        category="Withdrawal",
        note="Withdrawal to linked account",
        status="completed",
    )
    db.add(txn)
    db.commit()

    return {
        "success": True,
        "transactionId": txn.txn_id,
        "message": "Withdrawal completed successfully.",
        "wallet": {
            "totalBalance": wallet.total_balance,
            "availableBalance": wallet.available_balance,
            "heldBalance": wallet.held_balance,
        },
        "transaction": _serialize_transaction(txn),
    }


@router.post("/request")
def request_money(req: RequestMoneyRequest, current_user: UserModel = Depends(get_current_user)):
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    return {
        "success": True,
        "requestId": f"REQ-{uuid.uuid4().hex[:8].upper()}",
        "message": "Money request sent successfully.",
        "request": {
            "contact": req.contact,
            "amount": req.amount,
            "message": req.message,
        },
    }
