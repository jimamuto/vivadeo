"""SQLAlchemy models and session helpers for production storage."""

import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Iterator

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from .config import get_settings


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    plan: Mapped[str] = mapped_column(String(32), nullable=False, default="starter")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AuthUser(Base):
    __tablename__ = "auth_users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    name: Mapped[str | None] = mapped_column(String(255))
    password_hash: Mapped[str | None] = mapped_column(Text)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("auth_users.id"), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthMembership(Base):
    __tablename__ = "auth_memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_auth_membership"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("auth_users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="member")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuthInvite(Base):
    __tablename__ = "auth_invites"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="member")
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OrganizationSetting(Base):
    __tablename__ = "organization_settings"

    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), primary_key=True)
    settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Video(Base):
    __tablename__ = "videos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_uri: Mapped[str] = mapped_column(Text, nullable=False)
    object_key: Mapped[str | None] = mapped_column(Text)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    content_type: Mapped[str | None] = mapped_column(String(128))
    duration: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    chunks: Mapped[list["VideoChunk"]] = relationship(back_populates="video")


class VideoChunk(Base):
    __tablename__ = "video_chunks"
    __table_args__ = (UniqueConstraint("video_id", "start_time", name="uq_video_chunk_start"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    embedding_backend: Mapped[str] = mapped_column(String(64), nullable=False, default="modal")
    embedding_model: Mapped[str] = mapped_column(String(128), nullable=False, default="Qwen/Qwen3-VL-Embedding-2B")
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    video: Mapped[Video] = relationship(back_populates="chunks")


class VideoTranscriptSegment(Base):
    __tablename__ = "video_transcript_segments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    nvidia_embedding: Mapped[list[float] | None] = mapped_column(Vector(2048))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ChatThread(Base):
    __tablename__ = "chat_threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="New thread")
    current_message_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("chat_thread_messages.id", ondelete="SET NULL"))
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    messages: Mapped[list["ChatThreadMessage"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ChatThreadMessage.created_at",
        foreign_keys="ChatThreadMessage.thread_id",
    )
    current_message: Mapped["ChatThreadMessage | None"] = relationship(foreign_keys=[current_message_id], post_update=True)
    sources: Mapped[list["ChatThreadVideo"]] = relationship(back_populates="thread", cascade="all, delete-orphan", order_by="ChatThreadVideo.created_at")


class ChatThreadVideo(Base):
    __tablename__ = "chat_thread_videos"
    __table_args__ = (UniqueConstraint("thread_id", "video_id", name="uq_chat_thread_video"),)

    thread_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_threads.id", ondelete="CASCADE"), primary_key=True)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    thread: Mapped[ChatThread] = relationship(back_populates="sources")
    video: Mapped[Video] = relationship()


class VisualKeyframe(Base):
    __tablename__ = "visual_keyframes"
    __table_args__ = (UniqueConstraint("video_id", "timestamp_key", name="uq_visual_keyframe_timestamp"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp_key: Mapped[str] = mapped_column(String(32), nullable=False)
    object_key: Mapped[str | None] = mapped_column(Text)
    pose: Mapped[str] = mapped_column(String(16), nullable=False, default="unknown")
    pose_confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    pose_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="ready")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class EvidenceFrame(Base):
    __tablename__ = "evidence_frames"
    __table_args__ = (UniqueConstraint("video_id", "timestamp_key", name="uq_evidence_frame_timestamp"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp_key: Mapped[str] = mapped_column(String(32), nullable=False)
    object_key: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ChatThreadMessage(Base):
    __tablename__ = "chat_thread_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    thread_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_threads.id", ondelete="CASCADE"), nullable=False)
    parent_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("chat_thread_messages.id", ondelete="SET NULL"))
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="completed")
    error: Mapped[str | None] = mapped_column(Text)
    generation_metadata: Mapped[dict] = mapped_column("metadata", JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    thread: Mapped[ChatThread] = relationship(back_populates="messages", foreign_keys=[thread_id])
    parent: Mapped["ChatThreadMessage | None"] = relationship(remote_side=[id], back_populates="children", foreign_keys=[parent_id])
    children: Mapped[list["ChatThreadMessage"]] = relationship(back_populates="parent", foreign_keys=[parent_id])
    attachments: Mapped[list["ChatMessageVideo"]] = relationship(back_populates="message", cascade="all, delete-orphan", order_by="ChatMessageVideo.created_at")


class ChatMessageVideo(Base):
    __tablename__ = "chat_message_videos"
    __table_args__ = (UniqueConstraint("message_id", "video_id", name="uq_chat_message_video"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    message_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_thread_messages.id", ondelete="CASCADE"), nullable=False)
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id", ondelete="CASCADE"), nullable=False)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    message: Mapped[ChatThreadMessage] = relationship(back_populates="attachments")
    video: Mapped[Video] = relationship()


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    video_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("videos.id"))
    clip_id: Mapped[str | None] = mapped_column(String(36))
    progress: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    message: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Clip(Base):
    __tablename__ = "clips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    video_id: Mapped[str] = mapped_column(String(36), ForeignKey("videos.id"), nullable=False)
    job_id: Mapped[str | None] = mapped_column(String(36))
    object_key: Mapped[str | None] = mapped_column(Text)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DeadLetterEntry(Base):
    __tablename__ = "dead_letter_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    organization_id: Mapped[str] = mapped_column(String(64), ForeignKey("organizations.id"), nullable=False, default="default-workspace")
    video_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("videos.id"))
    chunk_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source_uri: Mapped[str] = mapped_column(Text, nullable=False)
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)
    error: Mapped[str] = mapped_column(Text, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


def make_engine(database_url: str | None = None):
    settings = get_settings()
    return create_engine(
        database_url or settings.database_url,
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_timeout=settings.db_pool_timeout,
        pool_recycle=settings.db_pool_recycle,
    )


_engine = make_engine()
SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)


def dispose_engine(close: bool = True) -> None:
    """Drop inherited or stale connections, especially across worker forks."""
    _engine.dispose(close=close)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
