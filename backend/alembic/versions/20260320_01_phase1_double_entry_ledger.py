"""Phase 1 double-entry ledger

Revision ID: 20260320_01
Revises:
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260320_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("account_type", sa.String(), nullable=False),
        sa.Column("currency", sa.String(), nullable=False, server_default="USD"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("balance_cached", sa.Numeric(20, 8), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"])
    op.create_index("ix_accounts_account_type", "accounts", ["account_type"])

    op.add_column("transactions", sa.Column("reference_id", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("transaction_type", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("transactions", sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index("ix_transactions_reference_id", "transactions", ["reference_id"], unique=True)
    op.create_index("ix_transactions_status", "transactions", ["status"])
    op.create_index("ix_transactions_created_at", "transactions", ["date"])

    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), nullable=False),
        sa.Column("account_id", sa.String(), sa.ForeignKey("accounts.id"), nullable=False),
        sa.Column("entry_type", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("currency", sa.String(), nullable=False),
        sa.Column("balance_after", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ledger_entries_account_id", "ledger_entries", ["account_id"])
    op.create_index("ix_ledger_entries_transaction_id", "ledger_entries", ["transaction_id"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])

    op.execute(
        """
        CREATE OR REPLACE FUNCTION prevent_ledger_entry_mutation()
        RETURNS trigger AS $$
        BEGIN
            RAISE EXCEPTION 'ledger_entries are immutable and cannot be updated or deleted';
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER ledger_entries_no_update
        BEFORE UPDATE ON ledger_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_ledger_entry_mutation();
        """
    )
    op.execute(
        """
        CREATE TRIGGER ledger_entries_no_delete
        BEFORE DELETE ON ledger_entries
        FOR EACH ROW
        EXECUTE FUNCTION prevent_ledger_entry_mutation();
        """
    )


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS ledger_entries_no_delete ON ledger_entries;")
    op.execute("DROP TRIGGER IF EXISTS ledger_entries_no_update ON ledger_entries;")
    op.execute("DROP FUNCTION IF EXISTS prevent_ledger_entry_mutation;")
    op.drop_index("ix_ledger_entries_created_at", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_transaction_id", table_name="ledger_entries")
    op.drop_index("ix_ledger_entries_account_id", table_name="ledger_entries")
    op.drop_table("ledger_entries")
    op.drop_index("ix_transactions_created_at", table_name="transactions")
    op.drop_index("ix_transactions_status", table_name="transactions")
    op.drop_index("ix_transactions_reference_id", table_name="transactions")
    op.drop_column("transactions", "metadata")
    op.drop_column("transactions", "posted_at")
    op.drop_column("transactions", "transaction_type")
    op.drop_column("transactions", "reference_id")
    op.drop_index("ix_accounts_account_type", table_name="accounts")
    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_table("accounts")
