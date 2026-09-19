"""Threshold calibration for visual evidence decisions.

The verifier remains the source of visual truth. This module only calibrates
the decision boundary used after retrieval and verifier scoring; it never
creates visual labels from embeddings alone.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class VisualCalibration:
    verifier_threshold: float
    combined_threshold: float
    sample_count: int
    positive_count: int
    source: str


def _balanced_accuracy(examples: list[dict], field: str, threshold: float) -> float:
    positives = [item for item in examples if bool(item.get("relevant"))]
    negatives = [item for item in examples if not bool(item.get("relevant"))]
    if not positives or not negatives:
        return 0.0
    true_positive = sum(float(item.get(field, 0.0)) >= threshold for item in positives)
    true_negative = sum(float(item.get(field, 0.0)) < threshold for item in negatives)
    return (true_positive / len(positives) + true_negative / len(negatives)) / 2


def _best_threshold(examples: list[dict], field: str) -> float:
    candidates = sorted({round(float(item.get(field, 0.0)), 4) for item in examples})
    if not candidates:
        return 1.0
    scored = [(_balanced_accuracy(examples, field, threshold), threshold) for threshold in candidates]
    # Prefer the stricter boundary when calibration quality ties.
    return max(scored, key=lambda item: (item[0], item[1]))[1]


def calibrate_visual_thresholds(examples: Iterable[dict], *, source: str = "labeled examples") -> VisualCalibration:
    """Choose score boundaries that maximize balanced accuracy on labels."""
    normalized = [
        {
            "relevant": bool(item.get("relevant")),
            "verifier_confidence": min(1.0, max(0.0, float(item.get("verifier_confidence", 0.0)))),
            "combined_score": min(1.0, max(0.0, float(item.get("combined_score", 0.0)))),
        }
        for item in examples
    ]
    if not normalized or not any(item["relevant"] for item in normalized) or not any(not item["relevant"] for item in normalized):
        raise ValueError("visual calibration requires both positive and negative labeled examples")
    return VisualCalibration(
        verifier_threshold=_best_threshold(normalized, "verifier_confidence"),
        combined_threshold=_best_threshold(normalized, "combined_score"),
        sample_count=len(normalized),
        positive_count=sum(item["relevant"] for item in normalized),
        source=source,
    )


def load_visual_calibration(path: str | Path | None = None) -> VisualCalibration:
    """Load a labeled calibration set and derive thresholds from its scores."""
    calibration_path = Path(path) if path else Path(__file__).with_name("visual_calibration.json")
    payload = json.loads(calibration_path.read_text(encoding="utf-8"))
    examples = payload.get("examples") if isinstance(payload, dict) else None
    if not isinstance(examples, list):
        raise ValueError("visual calibration file must contain an examples list")
    return calibrate_visual_thresholds(examples, source=str(calibration_path))
