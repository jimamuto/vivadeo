"""organization settings

Revision ID: 0003_org_settings
Revises: 0002_tenants_and_auth
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_org_settings"
down_revision = "0002_tenants_and_auth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_settings",
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), primary_key=True),
        sa.Column("settings", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("organization_settings")
