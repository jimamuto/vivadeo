"""Persist visual keyframes and face orientation metadata.

Revision ID: 0016
Revises: 0015
"""

from alembic import op
import sqlalchemy as sa


revision = "0016_visual_keyframes"
down_revision = "0015_pro_nvidia_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "visual_keyframes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=64), nullable=False),
        sa.Column("video_id", sa.String(length=36), nullable=False),
        sa.Column("timestamp", sa.Float(), nullable=False),
        sa.Column("timestamp_key", sa.String(length=32), nullable=False),
        sa.Column("object_key", sa.Text(), nullable=True),
        sa.Column("pose", sa.String(length=16), nullable=False, server_default="unknown"),
        sa.Column("pose_confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("pose_metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="ready"),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("video_id", "timestamp_key", name="uq_visual_keyframe_timestamp"),
    )
    op.create_index("ix_visual_keyframes_video_timestamp", "visual_keyframes", ["video_id", "timestamp"])


def downgrade() -> None:
    op.drop_index("ix_visual_keyframes_video_timestamp", table_name="visual_keyframes")
    op.drop_table("visual_keyframes")
