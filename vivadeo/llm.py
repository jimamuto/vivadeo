"""Small OpenAI-compatible chat client for Pro and transient BYOK requests."""

import base64
import json
import re
from pathlib import Path
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
        instruction = (
            "Answer only from this transcript evidence:\n" + evidence
            if context
            else "Respond naturally and helpfully. Do not claim to have searched or found video evidence."
        )
        payload = json.dumps({
            "model": self.model,
            "stream": False,
            "messages": [{"role": "system", "content": instruction}, *messages],
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
        instruction = (
            "Answer only from this transcript evidence:\n" + evidence
            if context
            else "Respond naturally and helpfully. Do not claim to have searched or found video evidence."
        )
        payload = json.dumps({
            "model": self.model,
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
            "temperature": 0,
            "max_tokens": 512,
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
        try:
            with urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
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

    def answer(self, messages: list[dict], context: list[dict]) -> str:
        evidence = "\n\n".join(
            f"[{item.get('filename', 'video')} {item.get('start_time', 0):.2f}-{item.get('end_time', 0):.2f}] "
            f"{'Visual evidence verified. ' if item.get('visual_verified') else ''}{item.get('text', '')}"
            for item in context
        )
        visual_note = " Visual evidence entries were checked against the actual frames; for a visual question, report those timestamp ranges and do not call the evidence insufficient merely because the transcript is unrelated." if any(item.get("visual_verified") for item in context) else ""
        instruction = (
            "Answer using only the supplied video evidence." + visual_note + " Give the direct answer in 1-2 short sentences. Do not include evidence lists, repeat transcript excerpts, raw links, or chain-of-thought; the interface presents the relevant moments separately. If the evidence is insufficient, say so plainly.\n\nEvidence:\n" + evidence
            if context
            else "Respond naturally and helpfully. Do not claim to have searched or found video evidence."
        )
        grounded_messages = [{"role": "system", "content": instruction}, *messages]
        payload = json.dumps({"model": self.model, "messages": grounded_messages}).encode("utf-8")
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
