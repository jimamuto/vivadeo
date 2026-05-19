"""tenants and auth

Revision ID: 0002_tenants_and_auth
Revises: 0001_production_schema
Create Date: 2026-05-19
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_tenants_and_auth"
down_revision = "0001_production_schema"
branch_labels = None
depends_on = None


DEFAULT_ORG_ID = "default-workspace"


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("slug", sa.String(length=128), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("plan", sa.String(length=32), nullable=False, server_default="starter"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "auth_users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("auth_users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_table(
        "auth_memberships",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("auth_users.id"), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="member"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_auth_membership"),
    )
    op.create_table(
        "auth_invites",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False, server_default="member"),
        sa.Column("token", sa.String(length=255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.add_column("videos", sa.Column("organization_id", sa.String(length=64), nullable=True))
    op.add_column("video_chunks", sa.Column("organization_id", sa.String(length=64), nullable=True))
    op.add_column("jobs", sa.Column("organization_id", sa.String(length=64), nullable=True))
    op.add_column("clips", sa.Column("organization_id", sa.String(length=64), nullable=True))
    op.add_column("dead_letter_entries", sa.Column("organization_id", sa.String(length=64), nullable=True))
    op.execute(
        "INSERT INTO organizations (id, slug, name) "
        f"VALUES ('{DEFAULT_ORG_ID}', 'default', 'Default workspace') "
        "ON CONFLICT (id) DO NOTHING"
    )
    for table in ["videos", "video_chunks", "jobs", "clips", "dead_letter_entries"]:
        op.execute(f"UPDATE {table} SET organization_id = '{DEFAULT_ORG_ID}' WHERE organization_id IS NULL")
        op.alter_column(table, "organization_id", existing_type=sa.String(length=64), nullable=False)
        op.create_foreign_key(
            f"fk_{table}_organization_id_organizations",
            table,
            "organizations",
            ["organization_id"],
            ["id"],
        )


def downgrade() -> None:
    for table in ["dead_letter_entries", "clips", "jobs", "video_chunks", "videos"]:
        op.drop_constraint(f"fk_{table}_organization_id_organizations", table, type_="foreignkey")
        op.drop_column(table, "organization_id")
    op.drop_table("auth_invites")
    op.drop_table("auth_memberships")
    op.drop_table("auth_sessions")
    op.drop_table("auth_users")
    op.drop_table("organizations")
