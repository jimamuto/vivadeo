"""Lightweight face-orientation estimation for cached video keyframes."""

from __future__ import annotations

from pathlib import Path
import re


_FACE_ORIENTATION_PATTERNS = (
    r"\bface(?:s|d|ing)?\s+(?:the\s+)?(?:camera|us)\b",
    r"\bfacing\s+(?:the\s+)?(?:camera|us)\b",
    r"\blook(?:s|ed|ing)?\s+(?:at\s+)?(?:the\s+)?(?:camera|us)\b",
    r"\beye contact\b",
)


def is_face_orientation_query(question: str) -> bool:
    normalized = " ".join(question.lower().split())
    return any(re.search(pattern, normalized) for pattern in _FACE_ORIENTATION_PATTERNS)


def estimate_head_pose(image_path: str) -> dict:
    """Classify a frame as front/profile/unknown using bundled Haar detectors."""
    try:
        import cv2
    except ImportError:
        return {"pose": "unknown", "facing_camera": None, "confidence": 0.0, "reason": "opencv-unavailable"}

    image = cv2.imread(str(Path(image_path)))
    if image is None:
        return {"pose": "unknown", "facing_camera": None, "confidence": 0.0, "reason": "image-unreadable"}

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    frontal = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"))
    profile = cv2.CascadeClassifier(str(Path(cv2.data.haarcascades) / "haarcascade_profileface.xml"))
    front_faces = frontal.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
    profile_faces = profile.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
    if len(front_faces):
        largest = max(width * height for _x, _y, width, height in front_faces)
        confidence = min(0.99, 0.65 + (largest / max(1, image.shape[0] * image.shape[1])))
        return {"pose": "front", "facing_camera": True, "confidence": round(float(confidence), 3), "faces": len(front_faces)}
    if len(profile_faces):
        return {"pose": "profile", "facing_camera": False, "confidence": 0.7, "faces": len(profile_faces)}
    return {"pose": "unknown", "facing_camera": None, "confidence": 0.0, "faces": 0}
