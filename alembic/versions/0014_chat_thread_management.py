"""Add durable chat thread management state."""

from alembic import op
import sqlalchemy as sa

revision = "0014_chat_thread_management"
down_revision = "0013_admin_bypass"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_threads", sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("chat_threads", sa.Column("archived", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("chat_threads", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_chat_threads_management", "chat_threads", ["organization_id", "archived", "pinned", "updated_at"])


def downgrade() -> None:
    op.drop_index("ix_chat_threads_management", table_name="chat_threads")
    op.drop_column("chat_threads", "read_at")
    op.drop_column("chat_threads", "archived")
    op.drop_column("chat_threads", "pinned")
