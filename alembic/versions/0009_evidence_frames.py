"""Cache timestamped evidence frames in object storage."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0009_evidence_frames"
down_revision = "0008_chat_thread_sources"
branch_labels = None
depends_on = None


def upgrade() -> None:
    inspector = inspect(op.get_bind())
    if "evidence_frames" not in inspector.get_table_names():
        op.create_table(
            "evidence_frames",
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column("organization_id", sa.String(length=64), nullable=False),
            sa.Column("video_id", sa.String(length=36), nullable=False),
            sa.Column("timestamp", sa.Float(), nullable=False),
            sa.Column("timestamp_key", sa.String(length=32), nullable=False),
            sa.Column("object_key", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="queued"),
            sa.Column("error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
            sa.ForeignKeyConstraint(["video_id"], ["videos.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("video_id", "timestamp_key", name="uq_evidence_frame_timestamp"),
        )
    if "ix_evidence_frames_organization_video" not in {index["name"] for index in inspect(op.get_bind()).get_indexes("evidence_frames")}:
        op.create_index(
            "ix_evidence_frames_organization_video",
            "evidence_frames",
            ["organization_id", "video_id"],
        )


def downgrade() -> None:
    op.drop_index("ix_evidence_frames_organization_video", table_name="evidence_frames")
    op.drop_table("evidence_frames")
