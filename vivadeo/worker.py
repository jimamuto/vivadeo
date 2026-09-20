"""Celery worker tasks for production ingestion and clip generation."""

import json
import logging
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

from celery import Celery
from celery.signals import worker_process_init, worker_process_shutdown
from redis import Redis
from sqlalchemy import delete, select

from .chunker import chunk_video, is_still_frame_chunk, preprocess_chunk, _get_ffmpeg_executable, _get_video_duration
from .config import get_settings
from .db import ChatThreadMessage, Clip, DeadLetterEntry, EvidenceFrame, Job, Organization, Video, VideoTranscriptSegment, VisualKeyframe, dispose_engine, new_id, session_scope, utcnow
from .downloader import download_video_url
from .embedder import get_embedder, reset_embedder
from .frame_extractor import extract_frame
from .azure_whisper import AzureWhisperTranscriber
from .object_store import ObjectStore, clip_object_key, evidence_frame_object_key, video_object_key, video_preview_object_key, visual_keyframe_object_key
from .notifications import notify_ingest_outcome
from .production_store import PostgresVideoStore
from .trimmer import trim_clip
from .billing import consume_processing_allowance, enforce_storage_allowance, refund_processing_allowance


settings = get_settings()
logger = logging.getLogger(__name__)
progress_bus = Redis.from_url(settings.redis_url, decode_responses=True)
celery_app = Celery(
    "vivadeo",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(
    task_track_started=True, worker_prefetch_multiplier=1,
    task_queue_max_priority=9, task_default_priority=5,
    worker_max_tasks_per_child=100, broker_connection_retry_on_startup=True,
    task_routes={
        "vivadeo.generate_chat": {"queue": "chat"},
        "vivadeo.extract_evidence_frame": {"queue": "evidence"},
    },
)


@worker_process_init.connect
def _reset_database_pool_after_fork(**_kwargs) -> None:
    dispose_engine(close=False)


@worker_process_shutdown.connect
def _dispose_worker_database_pool(**_kwargs) -> None:
    dispose_engine()


class JobCanceled(Exception):
    pass


def _create_video_preview(source_path: str) -> str:
    """Create an eight-second, fast-start preview for immediate library playback."""
    handle, preview_path = tempfile.mkstemp(prefix="vivadeo_preview_", suffix=".mp4")
    os.close(handle)
    try:
        result = subprocess.run(
            [_get_ffmpeg_executable(), "-y", "-i", source_path, "-t", "8", "-map", "0:v:0?", "-map", "0:a:0?", "-vf", "scale='min(640,iw)':-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "30", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", preview_path],
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        if result.returncode or not os.path.exists(preview_path) or os.path.getsize(preview_path) == 0:
            raise RuntimeError(result.stderr[-1000:] or "ffmpeg produced no preview")
        return preview_path
    except Exception:
        try:
            os.unlink(preview_path)
        except OSError:
            pass
        raise


def _store_video_preview(store: ObjectStore, video_id: str, source_path: str) -> str:
    preview_path = _create_video_preview(source_path)
    try:
        key = video_preview_object_key(video_id)
        store.upload_file(preview_path, key, "video/mp4")
        return key
    finally:
        try:
            os.unlink(preview_path)
        except OSError:
            pass


def _maybe_store_video_preview(store: ObjectStore, video_id: str, source_path: str) -> str | None:
    try:
        return _store_video_preview(store, video_id, source_path)
    except Exception:
        logger.warning("video_preview_failed video_id=%s source=%s", video_id, source_path, exc_info=True)
        return None


def _update_job(job_id: str, **values) -> None:
    payload = None
    with session_scope() as session:
        job = session.get(Job, job_id)
        if job and job.status != "canceled":
            for key, value in values.items():
                setattr(job, key, value)
            event = {
                "at": utcnow().isoformat(),
                "status": job.status,
                "progress": job.progress,
                "message": job.message,
            }
            job.payload = dict(job.payload or {})
            events = list(job.payload.get("progress_events", []))
            if not events or events[-1] != event:
                job.payload["progress_events"] = (events + [event])[-100:]
            payload = {
                "id": job.id,
                "organization_id": job.organization_id,
                "kind": job.kind,
                "status": job.status,
                "progress": job.progress,
                "message": job.message,
                "error": job.error,
                "video_id": job.video_id,
                "clip_id": job.clip_id,
                "created_at": job.created_at.isoformat(),
                "updated_at": job.updated_at.isoformat(),
                "events": job.payload.get("progress_events", []),
                "content": job.payload.get("streamed_answer"),
            }
    if payload is None:
        return
    logger.info(
        "job_progress job_id=%s kind=%s status=%s progress=%.2f",
        payload["id"], payload["kind"], payload["status"], payload["progress"],
    )
    try:
        progress_bus.publish(f"vivadeo:job:{job_id}", json.dumps(payload, separators=(",", ":")))
    except Exception:
        logger.exception("job_progress_publish_failed job_id=%s", job_id)


def _stream_chat_answer(job_id: str, content: str) -> None:
    with session_scope() as session:
        job = session.scalar(select(Job).where(Job.id == job_id).with_for_update())
        if job is None or job.status == "canceled":
            raise JobCanceled("Answer canceled")
        job.payload = dict(job.payload or {})
        full_content = job.payload.get("streamed_answer", "") + content
        if len(full_content) > 100_000:
            raise RuntimeError("Answer exceeded the response limit")
        job.payload["streamed_answer"] = full_content
        job.message = "Writing response"
        job.progress = 0.9
    payload = {"id": job_id, "status": "running", "progress": 0.9,
               "message": "Writing response", "content": full_content}
    progress_bus.publish(f"vivadeo:job:{job_id}", json.dumps(payload, separators=(",", ":")))


def _mark_video(video_id: str, **values) -> None:
    with session_scope() as session:
        video = session.get(Video, video_id)
        if video and video.status != "canceled":
            if values.get("status") in {"failed", "canceled"} and "ready" in {video.transcript_status, video.visual_status}:
                values["status"] = "ready"
            for key, value in values.items():
                setattr(video, key, value)


def _job_canceled(job_id: str) -> bool:
    with session_scope() as session:
        job = session.get(Job, job_id)
        return job is None or job.status == "canceled"


def _raise_if_canceled(job_id: str) -> None:
    if _job_canceled(job_id):
        raise JobCanceled(f"Job canceled: {job_id}")


def _record_dlq(video_id: str, chunk_id: str, source_uri: str, start: float, end: float, error: str) -> None:
    with session_scope() as session:
        video = session.get(Video, video_id)
        if video is None:
            return
        session.add(
            DeadLetterEntry(
                organization_id=video.organization_id if video else get_settings().default_org_id,
                video_id=video_id,
                chunk_id=chunk_id,
                source_uri=source_uri,
                start_time=start,
                end_time=end,
                error=error[:2000],
                attempts=1,
            )
        )


def _transcript_object_key(video_id: str) -> str:
    return f"transcripts/{video_id}.json"


def _transcribe_file(video_id: str, organization_id: str, file_path: str, job_id: str) -> None:
    settings = get_settings()
    _mark_video(video_id, transcript_status="running")
    _update_job(job_id, status="running", progress=0.08, message="Preparing spoken content")
    logger.info("azure_transcription_start job_id=%s video_id=%s", job_id, video_id)
    segments = AzureWhisperTranscriber(
        endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        deployment=settings.azure_openai_whisper_deployment,
        api_version=settings.azure_openai_api_version,
        timeout=settings.azure_openai_whisper_timeout,
    ).transcribe(file_path)
    logger.info("azure_transcription_complete job_id=%s video_id=%s segments=%s", job_id, video_id, len(segments))
    _raise_if_canceled(job_id)
    store = ObjectStore()
    tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
    try:
        json.dump({"video_id": video_id, "segments": segments}, tmp, ensure_ascii=False)
        tmp.close()
        store.upload_file(tmp.name, _transcript_object_key(video_id), "application/json")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    _raise_if_canceled(job_id)
    with session_scope() as session:
        session.execute(
            delete(VideoTranscriptSegment).where(
                VideoTranscriptSegment.video_id == video_id,
                VideoTranscriptSegment.organization_id == organization_id,
            )
        )
        transcript_rows = [
            VideoTranscriptSegment(
                id=new_id(),
                organization_id=organization_id,
                video_id=video_id,
                start_time=float(segment["start_time"]),
                end_time=float(segment["end_time"]),
                text=str(segment["text"]),
            )
            for segment in segments
        ]
        session.add_all(transcript_rows)
        session.flush()
        video = session.get(Video, video_id)
        if video is not None:
            video.transcript_status = "embedding"
            video.error = None
    _update_job(job_id, status="running", progress=0.24, message="Spoken content transcribed")


def _embed_transcript_segments(job_id: str, video_id: str, organization_id: str, *, standalone_job: bool = False) -> None:
    settings = get_settings()
    if not settings.nvidia_embedding_api_key:
        raise RuntimeError("Spoken-content search preparation is not configured")
    with session_scope() as session:
        rows = [(row.id, row.text) for row in session.scalars(select(VideoTranscriptSegment).where(
            VideoTranscriptSegment.video_id == video_id,
            VideoTranscriptSegment.organization_id == organization_id,
            VideoTranscriptSegment.nvidia_embedding.is_(None),
        )).all()]
    embedder = get_embedder(
        backend="nvidia",
        api_key=settings.nvidia_embedding_api_key,
        base_url=settings.nvidia_embedding_base_url,
        model=settings.nvidia_embedding_model,
        timeout=settings.nvidia_embedding_timeout,
    )
    try:
        for start in range(0, len(rows), 32):
            _raise_if_canceled(job_id)
            batch = rows[start:start + 32]
            embeddings = embedder.embed_texts([text for _, text in batch], input_type="passage")
            if len(embeddings) != len(batch):
                raise RuntimeError("Incomplete spoken-content search preparation")
            _raise_if_canceled(job_id)
            with session_scope() as session:
                for (segment_id, _), embedding in zip(batch, embeddings):
                    row = session.get(VideoTranscriptSegment, segment_id)
                    if row is not None and row.organization_id == organization_id:
                        row.nvidia_embedding = embedding
            ratio = (start + len(batch)) / max(1, len(rows))
            _update_job(
                job_id,
                progress=min(0.95, ratio) if standalone_job else 0.24 + (0.16 * ratio),
                message="Improving spoken-content search" if standalone_job else f"Embedding spoken content {start + len(batch)}/{len(rows)}",
            )
        _mark_video(video_id, transcript_status="ready")
        if standalone_job:
            _update_job(job_id, status="succeeded", progress=1.0, message="Spoken-content search ready")
        else:
            _update_job(job_id, status="running", progress=0.4, message="Spoken-content search ready")
    finally:
        reset_embedder()


@celery_app.task(name="vivadeo.embed_transcript")
def embed_transcript_task(job_id: str, video_id: str, organization_id: str) -> None:
    try:
        _raise_if_canceled(job_id)
        _update_job(job_id, status="running", progress=0.1, message="Improving spoken-content search")
        _embed_transcript_segments(job_id, video_id, organization_id, standalone_job=True)
    except JobCanceled:
        return
    except Exception:
        _update_job(job_id, status="failed", error="Could not improve spoken-content search. The transcript remains available.", message="Search preparation interrupted")
        raise
def _prepare_file(video_id: str, organization_id: str, file_path: str, job_id: str) -> None:
    with session_scope() as session:
        enforce_storage_allowance(session, organization_id)
        consume_processing_allowance(session, organization_id, _get_video_duration(file_path), job_id)
    try:
        _cache_initial_keyframe(video_id, organization_id, file_path)
        try:
            _transcribe_file(video_id, organization_id, file_path, job_id)
            _embed_transcript_segments(job_id, video_id, organization_id)
        except Exception as exc:
            _mark_video(video_id, transcript_status="canceled" if isinstance(exc, JobCanceled) else "failed")
            raise
        _raise_if_canceled(job_id)
        _mark_video(video_id, visual_status="running")
        try:
            _index_file(video_id, organization_id, file_path, job_id)
            _mark_video(video_id, visual_status="ready")
        except Exception as exc:
            _mark_video(video_id, visual_status="canceled" if isinstance(exc, JobCanceled) else "failed")
            raise
    except BaseException:
        with session_scope() as session:
            refund_processing_allowance(session, organization_id, job_id)
        raise


def _cache_initial_keyframe(video_id: str, organization_id: str, file_path: str) -> None:
    """Persist a poster before expensive processing so every usable source has a Library preview."""
    with session_scope() as session:
        if session.scalar(select(VisualKeyframe.id).where(
            VisualKeyframe.video_id == video_id,
            VisualKeyframe.organization_id == organization_id,
            VisualKeyframe.status == "ready",
            VisualKeyframe.object_key.is_not(None),
        ).limit(1)):
            return
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_poster_")
    try:
        frame_path = os.path.join(tmp_dir, "0.000.jpg")
        extract_frame(file_path, 0.0, frame_path)
        object_key = visual_keyframe_object_key(video_id, "0.000")
        ObjectStore().upload_file(frame_path, object_key, "image/jpeg")
        with session_scope() as session:
            frame = session.scalar(select(VisualKeyframe).where(
                VisualKeyframe.video_id == video_id,
                VisualKeyframe.organization_id == organization_id,
                VisualKeyframe.timestamp_key == "0.000",
            ))
            if frame is None:
                frame = VisualKeyframe(id=new_id(), organization_id=organization_id, video_id=video_id, timestamp=0.0, timestamp_key="0.000")
                session.add(frame)
            frame.object_key = object_key
            frame.status = "ready"
            frame.error = None
    except Exception:
        logger.warning("initial_keyframe_cache_failed video_id=%s", video_id, exc_info=True)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _index_keyframes(video_id: str, organization_id: str, file_path: str, job_id: str, embedder=None) -> None:
    settings = get_settings()
    duration = max(0.0, _get_video_duration(file_path))
    timestamps = []
    timestamp = 0.0
    while timestamp < duration:
        timestamps.append(round(timestamp, 3))
        timestamp += settings.keyframe_interval
    if not timestamps:
        timestamps.append(0.0)

    store = ObjectStore()
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_keyframes_")
    try:
        with session_scope() as session:
            old_keys = list(session.scalars(select(VisualKeyframe.object_key).where(VisualKeyframe.video_id == video_id, VisualKeyframe.organization_id == organization_id)).all())
            session.execute(delete(VisualKeyframe).where(VisualKeyframe.video_id == video_id, VisualKeyframe.organization_id == organization_id))
        for key in old_keys:
            if key:
                try:
                    store.delete_object(key)
                except Exception:
                    logger.warning("visual_keyframe_delete_failed video_id=%s key=%s", video_id, key)

        total = len(timestamps)
        frame_paths = []
        for index, timestamp in enumerate(timestamps, 1):
            _raise_if_canceled(job_id)
            timestamp_key = f"{timestamp:.3f}"
            frame_path = os.path.join(tmp_dir, f"{timestamp_key}.jpg")
            extract_frame(file_path, timestamp, frame_path)
            frame_paths.append(frame_path)
            _update_job(
                job_id,
                status="running",
                progress=min(0.9, 0.82 + (0.06 * index / total)),
                message=f"Extracting visual keyframe {index}/{total}",
            )
        poses = []
        with session_scope() as session:
            job = session.get(Job, job_id)
            needs_face_orientation = bool((job.payload or {}).get("detect_faces")) if job else False
        detect_head_poses = getattr(embedder, "detect_head_poses", None)
        if needs_face_orientation and detect_head_poses is not None:
            _update_job(job_id, status="running", progress=0.9, message="Detecting face orientation")
            try:
                poses = detect_head_poses(frame_paths)
            except Exception:
                logger.exception("head_pose_detection_failed video_id=%s", video_id)
        if len(poses) != len(frame_paths):
            poses = [{"pose": "unknown", "facing_camera": None, "confidence": 0.0, "reason": "detection-unavailable"}] * len(frame_paths)
        keyframe_embeddings: list[list[float] | None] = [None] * len(frame_paths)
        if settings.visual_embedding_backend == "nvidia" and hasattr(embedder, "embed_images"):
            try:
                _update_job(job_id, status="running", progress=0.9, message="Embedding visual keyframes")
                keyframe_embeddings = embedder.embed_images(frame_paths, verbose=False)
            except Exception:
                logger.exception("keyframe_embedding_failed video_id=%s", video_id)
        for index, (timestamp, frame_path, pose) in enumerate(zip(timestamps, frame_paths, poses), 1):
            _raise_if_canceled(job_id)
            timestamp_key = f"{timestamp:.3f}"
            object_key = visual_keyframe_object_key(video_id, timestamp_key)
            store.upload_file(frame_path, object_key, "image/jpeg")
            with session_scope() as session:
                session.add(VisualKeyframe(
                    id=new_id(),
                    organization_id=organization_id,
                    video_id=video_id,
                    timestamp=timestamp,
                    timestamp_key=timestamp_key,
                    object_key=object_key,
                    embedding=keyframe_embeddings[index - 1],
                    pose=pose.get("pose", "unknown"),
                    pose_confidence=float(pose.get("confidence", 0.0)),
                    pose_metadata=pose,
                    status="ready",
                ))
            _update_job(
                job_id,
                status="running",
                progress=min(0.98, 0.9 + (0.08 * index / total)),
                message=f"Caching visual keyframe {index}/{total}",
            )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


def _index_file(video_id: str, organization_id: str, file_path: str, job_id: str) -> None:
    settings = get_settings()
    visual_backend = settings.visual_embedding_backend
    if visual_backend == "nvidia" and settings.nvidia_embedding_api_key:
        embedder = get_embedder(
            backend="nvidia",
            api_key=settings.nvidia_embedding_api_key,
            base_url=settings.nvidia_embedding_base_url,
            model=settings.nvidia_visual_embedding_model,
            timeout=settings.nvidia_embedding_timeout,
        )
        visual_model = settings.nvidia_visual_embedding_model
    else:
        visual_backend = "modal"
        embedder = get_embedder(
            app_name=settings.modal_app,
            cls_name=settings.modal_class,
            timeout=settings.modal_timeout,
        )
        visual_model = "Qwen/Qwen3-VL-Embedding-2B"
    chunks = chunk_video(
        file_path,
        chunk_duration=settings.chunk_duration,
        overlap=settings.chunk_overlap,
    )
    files_to_cleanup: list[str] = []
    try:
        total = len(chunks) or 1
        batch: list[dict] = []
        stored_count = 0
        failed_count = 0

        def flush_batch() -> int:
            nonlocal stored_count
            if not batch:
                return 0
            logger.info("visual_embedding_start backend=%s job_id=%s video_id=%s batch=%s", visual_backend, job_id, video_id, len(batch))
            embeddings = embedder.embed_video_chunks(
                [item["embed_path"] for item in batch],
                verbose=False,
            )
            if len(embeddings) != len(batch):
                raise RuntimeError("Incomplete visual search preparation")
            logger.info("visual_embedding_complete backend=%s job_id=%s video_id=%s batch=%s", visual_backend, job_id, video_id, len(embeddings))
            with session_scope() as session:
                store = PostgresVideoStore(session)
                for item, embedding in zip(batch, embeddings):
                    store.add_chunk(
                        video_id=video_id,
                        organization_id=organization_id,
                        start_time=item["start_time"],
                        end_time=item["end_time"],
                        embedding=embedding if visual_backend == "modal" else None,
                        metadata={"source_file": file_path},
                        embedding_backend=visual_backend,
                        embedding_model=visual_model,
                        visual_embedding=embedding if visual_backend == "nvidia" else None,
                    )
            stored = len(batch)
            stored_count += stored
            batch.clear()
            return stored

        processed = 0
        for chunk in chunks:
            _raise_if_canceled(job_id)
            chunk_path = chunk["chunk_path"]
            files_to_cleanup.append(chunk_path)
            processed += 1
            _update_job(
                job_id,
                status="running",
                progress=0.45 + 0.35 * processed / total,
                message=f"Preparing visual evidence {processed}/{len(chunks)}",
            )

            if settings.skip_still and processed > 1 and is_still_frame_chunk(chunk_path):
                continue

            embed_path = chunk_path
            if settings.preprocess:
                embed_path = preprocess_chunk(
                    chunk_path,
                    target_resolution=settings.target_resolution,
                    target_fps=settings.target_fps,
                )
                if embed_path != chunk_path:
                    files_to_cleanup.append(embed_path)

            batch.append(
                {
                    "chunk_id": f"{video_id}:{chunk['start_time']}",
                    "embed_path": embed_path,
                    "start_time": chunk["start_time"],
                    "end_time": chunk["end_time"],
                }
            )
            if len(batch) >= settings.batch_size:
                try:
                    _raise_if_canceled(job_id)
                    flush_batch()
                except Exception as exc:
                    if isinstance(exc, JobCanceled) or _job_canceled(job_id):
                        raise JobCanceled(f"Job canceled: {job_id}") from exc
                    failed_count += len(batch)
                    for item in batch:
                        _record_dlq(
                            video_id,
                            item["chunk_id"],
                            file_path,
                            item["start_time"],
                            item["end_time"],
                            repr(exc),
                        )
                    batch.clear()
        if batch:
            try:
                _raise_if_canceled(job_id)
                flush_batch()
            except Exception as exc:
                if isinstance(exc, JobCanceled) or _job_canceled(job_id):
                    raise JobCanceled(f"Job canceled: {job_id}") from exc
                failed_count += len(batch)
                for item in batch:
                    _record_dlq(
                        video_id,
                        item["chunk_id"],
                        file_path,
                        item["start_time"],
                        item["end_time"],
                        repr(exc),
                    )
                batch.clear()
        if stored_count == 0:
            raise RuntimeError(f"No visual embeddings were prepared ({failed_count} failed chunk attempt(s)).")
        _update_job(job_id, status="running", progress=0.82, message="Caching visual keyframes")
        _index_keyframes(video_id, organization_id, file_path, job_id, embedder)
    finally:
        reset_embedder()
        for path in files_to_cleanup:
            try:
                os.unlink(path)
            except OSError:
                pass
        if chunks:
            shutil.rmtree(os.path.dirname(chunks[0]["chunk_path"]), ignore_errors=True)


@celery_app.task(name="vivadeo.ingest_local_path")
def ingest_local_path(job_id: str, video_id: str, organization_id: str, path: str) -> None:
    try:
        _raise_if_canceled(job_id)
        _update_job(job_id, status="running", progress=0.02, message="Uploading original")
        store = ObjectStore()
        with session_scope() as session:
            video = session.get(Video, video_id)
            if video is None:
                raise RuntimeError(f"Video not found: {video_id}")
            object_key = video_object_key(video_id, video.filename)
            store.upload_file(path, object_key, video.content_type)
            video.object_key = object_key
            video.preview_object_key = _maybe_store_video_preview(store, video_id, path)
            video.duration = _get_video_duration(path)
            video.status = "indexing"

        _raise_if_canceled(job_id)
        _prepare_file(video_id, organization_id, path, job_id)
        _mark_video(video_id, status="ready", error=None)
        _update_job(job_id, status="succeeded", progress=1.0, message="Evidence ready")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=True)
    except JobCanceled:
        _mark_video(video_id, status="canceled", error="Canceled by user")
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        _mark_video(video_id, status="failed", error=str(exc))
        _update_job(job_id, status="failed", error=str(exc), message="Failed")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=False)
        raise


