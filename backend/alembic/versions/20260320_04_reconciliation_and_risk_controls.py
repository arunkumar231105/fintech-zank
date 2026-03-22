"""Reconciliation and risk controls

Revision ID: 20260320_04
Revises: 20260320_03
Create Date: 2026-03-20
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260320_04"
down_revision = "20260320_03"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "reconciliation_reports",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("job_type", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("ledger_balance", sa.Numeric(20, 8), nullable=False),
        sa.Column("external_balance", sa.Numeric(20, 8), nullable=False),
        sa.Column("difference", sa.Numeric(20, 8), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("alert_raised", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reconciliation_reports_job_type", "reconciliation_reports", ["job_type"])
    op.create_index("ix_reconciliation_reports_status", "reconciliation_reports", ["status"])
    op.create_index("ix_reconciliation_reports_created_at", "reconciliation_reports", ["created_at"])

    op.create_table(
        "reconciliation_alerts",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("report_id", sa.String(), sa.ForeignKey("reconciliation_reports.id"), nullable=False),
        sa.Column("alert_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("message", sa.String(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_by", sa.String(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_reconciliation_alerts_report_id", "reconciliation_alerts", ["report_id"])
    op.create_index("ix_reconciliation_alerts_resolved", "reconciliation_alerts", ["resolved"])
    op.create_index("ix_reconciliation_alerts_severity", "reconciliation_alerts", ["severity"])

    op.create_table(
        "kyc_records",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("level", sa.String(), nullable=False, server_default="basic"),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("date_of_birth", sa.Date(), nullable=True),
        sa.Column("nationality", sa.String(), nullable=True),
        sa.Column("document_type", sa.String(), nullable=True),
        sa.Column("document_number", sa.String(), nullable=True),
        sa.Column("document_expiry", sa.Date(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejected_reason", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_kyc_records_user_id", "kyc_records", ["user_id"], unique=True)

    op.create_table(
        "transaction_limits",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("kyc_level", sa.String(), nullable=False),
        sa.Column("transaction_type", sa.String(), nullable=False),
        sa.Column("daily_limit", sa.Numeric(20, 8), nullable=False),
        sa.Column("monthly_limit", sa.Numeric(20, 8), nullable=False),
        sa.Column("per_transaction_limit", sa.Numeric(20, 8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_transaction_limits_kyc_level", "transaction_limits", ["kyc_level"])
    op.create_index("ix_transaction_limits_transaction_type", "transaction_limits", ["transaction_type"])

    op.bulk_insert(
        sa.table(
            "transaction_limits",
            sa.column("id", sa.String()),
            sa.column("kyc_level", sa.String()),
            sa.column("transaction_type", sa.String()),
            sa.column("daily_limit", sa.Numeric(20, 8)),
            sa.column("monthly_limit", sa.Numeric(20, 8)),
            sa.column("per_transaction_limit", sa.Numeric(20, 8)),
        ),
        [
            {"id": "tl_basic_transfer", "kyc_level": "basic", "transaction_type": "transfer", "daily_limit": 500, "monthly_limit": 2000, "per_transaction_limit": 200},
            {"id": "tl_basic_withdrawal", "kyc_level": "basic", "transaction_type": "withdrawal", "daily_limit": 200, "monthly_limit": 1000, "per_transaction_limit": 100},
            {"id": "tl_standard_transfer", "kyc_level": "standard", "transaction_type": "transfer", "daily_limit": 5000, "monthly_limit": 20000, "per_transaction_limit": 2000},
            {"id": "tl_standard_withdrawal", "kyc_level": "standard", "transaction_type": "withdrawal", "daily_limit": 2000, "monthly_limit": 10000, "per_transaction_limit": 1000},
            {"id": "tl_enhanced_transfer", "kyc_level": "enhanced", "transaction_type": "transfer", "daily_limit": 50000, "monthly_limit": 200000, "per_transaction_limit": 20000},
            {"id": "tl_enhanced_withdrawal", "kyc_level": "enhanced", "transaction_type": "withdrawal", "daily_limit": 20000, "monthly_limit": 100000, "per_transaction_limit": 10000},
        ],
    )

    op.create_table(
        "velocity_checks",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("transaction_type", sa.String(), nullable=False),
        sa.Column("amount", sa.Numeric(20, 8), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_velocity_checks_user_id", "velocity_checks", ["user_id"])
    op.create_index("ix_velocity_checks_window_range", "velocity_checks", ["window_start", "window_end"])

    op.create_table(
        "aml_flags",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), nullable=True),
        sa.Column("flag_type", sa.String(), nullable=False),
        sa.Column("severity", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_aml_flags_user_id", "aml_flags", ["user_id"])
    op.create_index("ix_aml_flags_status", "aml_flags", ["status"])
    op.create_index("ix_aml_flags_flag_type", "aml_flags", ["flag_type"])

    op.create_table(
        "fraud_scores",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("transaction_id", sa.Integer(), sa.ForeignKey("transactions.id"), nullable=True),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("risk_level", sa.String(), nullable=False),
        sa.Column("factors", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_fraud_scores_user_id", "fraud_scores", ["user_id"])
    op.create_index("ix_fraud_scores_score", "fraud_scores", ["score"])
    op.create_index("ix_fraud_scores_risk_level", "fraud_scores", ["risk_level"])


def downgrade():
    op.drop_index("ix_fraud_scores_risk_level", table_name="fraud_scores")
    op.drop_index("ix_fraud_scores_score", table_name="fraud_scores")
    op.drop_index("ix_fraud_scores_user_id", table_name="fraud_scores")
    op.drop_table("fraud_scores")

    op.drop_index("ix_aml_flags_flag_type", table_name="aml_flags")
    op.drop_index("ix_aml_flags_status", table_name="aml_flags")
    op.drop_index("ix_aml_flags_user_id", table_name="aml_flags")
    op.drop_table("aml_flags")

    op.drop_index("ix_velocity_checks_window_range", table_name="velocity_checks")
    op.drop_index("ix_velocity_checks_user_id", table_name="velocity_checks")
    op.drop_table("velocity_checks")

    op.drop_index("ix_transaction_limits_transaction_type", table_name="transaction_limits")
    op.drop_index("ix_transaction_limits_kyc_level", table_name="transaction_limits")
    op.drop_table("transaction_limits")

    op.drop_index("ix_kyc_records_user_id", table_name="kyc_records")
    op.drop_table("kyc_records")

    op.drop_index("ix_reconciliation_alerts_severity", table_name="reconciliation_alerts")
    op.drop_index("ix_reconciliation_alerts_resolved", table_name="reconciliation_alerts")
    op.drop_index("ix_reconciliation_alerts_report_id", table_name="reconciliation_alerts")
    op.drop_table("reconciliation_alerts")

    op.drop_index("ix_reconciliation_reports_created_at", table_name="reconciliation_reports")
    op.drop_index("ix_reconciliation_reports_status", table_name="reconciliation_reports")
    op.drop_index("ix_reconciliation_reports_job_type", table_name="reconciliation_reports")
    op.drop_table("reconciliation_reports")
