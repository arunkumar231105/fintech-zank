import csv
import io
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from ..core.database import get_db
from ..core.dependencies import get_current_user
from ..models import LedgerEntry, Transaction as TransactionModel, TransactionEvent, User as UserModel
from ..services.ledger_service import ensure_user_wallet_account, serialize_ledger_entry

router = APIRouter()


def _normalize_transaction_type(value: str):
    mapping = {
        "credit": "receive",
        "debit": "send",
        "deposit": "deposit",
        "withdrawal": "withdraw",
        "transfer": "send",
        "receive": "receive",
        "send": "send",
        "withdraw": "withdraw",
        "refund": "receive",
        "reversal": "receive",
    }
    return mapping.get((value or "").lower(), (value or "send").lower())


def _serialize_transaction(txn: TransactionModel):
    txn_type = _normalize_transaction_type(txn.category or txn.type)
    amount = abs(txn.amount or 0)
    direction = "credit" if (txn.type or "").lower() == "credit" else "debit"
    return {
        "id": txn.txn_id,
        "reference_id": txn.txn_id,
        "type": txn_type,
        "direction": direction,
        "description": txn.note or txn.merchant or txn.category or "Transaction",
        "merchant": txn.merchant,
        "amount": amount,
        "signed_amount": amount if direction == "credit" else -amount,
        "currency": txn.currency or "USD",
        "status": txn.status or "completed",
        "from_user": None,
        "to_user": txn.merchant,
        "failure_reason": "Transaction failed" if (txn.status or "").lower() == "failed" else None,
        "reference": txn.txn_id,
        "timestamp": txn.date.isoformat() if txn.date else datetime.utcnow().isoformat(),
        "category": txn.category or "General",
        "note": txn.note or "",
    }


def _serialize_ledger_transaction(txn: TransactionModel, account_id: str):
    entry = next((item for item in txn.ledger_entries if item.account_id == account_id), None)
    direction = "credit" if entry and entry.entry_type == "credit" else "debit"
    amount = abs(float(entry.amount if entry else txn.amount or 0))
    txn_type = _normalize_transaction_type(txn.transaction_type or txn.category or txn.type)
    metadata = txn.metadata_json or {}
    return {
        "id": txn.id,
        "reference_id": txn.reference_id or txn.txn_id or str(txn.id),
        "type": txn_type,
        "direction": direction,
        "description": metadata.get("description") or txn.note or txn.merchant or txn.category or "Transaction",
        "merchant": metadata.get("merchant") or txn.merchant,
        "amount": amount,
        "signed_amount": amount if direction == "credit" else -amount,
        "currency": txn.currency or "USD",
        "status": txn.status or "posted",
        "from_user": metadata.get("from_user_id"),
        "to_user": metadata.get("to_user_id") or metadata.get("merchant_id") or metadata.get("merchant"),
        "failure_reason": "Transaction failed" if (txn.status or "").lower() == "failed" else None,
        "reference": txn.reference_id or txn.txn_id or str(txn.id),
        "timestamp": txn.date.isoformat() if txn.date else datetime.utcnow().isoformat(),
        "category": txn.transaction_type or txn.category or "General",
        "note": metadata.get("description") or txn.note or "",
        "fee": float(metadata.get("fee", 0) or 0),
    }


def _get_period_range(period: str):
    now = datetime.utcnow()
    if period == "day":
        start = datetime(now.year, now.month, now.day)
    elif period == "week":
        start = datetime(now.year, now.month, now.day) - timedelta(days=now.weekday())
    elif period == "year":
        start = datetime(now.year, 1, 1)
    else:
        start = datetime(now.year, now.month, 1)
    return start, now


def _query_user_ledger_transactions(db: Session, account_id: str):
    return (
        db.query(TransactionModel)
        .options(joinedload(TransactionModel.ledger_entries))
        .filter(TransactionModel.ledger_entries.any(LedgerEntry.account_id == account_id))
    )


