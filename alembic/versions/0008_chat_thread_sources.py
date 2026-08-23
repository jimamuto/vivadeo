"""Persist videos attached to chat threads."""

from alembic import op
import sqlalchemy as sa

revision = "0008_chat_thread_sources"
down_revision = "0007_chat_threads"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_thread_videos",
        sa.Column("thread_id", sa.String(length=36), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["chat_threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("thread_id", "video_id"),
        sa.UniqueConstraint("thread_id", "video_id", name="uq_chat_thread_video"),
    )
    op.create_index(
        "ix_chat_thread_videos_organization",
        "chat_thread_videos",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_thread_videos_organization", table_name="chat_thread_videos")
    op.drop_table("chat_thread_videos")
