"""Deterministic chat intent and evidence-contract helpers."""

from __future__ import annotations

import re
from typing import Literal, TypedDict

Modality = Literal["visual", "transcript", "hybrid"]
SearchMode = Literal["top", "all", "focused"]
VerificationStatus = Literal["verified", "possible", "rejected"]

_VISUAL_RULES: tuple[tuple[str, str], ...] = (
    (r"\bface(?:s|d|ing)?\b|\bfacing\b|\bdirect eye contact\b|\beye contact\b", "faces_camera"),
    (r"\blook(?:s|ed|ing)?\b|\bwatch(?:es|ed|ing)?\b", "looking"),
    (r"\bgesture\w*\b|\bwave\w*\b|\bpoint(?:s|ed|ing)?\b", "gesture"),
    (r"\bhold(?:s|ing)?\b|\bcarry(?:ing|ies)?\b", "holding_object"),
    (r"\bshow(?:s|ed|ing)?\b|\bappear(?:s|ed|ing)?\b|\bvisible\b", "visible"),
    (r"\bwear(?:s|ing)?\b|\bcolor\b|\bbackground\b|\bobject\b", "appearance"),
    (r"\benter(?:s|ed|ing)?\b|\bleave(?:s|d|ing)?\b", "movement"),
)
_ALL_RULE = re.compile(r"\b(?:find\s+)?(?:every|each|all)\b(?:[^?\n]{0,32})\b(?:time|moment|occurrence|instance)s?\b|\bfind all\b", re.I)
_TRANSCRIPT_RULES = (
    r"\bsay(?:s|ing)?\b",
    r"\bmention(?:s|ed|ing)?\b",
    r"\bexplain(?:s|ed|ing)?\b",
    r"\bdiscuss(?:es|ed|ing)?\b",
    r"\bquote\b",
    r"\btell(?:s|ing)?\b",
    r"\baccording to\b",
    r"\bwhat did .+ (?:say|mention|explain|discuss)\b",
)
class ChatIntent(TypedDict):
    modality: Modality
    search_mode: SearchMode
    visual_predicates: list[str]
    confidence: float


def route_chat_intent(
    question: str,
    *,
    modality_override: str | None = None,
    search_mode_override: str | None = None,
    focused: bool = False,
) -> ChatIntent:
    normalized = " ".join(question.lower().split())
    visual_predicates = [name for pattern, name in _VISUAL_RULES if re.search(pattern, normalized)]
    has_visual = bool(visual_predicates)
    has_transcript = any(re.search(pattern, normalized) for pattern in _TRANSCRIPT_RULES)

    override = (modality_override or "auto").strip().lower()
    if override in {"visual", "transcript", "hybrid"}:
        modality: Modality = override  # type: ignore[assignment]
        confidence = 1.0
    elif has_visual and has_transcript:
        modality, confidence = "hybrid", 0.92
    elif has_visual:
        modality, confidence = "visual", 0.9
    elif has_transcript:
        modality, confidence = "transcript", 0.9
    else:
        modality, confidence = "transcript", 0.45

    requested_mode = (search_mode_override or "").strip().lower()
    search_mode: SearchMode = "focused" if focused else ("all" if _ALL_RULE.search(normalized) else "top")
    if requested_mode in {"top", "all", "focused"}:
        search_mode = requested_mode  # type: ignore[assignment]
    return {
        "modality": modality,
        "search_mode": search_mode,
        "visual_predicates": list(dict.fromkeys(visual_predicates)),
        "confidence": confidence,
    }


def verification_for_hit(hit: dict, modality: Modality) -> tuple[VerificationStatus, float, str]:
    if modality == "transcript":
        return "verified", min(1.0, max(0.0, float(hit.get("similarity_score") or 0.0))), "Transcript segment matches the question"
    if hit.get("visual_verified"):
        return (
            "verified",
            min(1.0, max(0.0, float(hit.get("verification_confidence") or hit.get("similarity_score") or 0.0))),
            str(hit.get("match_reason") or "Visible evidence supports the question"),
        )
    return "possible", min(1.0, max(0.0, float(hit.get("similarity_score") or 0.0))), "Candidate frame needs visual verification"


def suggested_refinements(intent: ChatIntent, *, has_results: bool) -> list[str]:
    if not has_results:
        return ["Try asking what was said", "Attach a specific video", "Ask about a shorter time range"]
    if intent["modality"] == "visual":
        return ["Only show the clearest matches", "Show nearby context", "Ask about this moment"]
    if intent["modality"] == "hybrid":
        return ["Show only what was said", "Show only visible moments", "Ask about this moment"]
    return ["Find every mention", "Show nearby context", "Ask about this moment"]