@router.get("")
def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    search: Optional[str] = None,
    account_id: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet_account = ensure_user_wallet_account(db, current_user.id)
    target_account_id = account_id or wallet_account.id

    if target_account_id == wallet_account.id:
        query = _query_user_ledger_transactions(db, target_account_id)
        if status and status.lower() != "all":
            query = query.filter(TransactionModel.status == status.lower())
        if type and type.lower() != "all":
            query = query.filter((TransactionModel.transaction_type == type.lower()) | (TransactionModel.category.ilike(f"%{type.lower()}%")))
        if startDate:
            query = query.filter(TransactionModel.date >= datetime.fromisoformat(startDate))
        if endDate:
            query = query.filter(TransactionModel.date <= datetime.fromisoformat(endDate) + timedelta(days=1))
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                (TransactionModel.reference_id.ilike(pattern))
                | (TransactionModel.txn_id.ilike(pattern))
                | (TransactionModel.merchant.ilike(pattern))
                | (TransactionModel.note.ilike(pattern))
            )

        total = query.count()
        items = (
            query
            .order_by(TransactionModel.date.desc(), TransactionModel.id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return {
            "items": [_serialize_ledger_transaction(item, target_account_id) for item in items],
            "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit},
        }

    query = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id)
    if status and status.lower() != "all":
        query = query.filter(TransactionModel.status == status.lower())
    if type and type.lower() != "all":
        tx_type = type.lower()
        if tx_type == "receive":
            query = query.filter(TransactionModel.type == "credit")
        elif tx_type in {"send", "withdraw", "deposit"}:
            query = query.filter(TransactionModel.category.ilike(f"%{tx_type.capitalize()}%"))
    if startDate:
        query = query.filter(TransactionModel.date >= datetime.fromisoformat(startDate))
    if endDate:
        query = query.filter(TransactionModel.date <= datetime.fromisoformat(endDate) + timedelta(days=1))
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            (TransactionModel.txn_id.ilike(pattern))
            | (TransactionModel.merchant.ilike(pattern))
            | (TransactionModel.note.ilike(pattern))
        )

    total = query.count()
    items = query.order_by(TransactionModel.date.desc(), TransactionModel.id.desc()).offset((page - 1) * limit).limit(limit).all()
    return {"items": [_serialize_transaction(item) for item in items], "pagination": {"page": page, "limit": limit, "total": total, "pages": (total + limit - 1) // limit}}


@router.get("/stats")
def transaction_stats(period: str = Query("month"), current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    start, end = _get_period_range(period)
    wallet_account = ensure_user_wallet_account(db, current_user.id)
    transactions = _query_user_ledger_transactions(db, wallet_account.id).filter(TransactionModel.date >= start, TransactionModel.date <= end).all()

    if transactions:
        income = 0.0
        expenses = 0.0
        points = {}
        for tx in transactions:
            entry = next((item for item in tx.ledger_entries if item.account_id == wallet_account.id), None)
            if not entry:
                continue
            amount = abs(float(entry.amount or 0))
            key = tx.date.strftime("%Y-%m-%d") if tx.date else datetime.utcnow().strftime("%Y-%m-%d")
            if key not in points:
                points[key] = {"label": key, "income": 0.0, "expenses": 0.0}
            if entry.entry_type == "credit":
                income += amount
                points[key]["income"] += amount
            else:
                expenses += amount
                points[key]["expenses"] += amount
        return {"period": period, "income": income, "expenses": expenses, "net": income - expenses, "chart": list(points.values())}

    transactions = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id, TransactionModel.date >= start, TransactionModel.date <= end).order_by(TransactionModel.date.asc()).all()
    income = sum(abs(tx.amount or 0) for tx in transactions if (tx.type or "").lower() == "credit")
    expenses = sum(abs(tx.amount or 0) for tx in transactions if (tx.type or "").lower() != "credit")
    points = {}
    for tx in transactions:
        key = tx.date.strftime("%Y-%m-%d") if tx.date else datetime.utcnow().strftime("%Y-%m-%d")
        if key not in points:
            points[key] = {"label": key, "income": 0.0, "expenses": 0.0}
        if (tx.type or "").lower() == "credit":
            points[key]["income"] += abs(tx.amount or 0)
        else:
            points[key]["expenses"] += abs(tx.amount or 0)
    return {"period": period, "income": income, "expenses": expenses, "net": income - expenses, "chart": list(points.values())}


@router.get("/export")
def export_transactions(
    format: str = Query("csv"),
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wallet_account = ensure_user_wallet_account(db, current_user.id)
    query = _query_user_ledger_transactions(db, wallet_account.id)
    if startDate:
        query = query.filter(TransactionModel.date >= datetime.fromisoformat(startDate))
    if endDate:
        query = query.filter(TransactionModel.date <= datetime.fromisoformat(endDate) + timedelta(days=1))
    transactions = query.order_by(TransactionModel.date.desc(), TransactionModel.id.desc()).all()
    rows = [_serialize_ledger_transaction(txn, wallet_account.id) for txn in transactions]

    if format not in {"csv", "pdf", "xlsx"}:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Reference", "Type", "Description", "Amount", "Currency", "Status", "Timestamp"])
    for row in rows:
        writer.writerow([row["reference_id"], row["type"], row["description"], row["signed_amount"], row["currency"], row["status"], row["timestamp"]])
    media_type = "text/csv"
    if format == "pdf":
        media_type = "application/pdf"
    elif format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}"
    return Response(
        content=buffer.getvalue().encode("utf-8"),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{transaction_id}")
def get_transaction_detail(transaction_id: str, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    wallet_account = ensure_user_wallet_account(db, current_user.id)
    ledger_transaction = (
        _query_user_ledger_transactions(db, wallet_account.id)
        .filter((TransactionModel.reference_id == transaction_id) | (TransactionModel.txn_id == transaction_id))
        .first()
    )
    if ledger_transaction:
        detail = _serialize_ledger_transaction(ledger_transaction, wallet_account.id)
        events = (
            db.query(TransactionEvent)
            .filter(TransactionEvent.transaction_id == ledger_transaction.id)
            .order_by(TransactionEvent.created_at.asc(), TransactionEvent.id.asc())
            .all()
        )
        detail["entries"] = [serialize_ledger_entry(entry) for entry in ledger_transaction.ledger_entries]
        detail["events"] = [
            {
                "id": event.id,
                "from_status": event.from_status,
                "to_status": event.to_status,
                "actor_id": event.actor_id,
                "metadata": event.metadata_json or {},
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ]
        return detail

    transaction = db.query(TransactionModel).filter(TransactionModel.user_id == current_user.id, TransactionModel.txn_id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return _serialize_transaction(transaction)
