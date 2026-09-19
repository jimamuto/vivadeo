"""Small OpenAI-compatible client for Vivadeo Auto and transient BYOK requests."""

import base64
import copy
import hashlib
import ipaddress
import json
import logging
import re
import socket
import time
from collections import OrderedDict
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)
_TRANSIENT_HTTP_STATUSES = {408, 409, 429, 500, 502, 503, 504}
_MAX_TRANSIENT_ATTEMPTS = 3
_MAX_RETRY_DELAY_SECONDS = 8
_VISUAL_VERIFICATION_CACHE_MAX = 256
_visual_verification_cache: OrderedDict[tuple[str, str, tuple[str, ...]], list[dict]] = OrderedDict()


def _retry_delay(error: HTTPError, attempt: int) -> float:
    """Honor provider backoff advice, falling back to bounded exponential delay."""
    value = error.headers.get("Retry-After") if error.headers else None
    if value:
        try:
            return min(_MAX_RETRY_DELAY_SECONDS, max(1.0, float(value)))
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(value)
                if retry_at.tzinfo is None:
                    retry_at = retry_at.replace(tzinfo=timezone.utc)
                return min(_MAX_RETRY_DELAY_SECONDS, max(1.0, (retry_at - datetime.now(timezone.utc)).total_seconds()))
            except (TypeError, ValueError, OverflowError):
                pass
    return min(_MAX_RETRY_DELAY_SECONDS, float(2 ** attempt))


GENERAL_CHAT_INSTRUCTION = (
    "You are Vivadeo, the assistant inside Vivadeo, a private workspace-based video archive and search product. "
    "Vivadeo helps teams upload or index videos, search spoken and visual content, inspect answers with timestamped "
    "video evidence, and manage their video library and processing jobs. Answer questions about Vivadeo using this "
    "context, and never confuse Vivadeo with VivaVideo or another video editor. For ordinary conversation, respond "
    "naturally and use concise Markdown when it improves readability. Do not claim to have searched video evidence "
    "unless evidence was supplied."
)


class OpenAICompatibleError(RuntimeError):
    """Raised when an OpenAI-compatible gateway cannot produce an answer."""

    def __init__(self, message: str, *, reason: str = "model_failure"):
        super().__init__(message)
        self.reason = reason


class FailoverChat:
    """Use a primary chat service and retry the operation on a secondary service."""

    def __init__(self, primary, secondary=None):
        self.primary = primary
        self.secondary = secondary

    def answer(self, messages: list[dict], context: list[dict], on_delta=None) -> str:
        kwargs = {"on_delta": on_delta} if on_delta is not None else {}
        try:
            return self.primary.answer(messages, context, **kwargs)
        except OpenAICompatibleError:
            if self.secondary is None:
                raise
            logger.warning("primary_auto_chat_failed_using_secondary", exc_info=True)
            return self.secondary.answer(messages, context, **kwargs)

    def verify_visual_candidates(self, question: str, candidates: list[dict]) -> list[dict]:
        try:
            return self.primary.verify_visual_candidates(question, candidates)
        except OpenAICompatibleError:
            if self.secondary is None:
                raise
            logger.warning("primary_visual_verifier_failed_using_secondary", exc_info=True)
            return self.secondary.verify_visual_candidates(question, candidates)


def validate_base_url(value: str, *, allow_local: bool = False) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise OpenAICompatibleError("AI endpoints must use an http(s) URL without embedded credentials.")
    hostname = parsed.hostname or ""
    is_localhost = hostname.casefold() == "localhost"
    if parsed.scheme == "http" and not (allow_local and is_localhost):
        raise OpenAICompatibleError("Non-local AI endpoints must use https.")
    if is_localhost:
        if not allow_local:
            raise OpenAICompatibleError("AI endpoints cannot use local or private network addresses.")
    else:
        try:
            addresses = {item[4][0] for item in socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM)}
        except socket.gaierror as exc:
            raise OpenAICompatibleError("The AI endpoint hostname could not be resolved.") from exc
        if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
            raise OpenAICompatibleError("AI endpoints cannot use local or private network addresses.")
    return value.rstrip("/")


def _read_answer_stream(response, on_delta, protocol: str) -> str:
    parts = []
    completed = False
    for raw in response:
        line = raw.decode("utf-8").strip()
        if protocol != "ollama":
            if not line.startswith("data:"):
                continue
            line = line[5:].strip()
            if line == "[DONE]":
                completed = True
                break
        if not line:
            continue
        event = json.loads(line)
        if event.get("error") or event.get("type") == "error":
            raise OpenAICompatibleError("The answer service interrupted the response.")
        if protocol == "ollama":
            delta = event.get("message", {}).get("content", "")
            completed = bool(event.get("done"))
        elif protocol == "anthropic":
            delta = event.get("delta", {}).get("text", "")
            completed = event.get("type") == "message_stop"
        else:
            choices = event.get("choices") or []
            delta = choices[0].get("delta", {}).get("content", "") if choices else ""
        if delta:
            parts.append(delta)
            on_delta(delta)
        if completed:
            break
    if not completed:
        raise OpenAICompatibleError("The answer service disconnected before completing the response.")
    answer = "".join(parts).strip()
    if not answer:
        raise OpenAICompatibleError("The answer service returned an empty answer.")
    return answer


