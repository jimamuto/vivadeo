"""Add workspace subscriptions and immutable credit accounting."""

from alembic import op
import sqlalchemy as sa

revision = "0025_billing_credits"
down_revision = "0024_review_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "billing_accounts",
        sa.Column("organization_id", sa.String(64), primary_key=True),
        sa.Column("stripe_customer_id", sa.String(64), nullable=False, unique=True),
        sa.Column("billing_email", sa.String(255)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "billing_subscriptions",
        sa.Column("organization_id", sa.String(64), primary_key=True),
        sa.Column("stripe_subscription_id", sa.String(64), nullable=False, unique=True),
        sa.Column("stripe_price_id", sa.String(64)),
        sa.Column("plan", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("current_period_start", sa.DateTime(timezone=True)),
        sa.Column("current_period_end", sa.DateTime(timezone=True)),
        sa.Column("cancel_at_period_end", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
    )
    op.create_table(
        "stripe_events",
        sa.Column("id", sa.String(255), primary_key=True),
        sa.Column("event_type", sa.String(128), nullable=False),
        sa.Column("created", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True)),
        sa.Column("error", sa.Text()),
        sa.Column("payload", sa.JSON(), nullable=False),
    )
    op.create_table(
        "credit_grants",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(64), nullable=False),
        sa.Column("credit_type", sa.String(32), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("remaining", sa.BigInteger(), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("source_id", sa.String(255), nullable=False),
        sa.Column("effective_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("organization_id", "credit_type", "source", "source_id", name="uq_credit_grant_source"),
    )
    op.create_index("ix_credit_grants_available", "credit_grants", ["organization_id", "credit_type", "expires_at"])
    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("organization_id", sa.String(64), nullable=False),
        sa.Column("grant_id", sa.String(36), nullable=False),
        sa.Column("credit_type", sa.String(32), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("operation_id", sa.String(128), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["grant_id"], ["credit_grants.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("organization_id", "operation_id", "kind", name="uq_credit_transaction_operation"),
    )


def downgrade() -> None:
    op.drop_table("credit_transactions")
    op.drop_index("ix_credit_grants_available", table_name="credit_grants")
    op.drop_table("credit_grants")
    op.drop_table("stripe_events")
    op.drop_table("billing_subscriptions")
    op.drop_table("billing_accounts")
