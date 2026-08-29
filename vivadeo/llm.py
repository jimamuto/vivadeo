"""Small OpenAI-compatible chat client for Pro and transient BYOK requests."""

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class OpenAICompatibleError(RuntimeError):
    """Raised when an OpenAI-compatible gateway cannot produce an answer."""


def validate_base_url(value: str) -> str:
    parsed = urlparse(value.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise OpenAICompatibleError("AI endpoints must use an http(s) URL without embedded credentials.")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise OpenAICompatibleError("Non-local AI endpoints must use https.")
    return value.rstrip("/")


class OllamaChat:
    def __init__(self, *, base_url: str, model: str, timeout: int = 120):
        self.base_url = validate_base_url(base_url)
        self.model = model.strip()
        self.timeout = timeout
        if not self.model:
            raise OpenAICompatibleError("An Ollama model is required.")

    def answer(self, messages: list[dict], context: list[dict]) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] {item.get('text', '')}"
            for item in context
        )
        payload = json.dumps({
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": "Answer only from this transcript evidence:\n" + evidence},
                *messages,
            ],
        }).encode("utf-8")
        request = Request(f"{self.base_url}/api/chat", data=payload, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=self.timeout) as response:
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

    def answer(self, messages: list[dict], context: list[dict]) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] {item.get('text', '')}"
            for item in context
        )
        payload = json.dumps({
            "model": self.model,
            "max_tokens": 2048,
            "system": "Answer only from this transcript evidence:\n" + evidence,
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

    def answer(self, messages: list[dict], context: list[dict]) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] {item.get('text', '')}"
            for item in context
        )
        grounded_messages = [
            {
                "role": "system",
                "content": "Answer using only the supplied video evidence. Give the direct answer in 1-2 short sentences. Do not include evidence lists, repeat transcript excerpts, raw links, or chain-of-thought; the interface presents the relevant moments separately. If the evidence is insufficient, say so plainly.\n\nEvidence:\n" + evidence,
            },
            *messages,
        ]
        payload = json.dumps({"model": self.model, "messages": grounded_messages, "temperature": 0.2}).encode("utf-8")
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
        try:
            with urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
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
