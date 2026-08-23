"""Persist workspace chat threads and messages."""

from alembic import op
import sqlalchemy as sa

revision = "0007_chat_threads"
down_revision = "0006_video_transcripts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "chat_threads",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("organization_id", sa.String(length=64), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False, server_default="New thread"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_threads_organization_updated", "chat_threads", ["organization_id", "updated_at"])
    op.create_table(
        "chat_thread_messages",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("thread_id", sa.String(length=36), sa.ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("citations", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_chat_thread_messages_thread_created", "chat_thread_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_chat_thread_messages_thread_created", table_name="chat_thread_messages")
    op.drop_table("chat_thread_messages")
    op.drop_index("ix_chat_threads_organization_updated", table_name="chat_threads")
    op.drop_table("chat_threads")
