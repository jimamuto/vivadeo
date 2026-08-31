"""Evidence-linked result builders for chat workflow outputs."""

from __future__ import annotations

import json
from collections import defaultdict


def merge_evidence_ranges(
    citations: list[dict],
    *,
    gap_seconds: float = 4.0,
    max_duration: float = 45.0,
    max_ranges: int | None = 3,
) -> list[dict]:
    """Merge nearby evidence from the same video without joining distinct claims."""
    ranked = [{**citation, "_rank": index} for index, citation in enumerate(citations)]
    ranked.sort(key=lambda item: (item["video_id"], item.get("modality"), item.get("verification_status"), item["start_time"], item["end_time"]))
    merged: list[dict] = []
    for citation in ranked:
        previous = merged[-1] if merged else None
        can_merge = bool(
            previous
            and previous["video_id"] == citation["video_id"]
            and previous.get("modality") == citation.get("modality")
            and previous.get("verification_status") == citation.get("verification_status")
            and citation["start_time"] <= previous["end_time"] + gap_seconds
            and max(previous["end_time"], citation["end_time"]) - previous["start_time"] <= max_duration
        )
        if not can_merge:
            merged.append(citation)
            continue
        previous["end_time"] = max(previous["end_time"], citation["end_time"])
        previous["start_time"] = min(previous["start_time"], citation["start_time"])
        previous["_rank"] = min(previous["_rank"], citation["_rank"])
        previous["similarity_score"] = max(previous.get("similarity_score") or 0.0, citation.get("similarity_score") or 0.0)
        previous["confidence"] = max(previous.get("confidence") or 0.0, citation.get("confidence") or 0.0)
        texts = [text.strip() for text in (previous.get("text", ""), citation.get("text", "")) if text and text.strip()]
        previous["text"] = " ".join(dict.fromkeys(texts))

    merged.sort(key=lambda item: item["_rank"])
    for item in merged:
        item.pop("_rank")
    return merged if max_ranges is None else merged[:max_ranges]


def extraction_rows(citations: list[dict], model_output: str) -> list[dict]:
    """Validate model-extracted items and attach each one to known evidence."""
    try:
        payload = model_output.strip()
        if payload.startswith("```"):
            payload = payload.split("\n", 1)[1].rsplit("```", 1)[0]
        parsed = json.loads(payload)
        items = parsed.get("rows", []) if isinstance(parsed, dict) else parsed
    except (AttributeError, json.JSONDecodeError, IndexError):
        return []

    rows = []
    seen = set()
    for extracted in items if isinstance(items, list) else []:
        if not isinstance(extracted, dict) or not isinstance(extracted.get("item"), str):
            continue
        evidence_index = extracted.get("evidence_index")
        if isinstance(evidence_index, bool) or not isinstance(evidence_index, int) or not 0 <= evidence_index < len(citations):
            continue
        citation = citations[evidence_index]
        item = " ".join(extracted["item"].split())[:500]
        evidence_key = f"{citation['video_id']}:{citation['start_time']:.3f}-{citation['end_time']:.3f}"
        if not item or (item, evidence_key) in seen:
            continue
        seen.add((item, evidence_key))
        rows.append({
            "item": item,
            "source": citation.get("filename", "video"),
            "video_id": citation["video_id"],
            "start_time": citation["start_time"],
            "end_time": citation["end_time"],
            "confidence": citation.get("confidence", 0.0),
            "verification_status": "verified" if citation.get("verification_status") == "verified" else "possible",
            "evidence_key": evidence_key,
        })
    return rows


def comparison_claims(citations: list[dict], answer: str) -> list[dict]:
    """Keep comparison claims tied to evidence from both sides."""
    by_video = defaultdict(list)
    for citation in citations:
        by_video[citation["video_id"]].append(citation)
    if len(by_video) < 2:
        return []
    videos = list(by_video)
    return [{
        "claim": answer.strip()[:1000],
        "confidence": min(item.get("confidence", 0.0) for values in by_video.values() for item in values),
        "left_citations": [by_video[videos[0]][0]],
        "right_citations": [by_video[videos[1]][0]],
    }]
