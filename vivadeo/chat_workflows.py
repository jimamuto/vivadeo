"""Evidence-linked result builders for chat workflow outputs."""

from __future__ import annotations

import json
from collections import defaultdict


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
