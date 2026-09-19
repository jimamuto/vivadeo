"""Persist per-keyframe visual embeddings for fast visual search."""

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


revision = "0027_visual_keyframe_embeddings"
down_revision = "0026_light_theme_default"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("videos", sa.Column("embedding", Vector(2048), nullable=True))
    op.add_column("visual_keyframes", sa.Column("embedding", Vector(2048), nullable=True))


def downgrade() -> None:
    op.execute("ALTER TABLE visual_keyframes DROP COLUMN IF EXISTS embedding")
    op.execute("ALTER TABLE videos DROP COLUMN IF EXISTS embedding")
