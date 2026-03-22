"""Wallet service and transaction events

Revision ID: 20260320_03
Revises: 20260320_02
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260320_03"
down_revision = "20260320_02"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("ix_wallets_user_id_unique", "wallets", ["user_id"], unique=True)
    op.add_column("wallets", sa.Column("ledger_account_id", sa.String(), nullable=True))
    op.add_column("wallets", sa.Column("status", sa.String(), nullable=False, server_default="active"))
    op.add_column("wallets", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_foreign_key("fk_wallets_ledger_account_id", "wallets", "accounts", ["ledger_account_id"], ["id"])
    op.create_index("ix_wallets_ledger_account_id", "wallets", ["ledger_account_id"], unique=True)

    op.create_table(
        "wallet_holds",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("wallet_id", sa.Integer(), sa.ForeignKey("wallets.id"), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("reason", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="held"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_wallet_holds_wallet_id", "wallet_holds", ["wallet_id"])
    op.create_index("ix_wallet_holds_status", "wallet_holds", ["status"])
    op.create_index("ix_wallet_holds_expires_at", "wallet_holds", ["expires_at"])

    op.create_table(
        "transaction_events",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("from_status", sa.String(), nullable=True),
        sa.Column("to_status", sa.String(), nullable=False),
        sa.Column("actor_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_transaction_events_transaction_id", "transaction_events", ["transaction_id"])
    op.create_index("ix_transaction_events_created_at", "transaction_events", ["created_at"])


def downgrade():
    op.drop_index("ix_transaction_events_created_at", table_name="transaction_events")
    op.drop_index("ix_transaction_events_transaction_id", table_name="transaction_events")
    op.drop_table("transaction_events")

    op.drop_index("ix_wallet_holds_expires_at", table_name="wallet_holds")
    op.drop_index("ix_wallet_holds_status", table_name="wallet_holds")
    op.drop_index("ix_wallet_holds_wallet_id", table_name="wallet_holds")
    op.drop_table("wallet_holds")

    op.drop_index("ix_wallets_ledger_account_id", table_name="wallets")
    op.drop_index("ix_wallets_user_id_unique", table_name="wallets")
    op.drop_constraint("fk_wallets_ledger_account_id", "wallets", type_="foreignkey")
    op.drop_column("wallets", "created_at")
    op.drop_column("wallets", "status")
    op.drop_column("wallets", "ledger_account_id")
