"""Small TypeSafe Jev client used for optional evidence reranking."""

from __future__ import annotations

import json
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class JevError(RuntimeError):
    """Raised when the Jev API cannot evaluate evidence."""


class JevClient:
    def __init__(self, *, api_key: str, base_url: str, model: str, timeout: int = 30):
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def score_relevance(self, query: str, candidates: list[dict]) -> tuple[dict[str, float], float]:
        """Score candidate evidence independently and return scores plus latency."""
        if not candidates:
            return {}, 0.0

        state = {
            "query": query,
            "candidates": [
                {"id": candidate["id"], "text": candidate["text"]}
                for candidate in candidates
            ],
        }
        questions = {
            f"candidate_{index}": {
                "type": "noul",
                "instructions": (
                    f"Does `candidates[{index}].text` directly support an answer to `query`? "
                    "Return a high probability only when the text is relevant evidence, "
                    "not merely related vocabulary."
                ),
            }
            for index in range(len(candidates))
        }
        payload = json.dumps({
            "model": self.model,
            "state": state,
            "questions": questions,
        }).encode("utf-8")
        request = Request(
            f"{self.base_url}/v1/systemone",
            data=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        started = time.perf_counter()
        try:
            with urlopen(request, timeout=self.timeout) as response:
                result = json.load(response)
        except (HTTPError, URLError, TimeoutError, OSError, KeyError, TypeError, ValueError) as exc:
            raise JevError("Jev relevance evaluation failed.") from exc
        elapsed_ms = (time.perf_counter() - started) * 1000

        answers = result.get("answers")
        if not isinstance(answers, dict):
            raise JevError("Jev returned an invalid relevance response.")
        scores: dict[str, float] = {}
        for index, candidate in enumerate(candidates):
            answer = answers.get(f"candidate_{index}")
            score = answer.get("noul") if isinstance(answer, dict) else None
            if not isinstance(score, (int, float)):
                raise JevError("Jev returned an invalid relevance score.")
            scores[str(candidate["id"])] = max(0.0, min(1.0, float(score)))
        return scores, elapsed_ms

