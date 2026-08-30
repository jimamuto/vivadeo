"""Small deterministic result builders for chat workflow outputs."""

from __future__ import annotations

from collections import defaultdict


def extraction_rows(citations: list[dict], extraction_type: str | None) -> list[dict]:
    """Turn grounded evidence into replayable rows without inventing facts."""
    rows = []
    for citation in citations:
        item = (citation.get("text") or citation.get("match_reason") or "Evidence moment").strip()
        rows.append({
            "item": item[:500],
            "source": citation.get("filename", "video"),
            "video_id": citation["video_id"],
            "start_time": citation["start_time"],
            "end_time": citation["end_time"],
            "confidence": citation.get("confidence", 0.0),
            "verification_status": "verified" if citation.get("verification_status") == "verified" else "possible",
            "evidence_key": f"{citation['video_id']}:{citation['start_time']:.3f}-{citation['end_time']:.3f}",
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
