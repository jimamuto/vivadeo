"""Link refined chat searches to their parent run.

Revision ID: 0018
Revises: 0017_chat_accuracy_runs
"""

from alembic import op
import sqlalchemy as sa


revision = "0018_chat_search_run_parent"
down_revision = "0017_chat_accuracy_runs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_search_runs", sa.Column("parent_run_id", sa.String(length=36), nullable=True))
    op.create_foreign_key(
        "fk_chat_search_runs_parent_run",
        "chat_search_runs",
        "chat_search_runs",
        ["parent_run_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_chat_search_runs_parent_run", "chat_search_runs", ["parent_run_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_search_runs_parent_run", table_name="chat_search_runs")
    op.drop_constraint("fk_chat_search_runs_parent_run", "chat_search_runs", type_="foreignkey")
    op.drop_column("chat_search_runs", "parent_run_id")
