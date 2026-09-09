"""Small OpenAI-compatible client for Vivadeo Auto and transient BYOK requests."""

import base64
import json
import logging
import re
import time
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen


logger = logging.getLogger(__name__)
_TRANSIENT_HTTP_STATUSES = {408, 409, 429, 500, 502, 503, 504}
_MAX_TRANSIENT_ATTEMPTS = 3
_MAX_RETRY_DELAY_SECONDS = 60


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


def validate_base_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise OpenAICompatibleError("AI endpoints must use an http(s) URL without embedded credentials.")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise OpenAICompatibleError("Non-local AI endpoints must use https.")
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
    base_url = validate_base_url(value)
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
        content = [{
            "type": "text",
            "text": (
                "Judge the supplied video frames for this question: " + question + "\n"
                "Return only JSON in this exact shape: "
                "{\\\"candidates\\\":[{\\\"index\\\":1,\\\"relevant\\\":true,\\\"confidence\\\":0.0}]}\n"
                "A candidate is relevant only when the visible frame supports the question. "
                "Do not infer from timestamps or filenames."
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
                raise
            except (URLError, TimeoutError, OSError):
                if attempt < _MAX_TRANSIENT_ATTEMPTS:
                    time.sleep(2 ** (attempt - 1))
                    continue
                raise
        try:
            content = result["choices"][0]["message"]["content"]
            if isinstance(content, list):
                content = "".join(str(part.get("text", "")) for part in content if isinstance(part, dict))
            parsed = json.loads(re.sub(r"^```(?:json)?\\s*|\\s*```$", "", str(content).strip(), flags=re.IGNORECASE))
            decisions = parsed.get("candidates", []) if isinstance(parsed, dict) else []
            return [
                decision for decision in decisions
                if isinstance(decision, dict)
                and isinstance(decision.get("index"), int)
                and isinstance(decision.get("relevant"), bool)
            ]
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise OpenAICompatibleError("The configured AI endpoint could not verify visual evidence.") from exc

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
