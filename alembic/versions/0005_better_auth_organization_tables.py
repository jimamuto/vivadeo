"""better auth organization tables

Revision ID: 0005_org_tables
Revises: 0004_better_auth_tables
Create Date: 2026-05-20
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_org_tables"
down_revision = "0004_better_auth_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("slug", sa.Text(), nullable=False, unique=True),
        sa.Column("logo", sa.Text(), nullable=True),
        sa.Column("metadata", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "member",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("user_id", sa.Text(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Text(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_member_user_id", "member", ["user_id"])
    op.create_index("ix_member_organization_id", "member", ["organization_id"])
    op.create_table(
        "invitation",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("inviter_id", sa.Text(), sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Text(), sa.ForeignKey("organization.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_invitation_email", "invitation", ["email"])
    op.create_index("ix_invitation_organization_id", "invitation", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_invitation_organization_id", table_name="invitation")
    op.drop_index("ix_invitation_email", table_name="invitation")
    op.drop_table("invitation")
    op.drop_index("ix_member_organization_id", table_name="member")
    op.drop_index("ix_member_user_id", table_name="member")
    op.drop_table("member")
    op.drop_table("organization")
