"""Durable, workspace-scoped preparation dependencies for chat."""
from sqlalchemy import select

from .chat_accuracy import route_chat_intent
from .db import ChatThread, Job, Video, new_id
from .evidence_tools import EvidenceTool, choose_evidence_tool


def plan_chat_evidence(session, job_id: str, organization_id: str, thread_id: str, request: dict) -> dict:
    """Select once per durable chat job; model output cannot change authorization."""
    from .api import _chat_generator
    from .schemas import ChatMessageRequest
    from .db import OrganizationSetting
    from .secrets import decrypt_secret

    job = session.get(Job, job_id)
    thread = session.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.organization_id == organization_id))
    if job is None or thread is None:
        raise EvidencePreparationError("Chat is no longer available.")
    scope = set(request.get("video_ids") or []) | set(request.get("comparison_video_ids") or [])
    scope.update(value for value in (request.get("video_id"), request.get("focus_video_id")) if value)
    attached = {source.video_id for source in thread.sources}
    if scope - attached:
        raise EvidencePreparationError("Requested videos are not attached to this chat.")
    scope = scope or attached
    if not scope:
        return request
    if len(scope) > 20:
        raise EvidencePreparationError("Choose at most 20 videos for one question.")
    saved = (job.payload or {}).get("evidence_tool")
    if saved:
        tool = EvidenceTool.model_validate(saved)
    else:
        configured = session.get(OrganizationSetting, organization_id)
        settings = (configured.settings or {}).get("llm", {}) if configured else {}
        resolved = dict(request)
        if request.get("provider") != "vivadeo-auto":
            for key, stored in (("custom_base_url", "base_url"), ("custom_model", "model")):
                resolved[key] = resolved.get(key) or settings.get(stored)
            resolved["custom_api_key"] = resolved.get("custom_api_key") or decrypt_secret(settings.get("api_key"))
        generator = _chat_generator(ChatMessageRequest.model_validate(resolved), session, organization_id)
        session.commit()
        tool = choose_evidence_tool(request.get("content", ""), modality=request.get("modality", "auto"), focus_start=request.get("focus_start_time"), focus_end=request.get("focus_end_time"), source_count=1 if request.get("focus_video_id") else len(scope), generator=generator)
        session.refresh(job)
        if job.status == "canceled":
            raise EvidencePreparationError("Answer canceled.")
        job.payload = {**(job.payload or {}), "evidence_tool": tool.model_dump()}
        session.commit()
    result = {**request, "_evidence_tool": tool.tool, "modality": "transcript" if tool.tool == "search_transcript" else ("hybrid" if tool.include_speech else "visual")}
    if tool.tool == "inspect_moment":
        if not request.get("focus_video_id") and len(scope) != 1:
            raise EvidencePreparationError("Focus one video to inspect a timestamp.")
        result.update(focus_video_id=request.get("focus_video_id") or next(iter(scope)), focus_start_time=tool.start_time, focus_end_time=tool.end_time, search_mode="focused")
    return result


class EvidencePreparationError(RuntimeError):
    pass


def ensure_chat_evidence(session, organization_id: str, thread_id: str, request: dict) -> list[str]:
    """Return pending job IDs; reuse work under a per-video database lock."""
    thread = session.scalar(select(ChatThread).where(ChatThread.id == thread_id, ChatThread.organization_id == organization_id))
    if thread is None:
        raise EvidencePreparationError("Chat is no longer available.")
    attached = {source.video_id for source in thread.sources}
    requested = set(request.get("video_ids") or []) | set(request.get("comparison_video_ids") or [])
    requested.update(value for value in (request.get("video_id"), request.get("focus_video_id")) if value)
    if requested - attached:
        raise EvidencePreparationError("Requested videos are not attached to this chat.")
    scope = [request["focus_video_id"]] if request.get("focus_video_id") else sorted(requested or attached)
    intent = route_chat_intent(request.get("content", ""), modality_override=request.get("modality"))
    inspect = request.get("_evidence_tool") == "inspect_moment"
    required = ["transcript"] if intent["modality"] == "transcript" else ([] if inspect else ["visual"])
    if intent["modality"] == "hybrid":
        required.append("transcript")
    if "visual" in required:
        from math import ceil
        from .config import get_settings
        durations = session.scalars(select(Video.duration).where(Video.organization_id == organization_id, Video.id.in_(scope))).all()
        if sum(ceil((duration or 0) / get_settings().keyframe_interval) for duration in durations) > 720:
            raise EvidencePreparationError("This visual search is too broad. Focus a shorter time range or choose fewer videos.")
    pending = []
    dispatch = []
    for video_id in scope:
        video = session.scalar(select(Video).where(Video.id == video_id, Video.organization_id == organization_id).with_for_update())
        if video is None or video.status == "archived":
            raise EvidencePreparationError("A requested video is no longer available.")
        missing = [stage for stage in required if getattr(video, f"{stage}_status") != "ready"]
        if not missing and (not inspect or video.object_key):
            if inspect:
                from .api import request_evidence_frame
                from .schemas import EvidenceFrameRequest
                start, end = request["focus_start_time"], request["focus_end_time"]
                if video.duration is not None and start >= video.duration:
                    raise EvidencePreparationError("The requested timestamp is beyond the video.")
                end = min(end, video.duration) if video.duration is not None else end
                # A focused timestamp needs one representative frame, not a whole-video index.
                frame = request_evidence_frame(video.id, EvidenceFrameRequest(timestamp=(start + end) / 2), session=session, organization_id=organization_id)
                for frame in [frame]:
                    if frame.status != "ready":
                        if frame.job_id:
                            pending.append(frame.job_id)
                        else:
                            raise EvidencePreparationError("A requested frame could not be prepared.")
            continue
        if video.status == "canceled" or any(getattr(video, f"{stage}_status") in {"failed", "canceled"} for stage in missing):
            raise EvidencePreparationError("Video preparation was interrupted. Retry preparation before asking again.")
        active = session.scalars(select(Job).where(Job.video_id == video_id, Job.organization_id == organization_id, Job.kind.in_(["ingest_uploaded_object", "ingest_local_path", "ingest_url"]), Job.status.in_(["queued", "running"]))).all()
        if active:
            pending.extend(job.id for job in active)
            continue
        if not video.object_key:
            raise EvidencePreparationError("The video upload has not completed.")
        job = Job(id=new_id(), organization_id=organization_id, video_id=video_id, kind="ingest_uploaded_object", status="queued", payload={"transcribe": "transcript" in missing, "prepare_visual": "visual" in missing, "detect_faces": "faces_camera" in intent["visual_predicates"]}, message="Preparing requested evidence")
        session.add(job)
        for stage in missing:
            setattr(video, f"{stage}_status", "queued")
        pending.append(job.id)
        dispatch.append((job.id, video.id, organization_id))
    session.commit()
    from .worker import ingest_uploaded_object
    for args in dispatch:
        ingest_uploaded_object.apply_async(args=args, queue="evidence")
    return pending
