"""Add durable chat message branches and generation state."""

from alembic import op
import sqlalchemy as sa

revision = "0011_chat_message_branches"
down_revision = "0010_user_preferences"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_threads", sa.Column("current_message_id", sa.String(length=36), nullable=True))
    op.add_column("chat_thread_messages", sa.Column("parent_id", sa.String(length=36), nullable=True))
    op.add_column("chat_thread_messages", sa.Column("status", sa.String(length=24), nullable=False, server_default="completed"))
    op.add_column("chat_thread_messages", sa.Column("error", sa.Text(), nullable=True))
    op.add_column("chat_thread_messages", sa.Column("metadata", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("chat_thread_messages", sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True))

    bind = op.get_bind()
    bind.execute(sa.text("UPDATE chat_thread_messages SET updated_at = created_at WHERE updated_at IS NULL"))
    op.alter_column("chat_thread_messages", "updated_at", nullable=False)

    op.create_foreign_key(
        "fk_chat_threads_current_message",
        "chat_threads",
        "chat_thread_messages",
        ["current_message_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_chat_thread_messages_parent",
        "chat_thread_messages",
        "chat_thread_messages",
        ["parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_chat_thread_messages_thread_parent",
        "chat_thread_messages",
        ["thread_id", "parent_id"],
    )

    # Existing conversations were linear. Convert that order into one branch
    # and point each thread at its latest message.
    thread_ids = bind.execute(sa.text("SELECT id FROM chat_threads")).scalars().all()
    for thread_id in thread_ids:
        message_ids = bind.execute(
            sa.text(
                "SELECT id FROM chat_thread_messages "
                "WHERE thread_id = :thread_id ORDER BY created_at ASC, id ASC"
            ),
            {"thread_id": thread_id},
        ).scalars().all()
        parent_id = None
        for message_id in message_ids:
            bind.execute(
                sa.text("UPDATE chat_thread_messages SET parent_id = :parent_id WHERE id = :message_id"),
                {"parent_id": parent_id, "message_id": message_id},
            )
            parent_id = message_id
        if parent_id is not None:
            bind.execute(
                sa.text("UPDATE chat_threads SET current_message_id = :message_id WHERE id = :thread_id"),
                {"message_id": parent_id, "thread_id": thread_id},
            )


def downgrade() -> None:
    op.drop_index("ix_chat_thread_messages_thread_parent", table_name="chat_thread_messages")
    op.drop_constraint("fk_chat_thread_messages_parent", "chat_thread_messages", type_="foreignkey")
    op.drop_constraint("fk_chat_threads_current_message", "chat_threads", type_="foreignkey")
    op.drop_column("chat_thread_messages", "updated_at")
    op.drop_column("chat_thread_messages", "metadata")
    op.drop_column("chat_thread_messages", "error")
    op.drop_column("chat_thread_messages", "status")
    op.drop_column("chat_thread_messages", "parent_id")
    op.drop_column("chat_threads", "current_message_id")
