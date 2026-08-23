"""Persist user profile preferences."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0010_user_preferences"
down_revision = "0009_evidence_frames"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "user_preferences" not in inspect(op.get_bind()).get_table_names():
        op.create_table(
            "user_preferences",
            sa.Column("user_id", sa.String(length=64), primary_key=True),
            sa.Column("city", sa.String(length=120), nullable=False, server_default=""),
            sa.Column("timezone", sa.String(length=80), nullable=False, server_default="UTC"),
            sa.Column("date_format", sa.String(length=40), nullable=False, server_default="dd/MM/yyyy HH:mm"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        )


def downgrade() -> None:
    op.drop_table("user_preferences")
