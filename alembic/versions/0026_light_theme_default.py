"""Use light mode as the default user theme."""

from alembic import op
import sqlalchemy as sa

revision = "0026_light_theme_default"
down_revision = "0025_billing_credits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Existing system values were created by the previous default.
    op.execute("UPDATE user_preferences SET theme = 'light' WHERE theme = 'system'")
    op.alter_column("user_preferences", "theme", server_default=sa.text("'light'"))


def downgrade() -> None:
    op.alter_column("user_preferences", "theme", server_default=sa.text("'system'"))