@celery_app.task(name="vivadeo.ingest_uploaded_object")
def ingest_uploaded_object(job_id: str, video_id: str, organization_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_upload_")
    try:
        _raise_if_canceled(job_id)
        store = ObjectStore()
        with session_scope() as session:
            video = session.get(Video, video_id)
            if video is None or not video.object_key:
                raise RuntimeError(f"Video object not found: {video_id}")
            local_path = os.path.join(tmp_dir, video.filename)
            object_key = video.object_key
        _update_job(job_id, status="running", progress=0.05, message="Downloading original")
        store.download_file(object_key, local_path)
        _raise_if_canceled(job_id)
        _mark_video(video_id, status="indexing", duration=_get_video_duration(local_path))
        _prepare_file(video_id, organization_id, local_path, job_id)
        _mark_video(video_id, status="ready", error=None)
        _update_job(job_id, status="succeeded", progress=1.0, message="Indexed")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=True)
    except JobCanceled:
        _mark_video(video_id, status="canceled", error="Canceled by user")
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        _mark_video(video_id, status="failed", error=str(exc))
        _update_job(job_id, status="failed", error=str(exc), message="Failed")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=False)
        raise
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@celery_app.task(name="vivadeo.ingest_url")
def ingest_url(job_id: str, video_id: str, organization_id: str, url: str, max_height: int = 480) -> None:
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_url_")
    try:
        _raise_if_canceled(job_id)
        _update_job(job_id, status="running", progress=0.02, message="Downloading URL")
        path = download_video_url(url, output_dir=tmp_dir, max_height=max_height)
        filename = Path(path).name
        store = ObjectStore()
        object_key = video_object_key(video_id, filename)
        store.upload_file(path, object_key, "video/mp4")
        with session_scope() as session:
            video = session.get(Video, video_id)
            if video is None:
                raise RuntimeError(f"Video not found: {video_id}")
            video.filename = filename
            video.object_key = object_key
            video.preview_object_key = _maybe_store_video_preview(store, video_id, path)
            video.duration = _get_video_duration(path)
            video.status = "indexing"
        _raise_if_canceled(job_id)
        _prepare_file(video_id, organization_id, path, job_id)
        _mark_video(video_id, status="ready", error=None)
        _update_job(job_id, status="succeeded", progress=1.0, message="Evidence ready")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=True)
    except JobCanceled:
        _mark_video(video_id, status="canceled", error="Canceled by user")
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        _mark_video(video_id, status="failed", error=str(exc))
        _update_job(job_id, status="failed", error=str(exc), message="Failed")
        notify_ingest_outcome(job_id=job_id, video_id=video_id, organization_id=organization_id, succeeded=False)
        raise
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@celery_app.task(bind=True, name="vivadeo.generate_chat", max_retries=1800)
def generate_chat_task(
    self,
    job_id: str,
    thread_id: str,
    message_id: str,
    organization_id: str,
    request_payload: dict,
) -> None:
    from celery.exceptions import Retry
    from .preparation import EvidencePreparationError, ensure_chat_evidence, plan_chat_evidence

    try:
        _raise_if_canceled(job_id)
        request_payload = dict(request_payload)
        if request_payload.get("provider") in {"custom", "openai", "anthropic", "gemini", "nvidia"}:
            request_payload["custom_api_key"] = progress_bus.get(f"vivadeo:chat-key:{job_id}")
        with session_scope() as session:
            request_payload = plan_chat_evidence(session, job_id, organization_id, thread_id, request_payload)
            dependencies = ensure_chat_evidence(session, organization_id, thread_id, request_payload)
        if dependencies:
            _update_job(job_id, status="queued", progress=0.05, message="Preparing the evidence needed for your question")
            raise self.retry(countdown=2)
        _update_job(job_id, status="running", progress=0.1, message="Preparing a reply")
        from .api import _complete_chat_message
        from .schemas import ChatMessageRequest

        _raise_if_canceled(job_id)
        if request_payload.get("search_mode") == "all":
            _update_job(job_id, status="running", progress=0.12, message="Scanning all available evidence")
        elif request_payload.get("output_format") in {"rows", "comparison"}:
            _update_job(job_id, status="running", progress=0.12, message="Preparing structured evidence")
        else:
            _update_job(
                job_id,
                status="running",
                progress=0.12,
                message="Writing a reply" if request_payload.get("conversation_only") else "Starting search",
            )
        report_progress = lambda progress, message: _update_job(job_id, status="running", progress=progress, message=message)
        request_payload = dict(request_payload)
        if request_payload.get("provider") in {"custom", "openai", "anthropic", "gemini", "nvidia"}:
            request_payload["custom_api_key"] = progress_bus.get(f"vivadeo:chat-key:{job_id}")
            progress_bus.delete(f"vivadeo:chat-key:{job_id}")
        with session_scope() as session:
            thread = _complete_chat_message(
                session=session,
                organization_id=organization_id,
                thread_id=thread_id,
                message_id=message_id,
                request=ChatMessageRequest.model_validate(request_payload),
                progress_callback=report_progress,
                on_delta=lambda content: _stream_chat_answer(job_id, content),
            )
        if _job_canceled(job_id):
            with session_scope() as session:
                message = session.get(ChatThreadMessage, message_id)
                if message:
                    message.status = "canceled"
                    message.error = "Canceled by user"
            _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
            return
        _update_job(job_id, status="succeeded", progress=1.0, message="Answer ready")
    except Retry:
        raise
    except EvidencePreparationError as exc:
        with session_scope() as session:
            message = session.get(ChatThreadMessage, message_id)
            if message:
                message.status = "failed"
                message.error = str(exc)
        _update_job(job_id, status="failed", error=str(exc), message="Video preparation interrupted")
    except JobCanceled:
        with session_scope() as session:
            message = session.get(ChatThreadMessage, message_id)
            if message:
                message.status = "canceled"
                message.error = "Canceled by user"
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        canceled = _job_canceled(job_id)
        with session_scope() as session:
            message = session.get(ChatThreadMessage, message_id)
            if message:
                message.status = "canceled" if canceled else "failed"
                message.error = "Canceled by user" if canceled else "Vivadeo could not finish the answer. Please try again."
        progress_bus.delete(f"vivadeo:chat-key:{job_id}")
        if canceled:
            return
        _update_job(job_id, status="failed", error="Answer generation failed.", message="Answer generation failed")
        raise


