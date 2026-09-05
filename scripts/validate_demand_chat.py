"""Exercise real ingest, dependency resume, streaming and focused evidence locally.

Usage: uv run python scripts/validate_demand_chat.py --video path/to/test.mp4
Creates only temporary test videos/threads; deletes them in finally.
"""
import argparse
import json
import time
from pathlib import Path

import httpx

from vivadeo.config import get_settings


def run(video_path: Path, base_url: str) -> None:
    settings = get_settings()
    headers = {"X-API-Key": settings.api_key}
    with httpx.Client(base_url=base_url, headers=headers, timeout=120) as client:
        workspaces = client.get("/v1/workspaces")
        workspaces.raise_for_status()
        workspace = next(iter(workspaces.json()))
        client.headers["X-Workspace-ID"] = workspace["id"]
        thread_id = video_id = None
        try:
            response = client.post("/v1/chat/threads", json={"title": "Temporary demand-driven validation"})
            response.raise_for_status()
            thread_id = response.json()["id"]
            started = time.monotonic()
            with video_path.open("rb") as source:
                response = client.post("/v1/videos/upload", files={"file": (video_path.name, source, "video/mp4")}, data={"thread_id": thread_id, "transcribe": "true"})
            response.raise_for_status()
            ingest = response.json()
            video_id = ingest["video_id"]
            print(json.dumps({"stage": "uploaded", "seconds": round(time.monotonic() - started, 2)}), flush=True)
            for question, focused in [
                ("What does the speaker say about the markets?", False),
                ("What is visible at 00:03?", True),
            ]:
                began = time.monotonic()
                response = client.post(f"/v1/chat/threads/{thread_id}/messages", json={"content": question, "provider": "vivadeo-auto", "video_ids": [video_id]})
                response.raise_for_status()
                job_id = response.json()["id"]
                first_content = None
                waiting = False
                completed = False
                with client.stream("GET", f"/v1/jobs/{job_id}/events", timeout=600) as stream:
                    stream.raise_for_status()
                    for line in stream.iter_lines():
                        if not line.startswith("data:"):
                            continue
                        event = json.loads(line[5:])
                        waiting |= "evidence needed" in (event.get("message") or "")
                        if event.get("content") and first_content is None:
                            first_content = time.monotonic() - began
                        if event.get("status") in {"succeeded", "failed", "canceled"}:
                            assert event["status"] == "succeeded", event.get("error")
                            completed = True
                            break
                assert completed, "Chat did not complete"
                if not focused:
                    assert first_content is not None, "Generated answers must stream real content"
                response = client.get(f"/v1/chat/threads/{thread_id}")
                response.raise_for_status()
                thread = response.json()
                message = next(item for item in thread["messages"] if item["id"] == thread["current_message_id"])
                assert message["status"] == "completed" and message["citations"], message
                details = client.get(f"/v1/videos/{video_id}").json()
                assert details["transcript_status"] == "ready"
                assert details["visual_status"] == "pending", "Focused inspection must not build a full visual index"
                chunks = client.get(f"/v1/videos/{video_id}/chunks").json()
                assert chunks == [], "Transcript and focused questions must not require video chunks"
                print(json.dumps({"stage": "focused_visual" if focused else "transcript_answer", "seconds": round(time.monotonic() - began, 2), "first_content_seconds": round(first_content, 2) if first_content is not None else None, "waited_for_evidence": waiting, "citations": len(message["citations"]), "full_visual_index": False}), flush=True)
        finally:
            if thread_id:
                response = client.delete(f"/v1/chat/threads/{thread_id}")
                response.raise_for_status()
            if video_id:
                response = client.delete(f"/v1/videos/{video_id}")
                response.raise_for_status()
            print(json.dumps({"stage": "cleanup", "completed": True}), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--base-url", default="http://localhost:8000")
    args = parser.parse_args()
    run(args.video, args.base_url)
