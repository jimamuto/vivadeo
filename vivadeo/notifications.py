"""Persist and deliver user-facing ingest outcome notifications."""

import logging

from azure.communication.email import EmailClient
from sqlalchemy import text

from .config import get_settings
from .db import new_id, session_scope

logger = logging.getLogger(__name__)


def notify_ingest_outcome(*, job_id: str, video_id: str, organization_id: str, succeeded: bool) -> None:
    try:
        _notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=succeeded)
    except Exception:
        logger.exception("ingest_notification_persistence_failed job_id=%s", job_id)


def _notify_ingest_outcome(*, job_id: str, video_id: str, organization_id: str, succeeded: bool) -> None:
    settings = get_settings()
    with session_scope() as session:
        filename = session.execute(text("SELECT filename FROM videos WHERE id = :video_id"), {"video_id": video_id}).scalar_one_or_none() or "Your video"
        members = session.execute(text('''
            SELECT u.id, u.email,
                   COALESCE(p.ingest_email_notifications, TRUE) AS email_enabled
            FROM member m
            JOIN "user" u ON u.id = m.user_id
            LEFT JOIN user_preferences p ON p.user_id = u.id
            WHERE m.organization_id = :organization_id
        '''), {"organization_id": organization_id}).mappings().all()
        title = f"{filename} is ready" if succeeded else f"{filename} needs attention"
        message = "Your video is ready to search and use in chat." if succeeded else "Video processing stopped before completion. Open Add video to review or retry it."
        kind = "ingest_ready" if succeeded else "ingest_failed"
        for member in members:
            session.execute(text('''
                INSERT INTO user_notifications (id, user_id, organization_id, job_id, video_id, kind, title, message, created_at)
                VALUES (:id, :user_id, :organization_id, :job_id, :video_id, :kind, :title, :message, NOW())
                ON CONFLICT (user_id, job_id, kind) DO NOTHING
            '''), {"id": new_id(), "user_id": member["id"], "organization_id": organization_id, "job_id": job_id, "video_id": video_id, "kind": kind, "title": title, "message": message})
            if member["email_enabled"] and settings.azure_communication_connection_string and settings.email_from:
                try:
                    poller = EmailClient.from_connection_string(settings.azure_communication_connection_string).begin_send({
                        "senderAddress": settings.email_from,
                        "recipients": {"to": [{"address": member["email"]}]},
                        "content": {"subject": f"Vivadeo: {title}", "html": f"<p>{message}</p><p>Open Vivadeo to view the video and its processing details.</p>"},
                    })
                    poller.result()
                except Exception:
                    logger.exception("ingest_notification_email_failed job_id=%s user_id=%s", job_id, member["id"])
