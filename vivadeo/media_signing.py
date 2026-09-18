"""Short-lived authorization tokens for workspace media URLs."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

from .config import get_settings


def _signing_key() -> bytes:
    return get_settings().internal_service_key.encode("utf-8")


def create_media_token(organization_id: str, object_key: str, expires_in: int = 300) -> str:
    payload = {
        "organization_id": organization_id,
        "object_key": object_key,
        "expires_at": int(time.time()) + expires_in,
    }
    encoded = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(_signing_key(), encoded.encode(), hashlib.sha256).digest()
    signed = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{encoded}.{signed}"


def verify_media_token(token: str, organization_id: str, object_key: str) -> bool:
    try:
        encoded, signature = token.split(".", 1)
        expected = base64.urlsafe_b64encode(hmac.new(_signing_key(), encoded.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(signature, expected):
            return False
        payload = json.loads(base64.urlsafe_b64decode(encoded + "===").decode())
        return (
            payload.get("organization_id") == organization_id
            and payload.get("object_key") == object_key
            and int(payload.get("expires_at", 0)) >= int(time.time())
        )
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, UnicodeDecodeError):
        return False


def media_token_organization(token: str, object_key: str) -> str | None:
    try:
        encoded, signature = token.split(".", 1)
        expected = base64.urlsafe_b64encode(hmac.new(_signing_key(), encoded.encode(), hashlib.sha256).digest()).decode().rstrip("=")
        if not hmac.compare_digest(signature, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(encoded + "===").decode())
        if payload.get("object_key") != object_key or int(payload.get("expires_at", 0)) < int(time.time()):
            return None
        return str(payload.get("organization_id"))
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, UnicodeDecodeError):
        return None


def signed_media_query(organization_id: str, object_key: str) -> str:
    return urlencode({"token": create_media_token(organization_id, object_key)})
