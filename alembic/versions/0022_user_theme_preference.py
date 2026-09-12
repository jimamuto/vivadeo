"""Add persisted user theme preference."""

from alembic import op
import sqlalchemy as sa

revision = "0022_user_theme_preference"
down_revision = "0021_nvidia_visual_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_preferences",
        sa.Column("theme", sa.String(length=16), nullable=False, server_default="system"),
    )


def downgrade() -> None:
    op.drop_column("user_preferences", "theme")
