"""add video transcript segments

Revision ID: 0006_video_transcripts
Revises: 0005_org_tables
Create Date: 2026-05-23 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_video_transcripts"
down_revision = "0005_org_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("video_transcript_segments"):
        op.create_table(
            "video_transcript_segments",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("organization_id", sa.String(length=64), nullable=False),
            sa.Column("video_id", sa.String(length=36), nullable=False),
            sa.Column("start_time", sa.Float(), nullable=False),
            sa.Column("end_time", sa.Float(), nullable=False),
            sa.Column("text", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
            sa.ForeignKeyConstraint(["video_id"], ["videos.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {index["name"] for index in inspector.get_indexes("video_transcript_segments")}
    if "ix_video_transcript_segments_lookup" not in indexes:
        op.create_index(
            "ix_video_transcript_segments_lookup",
            "video_transcript_segments",
            ["organization_id", "video_id", "start_time"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("video_transcript_segments"):
        indexes = {index["name"] for index in inspector.get_indexes("video_transcript_segments")}
        if "ix_video_transcript_segments_lookup" in indexes:
            op.drop_index("ix_video_transcript_segments_lookup", table_name="video_transcript_segments")
        op.drop_table("video_transcript_segments")
