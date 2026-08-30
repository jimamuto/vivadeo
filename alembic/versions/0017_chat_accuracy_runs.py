"""Persist chat search runs and evidence feedback.

Revision ID: 0017
Revises: 0016_visual_keyframes
"""

from alembic import op
import sqlalchemy as sa


revision = "0017_chat_accuracy_runs"
down_revision = "0016_visual_keyframes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_search_runs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("thread_id", sa.String(length=36), nullable=True),
        sa.Column("message_id", sa.String(length=36), nullable=True),
        sa.Column("query", sa.Text(), nullable=False),
        sa.Column("modality", sa.String(length=16), nullable=False),
        sa.Column("search_mode", sa.String(length=16), nullable=False, server_default="top"),
        sa.Column("scope_video_ids", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("focus_video_id", sa.String(length=36), nullable=True),
        sa.Column("focus_start_time", sa.Float(), nullable=True),
        sa.Column("focus_end_time", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="completed"),
        sa.Column("search_complete", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("verification_summary", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thread_id"], ["chat_threads.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["message_id"], ["chat_thread_messages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_search_runs_org_created", "chat_search_runs", ["organization_id", "created_at"])
    op.create_index("ix_chat_search_runs_thread", "chat_search_runs", ["thread_id"])

    op.create_table(
        "chat_evidence_feedback",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("search_run_id", sa.String(length=36), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=False),
        sa.Column("end_time", sa.Float(), nullable=False),
        sa.Column("feedback", sa.String(length=32), nullable=False),
        sa.Column("correction", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["search_run_id"], ["chat_search_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_evidence_feedback_run", "chat_evidence_feedback", ["search_run_id"])
    op.create_index("ix_chat_evidence_feedback_org", "chat_evidence_feedback", ["organization_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_evidence_feedback_org", table_name="chat_evidence_feedback")
    op.drop_index("ix_chat_evidence_feedback_run", table_name="chat_evidence_feedback")
    op.drop_table("chat_evidence_feedback")
    op.drop_index("ix_chat_search_runs_thread", table_name="chat_search_runs")
    op.drop_index("ix_chat_search_runs_org_created", table_name="chat_search_runs")
    op.drop_table("chat_search_runs")