def _ollama_base_url(value: str) -> str:
    base_url = validate_base_url(value, allow_local=True)
    parsed = urlparse(base_url)
    if Path("/.dockerenv").exists() and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
        host = "host.docker.internal"
        netloc = f"{host}:{parsed.port}" if parsed.port else host
        return urlunparse(parsed._replace(netloc=netloc))
    return base_url


def list_ollama_models(base_url: str, timeout: int = 10) -> list[str]:
    try:
        with urlopen(Request(f"{_ollama_base_url(base_url)}/api/tags"), timeout=timeout) as response:
            payload = json.load(response)
        return sorted({str(item["name"]) for item in payload.get("models", []) if item.get("name")})
    except (HTTPError, URLError, TimeoutError, OSError, KeyError, TypeError, ValueError) as exc:
        raise OpenAICompatibleError("Could not connect to the local Ollama service.") from exc


class OllamaChat:
    def __init__(self, *, base_url: str, model: str, timeout: int = 120):
        self.base_url = _ollama_base_url(base_url)
        self.model = model.strip()
        self.timeout = timeout
        if not self.model:
            raise OpenAICompatibleError("An Ollama model is required.")

    def answer(self, messages: list[dict], context: list[dict], on_delta=None) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] {item.get('text', '')}"
            for item in context
        )
        instruction = (
            "Answer only from this transcript evidence:\n" + evidence
            if context
            else GENERAL_CHAT_INSTRUCTION
        )
        payload = json.dumps({
            "model": self.model,
            "stream": on_delta is not None,
            "messages": [{"role": "system", "content": instruction}, *messages],
        }).encode("utf-8")
        request = Request(f"{self.base_url}/api/chat", data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=self.timeout) as response:
                if on_delta is not None:
                    return _read_answer_stream(response, on_delta, "ollama")
                result = json.load(response)
            answer = str(result["message"]["content"]).strip()
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, TypeError, ValueError) as exc:
            raise OpenAICompatibleError("The Ollama endpoint could not generate an answer.") from exc
        if not answer:
            raise OpenAICompatibleError("The Ollama endpoint returned an empty answer.")
        return answer


class AnthropicChat:
    def __init__(self, *, base_url: str, api_key: str, model: str, timeout: int = 120):
        self.base_url = validate_base_url(base_url)
        self.api_key = api_key.strip()
        self.model = model.strip()
        self.timeout = timeout
        if not self.api_key or not self.model:
            raise OpenAICompatibleError("An Anthropic endpoint, API key, and model are required.")

    def answer(self, messages: list[dict], context: list[dict], on_delta=None) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] {item.get('text', '')}"
            for item in context
        )
        instruction = (
            "Answer only from this transcript evidence:\n" + evidence
            if context
            else GENERAL_CHAT_INSTRUCTION
        )
        payload = json.dumps({
            "model": self.model,
            "stream": on_delta is not None,
            "max_tokens": 2048,
            "system": instruction,
            "messages": messages,
        }).encode("utf-8")
        request = Request(
            f"{self.base_url}/messages",
            data=payload,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                if on_delta is not None:
                    return _read_answer_stream(response, on_delta, "anthropic")
                result = json.load(response)
            answer = "".join(str(part.get("text", "")) for part in result["content"] if isinstance(part, dict)).strip()
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, TypeError, ValueError) as exc:
            raise OpenAICompatibleError("The Anthropic endpoint could not generate an answer.") from exc
        if not answer:
            raise OpenAICompatibleError("The Anthropic endpoint returned an empty answer.")
        return answer


