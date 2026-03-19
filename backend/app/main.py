from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, users, wallet, cards, savings, budgets, admin, analytics, rewards, security, transactions, notifications, support
from .core.database import init_db

app = FastAPI(
    title="Zank AI Backend API",
    description="FastAPI backend powering Zank AI fintech application.",
    version="1.0.0",
)

# Create DB tables on startup
@app.on_event("startup")
def on_startup():
    init_db()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://zank-ai.vercel.app",
        "https://fintech-zank.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Auth"])
app.include_router(users.router,     prefix="/api/v1/user",      tags=["Users"])
app.include_router(wallet.router,    prefix="/api/v1/wallet",    tags=["Wallet"])
app.include_router(cards.router,     prefix="/api/v1/cards",     tags=["Cards"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(savings.router,   prefix="/api/v1/savings",   tags=["Savings"])
app.include_router(budgets.router,   prefix="/api/v1/budgets",   tags=["Budgets"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(rewards.router,   prefix="/api/v1/rewards",   tags=["Rewards"])
app.include_router(security.router,  prefix="/api/v1/security",  tags=["Security"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(support.router,   prefix="/api/v1/support",   tags=["Support"])
app.include_router(admin.router,     prefix="/api/v1/admin",     tags=["Admin"])


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Zank AI API", "version": "1.0.0"}