@celery_app.task(name="vivadeo.extract_evidence_frame")
def extract_evidence_frame_task(job_id: str, frame_id: str, organization_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_frame_")
    try:
        _raise_if_canceled(job_id)
        store = ObjectStore()
        with session_scope() as session:
            frame = session.get(EvidenceFrame, frame_id)
            if frame is None or frame.organization_id != organization_id:
                raise RuntimeError(f"Evidence frame not found: {frame_id}")
            video = session.get(Video, frame.video_id)
            if video is None or video.organization_id != organization_id or not video.object_key:
                raise RuntimeError(f"Video object not found for frame: {frame_id}")
            local_video = os.path.join(tmp_dir, video.filename)
            local_frame = os.path.join(tmp_dir, f"{frame.id}.jpg")
            object_key = video.object_key
            timestamp = frame.timestamp

        _update_job(job_id, status="running", progress=0.2, message="Downloading source")
        store.download_file(object_key, local_video)
        _raise_if_canceled(job_id)
        _update_job(job_id, status="running", progress=0.7, message="Extracting evidence frame")
        extract_frame(local_video, timestamp, local_frame)
        _raise_if_canceled(job_id)
        frame_key = evidence_frame_object_key(frame_id)
        store.upload_file(local_frame, frame_key, "image/jpeg")
        with session_scope() as session:
            frame = session.get(EvidenceFrame, frame_id)
            if frame:
                frame.object_key = frame_key
                frame.status = "ready"
                frame.error = None
        _update_job(job_id, status="succeeded", progress=1.0, message="Evidence frame ready")
    except JobCanceled:
        with session_scope() as session:
            frame = session.get(EvidenceFrame, frame_id)
            if frame:
                frame.status = "canceled"
                frame.error = "Canceled by user"
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        with session_scope() as session:
            frame = session.get(EvidenceFrame, frame_id)
            if frame:
                frame.status = "failed"
                frame.error = str(exc)
        _update_job(job_id, status="failed", error=str(exc), message="Frame extraction failed")
        raise
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


@celery_app.task(name="vivadeo.trim_clip")
def trim_clip_task(job_id: str, clip_id: str, organization_id: str) -> None:
    tmp_dir = tempfile.mkdtemp(prefix="vivadeo_clip_")
    try:
        _raise_if_canceled(job_id)
        store = ObjectStore()
        with session_scope() as session:
            clip = session.get(Clip, clip_id)
            if clip is None:
                raise RuntimeError(f"Clip not found: {clip_id}")
            video = session.get(Video, clip.video_id)
            if video is None or not video.object_key:
                raise RuntimeError(f"Video object not found for clip: {clip_id}")
            local_video = os.path.join(tmp_dir, video.filename)
            local_clip = os.path.join(tmp_dir, f"{clip.id}.mp4")
            object_key = video.object_key
            start_time = clip.start_time
            end_time = clip.end_time

        _update_job(job_id, status="running", progress=0.2, message="Downloading source")
        store.download_file(object_key, local_video)
        _raise_if_canceled(job_id)
        trim_clip(local_video, start_time, end_time, local_clip)
        clip_key = clip_object_key(clip_id)
        store.upload_file(local_clip, clip_key, "video/mp4")
        with session_scope() as session:
            clip = session.get(Clip, clip_id)
            if clip:
                clip.object_key = clip_key
                clip.status = "ready"
        _update_job(job_id, status="succeeded", progress=1.0, message="Clip ready")
    except JobCanceled:
        with session_scope() as session:
            clip = session.get(Clip, clip_id)
            if clip:
                clip.status = "canceled"
                clip.error = "Canceled by user"
        _update_job(job_id, status="canceled", progress=0.0, message="Canceled by user", error=None)
    except Exception as exc:
        with session_scope() as session:
            clip = session.get(Clip, clip_id)
            if clip:
                clip.status = "failed"
                clip.error = str(exc)
        _update_job(job_id, status="failed", error=str(exc), message="Failed")
        raise
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)
