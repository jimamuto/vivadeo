"""Store NVIDIA multimodal visual embeddings alongside legacy Qwen vectors."""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision = "0021_nvidia_visual_embeddings"
down_revision = "0020_video_preparation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("video_chunks", "embedding", existing_type=Vector(768), nullable=True)
    op.add_column("video_chunks", sa.Column("visual_embedding", Vector(2048), nullable=True))
    # pgvector's HNSW/IVFFlat indexes cap dimensions at 2,000; NVIDIA VL returns 2,048,
    # so the store uses an exact cosine scan until a lower-dimensional projection exists.


def downgrade() -> None:
    op.drop_column("video_chunks", "visual_embedding")
    op.alter_column("video_chunks", "embedding", existing_type=Vector(768), nullable=False)