class OpenAICompatibleChat:
    def __init__(self, *, base_url: str, api_key: str, model: str, timeout: int = 120):
        self.base_url = validate_base_url(base_url)
        self.api_key = api_key.strip()
        self.model = model.strip()
        self.timeout = timeout
        if not self.api_key or not self.model:
            raise OpenAICompatibleError("An AI endpoint, API key, and model are required.")

    def verify_visual_candidates(self, question: str, candidates: list[dict]) -> list[dict]:
        """Ask a vision-capable Pro model to verify sampled candidate frames."""
        frame_hashes = tuple(
            hashlib.sha256(Path(candidate["path"]).read_bytes()).hexdigest()
            for candidate in candidates
        )
        cache_key = (self.model, " ".join(question.lower().split()), frame_hashes)
        cached = _visual_verification_cache.get(cache_key)
        if cached is not None:
            _visual_verification_cache.move_to_end(cache_key)
            return copy.deepcopy(cached)
        content = [{
            "type": "text",
            "text": (
                "Judge the supplied video frames for this question: " + question + "\n"
                "Return only JSON in this exact shape: "
                "{\\\"candidates\\\":[{\\\"index\\\":1,\\\"relevant\\\":true,\\\"confidence\\\":0.0,\\\"reason\\\":\\\"\\\"}]}\n"
                "A candidate is relevant only when the visible frame supports the question. "
                "Use visible pixels only; do not infer from timestamps, filenames, or transcript text. "
                "Confidence must be 0.0 to 1.0: 0.9+ means unmistakable, 0.7 means clearly visible, "
                "0.5 means ambiguous, and below 0.5 means unsupported. Explain the visible cue briefly."
            ),
        }]
        for index, candidate in enumerate(candidates, 1):
            encoded = base64.b64encode(Path(candidate["path"]).read_bytes()).decode("ascii")
            content.extend([
                {"type": "text", "text": f"Candidate {index} at {candidate['timestamp']:.3f}s:"},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{encoded}"}},
            ])
        payload = json.dumps({
            "model": self.model,
            "messages": [{"role": "user", "content": content}],
            "max_completion_tokens": 512,
        }).encode("utf-8")
        request = Request(
            f"{self.base_url}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        result = None
        for attempt in range(1, _MAX_TRANSIENT_ATTEMPTS + 1):
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    result = json.load(response)
                break
            except HTTPError as exc:
                if exc.code in _TRANSIENT_HTTP_STATUSES and attempt < _MAX_TRANSIENT_ATTEMPTS:
                    time.sleep(_retry_delay(exc, attempt))
                    continue
                raise OpenAICompatibleError(
                    "The configured AI endpoint failed while processing visual evidence.",
                    reason="rate_limited" if exc.code == 429 else "provider_error",
                ) from exc
            except (URLError, TimeoutError, OSError) as exc:
                if attempt < _MAX_TRANSIENT_ATTEMPTS:
                    time.sleep(2 ** (attempt - 1))
                    continue
                raise OpenAICompatibleError(
                    "The configured AI endpoint failed while processing visual evidence.",
                    reason="provider_error",
                ) from exc
        try:
            content = result["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
            parsed = json.loads(re.sub(r"^```(?:json)?\\s*|\\s*```$", "", str(content).strip(), flags=re.IGNORECASE))
            decisions = parsed.get("candidates", []) if isinstance(parsed, dict) else []
            decisions = [
                decision for decision in decisions
                if isinstance(decision, dict)
                and isinstance(decision.get("index"), int)
                and isinstance(decision.get("relevant"), bool)
            ]
            _visual_verification_cache[cache_key] = copy.deepcopy(decisions)
            _visual_verification_cache.move_to_end(cache_key)
            while len(_visual_verification_cache) > _VISUAL_VERIFICATION_CACHE_MAX:
                _visual_verification_cache.popitem(last=False)
            return decisions
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise OpenAICompatibleError("The configured AI endpoint failed while processing visual evidence.") from exc

    def answer(self, messages: list[dict], context: list[dict], on_delta=None) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] "
            f"{'Visual evidence verified. ' if item.get('visual_verified') else ''}{item.get('text', '')}"
            for item in context
        )
        visual_note = " Visual evidence entries were checked against the actual frames; for a visual question, report those timestamp ranges and do not call the evidence insufficient merely because the transcript is unrelated." if any(item.get("visual_verified") for item in context) else ""
        instruction = (
            "Answer using only the supplied video evidence." + visual_note + " Give the direct answer in 1-2 short sentences. Do not include evidence lists, repeat transcript excerpts, raw links, or chain-of-thought; the interface presents the relevant moments separately. If the evidence is insufficient, say so plainly.\n\nEvidence:\n" + evidence
            if context
            else GENERAL_CHAT_INSTRUCTION
        )
        grounded_messages = [{"role": "system", "content": instruction}, *messages]
        payload = json.dumps({"model": self.model, "messages": grounded_messages, "stream": on_delta is not None}).encode("utf-8")
        request = Request(
            f"{self.base_url}/chat/completions",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        result = None
        for attempt in range(1, _MAX_TRANSIENT_ATTEMPTS + 1):
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    if on_delta is not None:
                        return _read_answer_stream(response, on_delta, "openai")
                    result = json.load(response)
                break
            except HTTPError as exc:
                retryable = exc.code in _TRANSIENT_HTTP_STATUSES
                logger.warning(
                    "answer_service_http_error status=%s attempt=%s retryable=%s",
                    exc.code,
                    attempt,
                    retryable,
                )
                if retryable and attempt < _MAX_TRANSIENT_ATTEMPTS:
                    time.sleep(_retry_delay(exc, attempt))
                    continue
                raise OpenAICompatibleError("The configured AI endpoint could not generate an answer.") from exc
            except (URLError, TimeoutError, OSError) as exc:
                logger.warning(
                    "answer_service_connection_error error_type=%s attempt=%s",
                    type(exc).__name__,
                    attempt,
                )
                if attempt < _MAX_TRANSIENT_ATTEMPTS:
                    time.sleep(2 ** (attempt - 1))
                    continue
                raise OpenAICompatibleError("The configured AI endpoint could not generate an answer.") from exc
        try:
            content = result["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
            answer = str(content).strip()
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise OpenAICompatibleError("The configured AI endpoint returned an invalid answer.") from exc
        if not answer:
            raise OpenAICompatibleError("The configured AI endpoint returned an empty answer.")
        return answer
