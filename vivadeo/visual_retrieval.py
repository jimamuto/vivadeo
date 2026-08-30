"""Small, query-time visual reranking helpers.

Chunk embeddings are candidate retrieval only. These helpers compare the query
embedding with sampled frame embeddings so visual questions are not represented
by an entire chunk's first frame.
"""

from __future__ import annotations

import math
import re


_VISUAL_PATTERNS = (
    r"\bface(?:s|d|ing)?\b",
    r"\bfacing\b",
    r"\blook(?:s|ed|ing)?\b",
    r"\beye contact\b",
    r"\bgesture\w*\b",
    r"\bwave\w*\b",
    r"\bhold(?:s|ing)?\b",
    r"\bshow(?:s|ed|ing)?\b",
    r"\bappear(?:s|ed|ing)?\b",
    r"\bvisible\b",
    r"\bwear(?:s|ing)?\b",
    r"\bcolor\b",
    r"\bbackground\b",
    r"\bobject\b",
    r"\benter(?:s|ed|ing)?\b",
    r"\bleave(?:s|d|ing)?\b",
    r"\bsee\b",
    r"\bseen\b",
)


def is_visual_query(question: str) -> bool:
    """Return whether a question asks about what appears in the video."""
    normalized = " ".join(question.lower().split())
    return any(re.search(pattern, normalized) for pattern in _VISUAL_PATTERNS)


def sample_timestamps(start_time: float, end_time: float, count: int = 5) -> list[float]:
    """Return evenly spaced, de-duplicated timestamps inside a range."""
    start = max(0.0, float(start_time))
    end = max(start, float(end_time))
    if count <= 1 or end == start:
        return [start]
    step = (end - start) / count
    values = [start + (step * index) for index in range(count)]
    return list(dict.fromkeys(round(value, 3) for value in values))


def cosine_similarity(left: list[float], right: list[float]) -> float:
    """Calculate cosine similarity without adding a numerical dependency."""
    if len(left) != len(right) or not left:
        return -1.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if not left_norm or not right_norm:
        return -1.0
    return dot / (left_norm * right_norm)


def rank_frame_candidates(query_embedding: list[float], candidates: list[dict]) -> list[dict]:
    """Attach query/frame scores and return strongest visual candidates first."""
    ranked = []
    for candidate in candidates:
        score = cosine_similarity(query_embedding, candidate["embedding"])
        if score < 0:
            continue
        ranked.append({**candidate, "similarity_score": score})
    ranked.sort(key=lambda item: item["similarity_score"], reverse=True)
    return ranked
