"""Track independently usable transcript and visual evidence."""
from alembic import op
import sqlalchemy as sa

revision = "0020_video_preparation"
down_revision = "0019_chat_workflows"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for name in ("transcript_status", "visual_status"):
        op.add_column("videos", sa.Column(name, sa.String(24), nullable=False, server_default="pending"))
    op.execute("UPDATE videos SET transcript_status = 'ready' WHERE EXISTS (SELECT 1 FROM video_transcript_segments s WHERE s.video_id = videos.id)")
    op.execute("UPDATE videos SET visual_status = 'ready' WHERE status = 'ready' AND EXISTS (SELECT 1 FROM video_chunks c WHERE c.video_id = videos.id)")


def downgrade() -> None:
    op.drop_column("videos", "visual_status")
    op.drop_column("videos", "transcript_status")
