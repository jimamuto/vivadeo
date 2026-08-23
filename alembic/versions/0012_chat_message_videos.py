"""Persist video attachments on individual chat messages."""

from alembic import op
import sqlalchemy as sa

revision = "0012_chat_message_videos"
down_revision = "0011_chat_message_branches"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_message_videos",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("message_id", sa.String(length=36), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["chat_thread_messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.UniqueConstraint("message_id", "video_id", name="uq_chat_message_video"),
    )
    op.create_index(
        "ix_chat_message_videos_message",
        "chat_message_videos",
        ["message_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_chat_message_videos_message", table_name="chat_message_videos")
    op.drop_table("chat_message_videos")
