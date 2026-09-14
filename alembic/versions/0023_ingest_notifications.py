"""Persist ingest notifications and delivery preferences."""

from alembic import op
import sqlalchemy as sa

revision = "0023_ingest_notifications"
down_revision = "0022_user_theme_preference"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_preferences", sa.Column("ingest_email_notifications", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.add_column("user_preferences", sa.Column("ingest_browser_notifications", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_table(
        "user_notifications",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=True),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", "job_id", "kind", name="uq_user_notification_job_kind"),
    )
    op.create_index("ix_user_notifications_user_created", "user_notifications", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_user_notifications_user_created", table_name="user_notifications")
    op.drop_table("user_notifications")
    op.drop_column("user_preferences", "ingest_browser_notifications")
    op.drop_column("user_preferences", "ingest_email_notifications")
