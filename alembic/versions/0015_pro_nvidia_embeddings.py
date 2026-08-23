"""Add 2048-dimensional NVIDIA Pro transcript embeddings."""

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "0015_pro_nvidia_embeddings"
down_revision = "0014_chat_thread_management"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("video_transcript_segments", sa.Column("nvidia_embedding", Vector(2048), nullable=True))
    op.create_index(
        "ix_video_transcript_segments_nvidia_embedding",
        "video_transcript_segments",
        ["organization_id", "video_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_video_transcript_segments_nvidia_embedding", table_name="video_transcript_segments")
    op.drop_column("video_transcript_segments", "nvidia_embedding")
