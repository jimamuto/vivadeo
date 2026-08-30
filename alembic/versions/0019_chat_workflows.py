"""Add durable chat workflow results and saved searches.

Revision ID: 0019
Revises: 0018_chat_search_run_parent
"""

from alembic import op
import sqlalchemy as sa

revision = "0019_chat_workflows"
down_revision = "0018_chat_search_run_parent"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_search_runs", sa.Column("stage", sa.String(length=24), nullable=False, server_default="complete"))
    op.add_column("chat_search_runs", sa.Column("progress", sa.Float(), nullable=False, server_default="1"))
    op.add_column("chat_search_runs", sa.Column("output_format", sa.String(length=24), nullable=False, server_default="answer"))
    op.add_column("chat_search_runs", sa.Column("result_rows", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("chat_search_runs", sa.Column("comparison_claims", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")))
    op.add_column("chat_search_runs", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))

    op.create_table(
        "saved_searches",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("modality", sa.String(length=16), nullable=False, server_default="auto"),
        sa.Column("search_mode", sa.String(length=16), nullable=False, server_default="top"),
        sa.Column("output_format", sa.String(length=24), nullable=False, server_default="answer"),
        sa.Column("extraction_type", sa.String(length=32), nullable=True),
        sa.Column("video_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("last_run_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["last_run_id"], ["chat_search_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "name", name="uq_saved_search_org_name"),
    )
    op.create_index("ix_saved_searches_org_updated", "saved_searches", ["organization_id", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_saved_searches_org_updated", table_name="saved_searches")
    op.drop_table("saved_searches")
    for column in ("updated_at", "comparison_claims", "result_rows", "output_format", "progress", "stage"):
        op.drop_column("chat_search_runs", column)
