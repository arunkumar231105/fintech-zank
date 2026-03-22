import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .core.config import get_settings
from .core.logging import configure_logging, get_logger
from .middleware.request_context import RequestIDMiddleware
from .jobs.reconciliation_jobs import start_scheduler, stop_scheduler
from .routers import auth, users, wallet, wallets, cards, savings, budgets, admin, analytics, rewards, security, transactions, transaction_api, notifications, support, ledger, ledger_query, reconciliation, risk
from .core.database import init_db
from .core.database import SessionLocal
from .services.risk_service import ensure_default_transaction_limits

configure_logging()
settings = get_settings()
logger = get_logger(__name__)
limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

app = FastAPI(
    title="Zank AI Backend API",
    description="FastAPI backend powering Zank AI fintech application.",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_middleware(RequestIDMiddleware)

# Create DB tables on startup
@app.on_event("startup")
def on_startup():
    init_db()
    db = SessionLocal()
    try:
        ensure_default_transaction_limits(db)
        db.commit()
    finally:
        db.close()
    start_scheduler()
    logger.info("Application startup complete")


@app.on_event("shutdown")
def on_shutdown():
    stop_scheduler()
    logger.info("Application shutdown complete")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": "Rate limit exceeded",
            "code": "RATE_LIMIT_EXCEEDED",
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error("Unhandled exception", extra={"request_id": request_id, "path": str(request.url.path)}, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "code": "INTERNAL_SERVER_ERROR",
        },
        headers={"X-Request-ID": request_id},
    )

# Routers
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/api/v1/user",      tags=["Users"])
app.include_router(wallet.router,    prefix="/api/v1/wallet",    tags=["Wallet"])
app.include_router(wallets.router,   prefix="/api/v1/wallets",   tags=["Wallets"])
app.include_router(cards.router,     prefix="/api/v1/cards",     tags=["Cards"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(transaction_api.router, prefix="/api/v1/transactions", tags=["Transaction API"])
app.include_router(savings.router,   prefix="/api/v1/savings",   tags=["Savings"])
app.include_router(budgets.router,   prefix="/api/v1/budgets",   tags=["Budgets"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(rewards.router,   prefix="/api/v1/rewards",   tags=["Rewards"])
app.include_router(security.router,  prefix="/api/v1/security",  tags=["Security"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(support.router,   prefix="/api/v1/support",   tags=["Support"])
app.include_router(admin.router,     prefix="/api/v1/admin",     tags=["Admin"])
app.include_router(ledger.router,    prefix="/api/v1/ledger",    tags=["Ledger"])
app.include_router(ledger_query.router, prefix="/api/v1/ledger", tags=["Ledger Query"])
app.include_router(reconciliation.router, prefix="/api/v1/reconciliation", tags=["Reconciliation"])
app.include_router(risk.router, prefix="/api/v1/risk", tags=["Risk"])


@app.get("/health", status_code=200)
def health_check():
    return {"status": "ok", "service": "Zank AI API", "version": "1.0.0"}
