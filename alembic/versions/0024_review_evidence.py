"""Persist evidence selected for review."""

from alembic import op
import sqlalchemy as sa


revision = "0024_review_evidence"
down_revision = "0023_ingest_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if "review_evidence_items" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "review_evidence_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("search_run_id", sa.String(length=36), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=False),
        sa.Column("end_time", sa.Float(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("modality", sa.String(length=16), nullable=False, server_default="transcript"),
        sa.Column("decision", sa.String(length=24), nullable=False, server_default="pending"),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["search_run_id"], ["chat_search_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("organization_id", "search_run_id", "video_id", "start_time", "end_time", name="uq_review_evidence_moment"),
    )
    op.create_index("ix_review_evidence_org_updated", "review_evidence_items", ["organization_id", "updated_at"])
    op.create_index("ix_review_evidence_run", "review_evidence_items", ["search_run_id"])


def downgrade() -> None:
    op.drop_index("ix_review_evidence_run", table_name="review_evidence_items")
    op.drop_index("ix_review_evidence_org_updated", table_name="review_evidence_items")
    op.drop_table("review_evidence_items")
