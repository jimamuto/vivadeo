"""Store short fast-start video previews."""

from alembic import op
import sqlalchemy as sa

revision = "0028_video_previews"
down_revision = "0027_visual_keyframe_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("videos", sa.Column("preview_object_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("videos", "preview_object_key")
