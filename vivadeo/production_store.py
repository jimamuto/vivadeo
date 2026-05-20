"""Postgres/pgvector-backed video store for production mode."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import Clip, Video, VideoChunk, new_id
from .object_store import ObjectStore


class PostgresVideoStore:
    def __init__(self, session: Session):
        self.session = session

    def add_chunk(
        self,
        video_id: str,
        organization_id: str,
        start_time: float,
        end_time: float,
        embedding: list[float],
        metadata: dict | None = None,
    ) -> str:
        existing = self.session.scalar(
            select(VideoChunk).where(
                VideoChunk.video_id == video_id,
                VideoChunk.start_time == float(start_time),
            )
        )
        if existing:
            existing.end_time = float(end_time)
            existing.embedding = embedding
            existing.chunk_metadata = metadata or {}
            return existing.id

        chunk = VideoChunk(
            id=new_id(),
            organization_id=organization_id,
            video_id=video_id,
            start_time=float(start_time),
            end_time=float(end_time),
            embedding=embedding,
            embedding_backend="modal",
            embedding_model="Qwen/Qwen3-VL-Embedding-2B",
            chunk_metadata=metadata or {},
        )
        self.session.add(chunk)
        self.session.flush()
        return chunk.id

    def search(
        self,
        query_embedding: list[float],
        n_results: int = 5,
        organization_id: str | None = None,
        video_id: str | None = None,
    ) -> list[dict]:
        distance = VideoChunk.embedding.cosine_distance(query_embedding).label("distance")
        stmt = (
            select(VideoChunk, Video, distance)
            .join(Video, Video.id == VideoChunk.video_id)
            .order_by(distance)
            .limit(n_results)
        )
        if organization_id:
            stmt = stmt.where(Video.organization_id == organization_id, VideoChunk.organization_id == organization_id)
        if video_id:
            stmt = stmt.where(VideoChunk.video_id == video_id)
        rows = self.session.execute(stmt).all()
        return [
            {
                "chunk_id": chunk.id,
                "organization_id": chunk.organization_id,
                "video_id": video.id,
                "filename": video.filename,
                "source_uri": video.source_uri,
                "object_key": video.object_key,
                "start_time": chunk.start_time,
                "end_time": chunk.end_time,
                "similarity_score": 1.0 - float(dist),
                "distance": float(dist),
            }
            for chunk, video, dist in rows
        ]

    def stats(self, organization_id: str | None = None, object_store: ObjectStore | None = None) -> dict:
        video_stmt = select(func.count()).select_from(Video)
        chunk_stmt = select(func.count()).select_from(VideoChunk)
        if organization_id:
            video_stmt = video_stmt.where(Video.organization_id == organization_id)
            chunk_stmt = chunk_stmt.where(VideoChunk.organization_id == organization_id)
        video_count = self.session.scalar(video_stmt) or 0
        chunk_count = self.session.scalar(chunk_stmt) or 0
        storage_bytes = 0
        if object_store is not None:
            keys = list(
                self.session.scalars(
                    select(Video.object_key).where(
                        Video.organization_id == organization_id,
                        Video.object_key.is_not(None),
                    )
                ).all()
            )
            keys.extend(
                self.session.scalars(
                    select(Clip.object_key).where(
                        Clip.organization_id == organization_id,
                        Clip.object_key.is_not(None),
                    )
                ).all()
            )
            for key in keys:
                try:
                    storage_bytes += object_store.object_size(key)
                except Exception:
                    continue
        return {
            "total_videos": video_count,
            "total_chunks": chunk_count,
            "total_storage_bytes": storage_bytes,
        }
