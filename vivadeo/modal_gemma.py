"""Modal remote-function client for Gemma chat answers."""

import time
from typing import Any

import modal


class ModalGemmaError(RuntimeError):
    """Raised when Modal Gemma answer generation fails."""


class ModalGemmaChat:
    """Calls a deployed Modal function for grounded chat answers.

    Expected remote function signature:
        answer(messages: list[dict], context: list[dict]) -> str | dict
    """

    def __init__(self, app_name: str, function_name: str, timeout: int = 900):
        self._app_name = app_name
        self._function_name = function_name
        self._timeout = timeout
        self._remote = None

    def _get_remote(self):
        if self._remote is not None:
            return self._remote
        try:
            self._remote = modal.Function.from_name(self._app_name, self._function_name)
            return self._remote
        except Exception as exc:
            raise ModalGemmaError(
                "Could not connect to Modal Gemma remote function. "
                f"Expected {self._app_name}.{self._function_name}."
            ) from exc

    @staticmethod
    def _normalize_answer(payload: Any) -> str:
        if isinstance(payload, str):
            return payload.strip()
        if isinstance(payload, dict):
            answer = payload.get("answer") or payload.get("message") or payload.get("text")
            if answer:
                return str(answer).strip()
        raise ModalGemmaError("Modal Gemma returned invalid answer payload.")

    def answer(self, messages: list[dict], context: list[dict], verbose: bool = False) -> str:
        remote = self._get_remote()
        t0 = time.monotonic()
        try:
            payload = remote.remote(messages, context)
        except Exception as exc:
            raise ModalGemmaError(f"Modal Gemma remote function failed: {exc}") from exc
        answer = self._normalize_answer(payload)
        if verbose:
            elapsed = time.monotonic() - t0
            print(f"  [verbose] modal gemma: context={len(context)}, time={elapsed:.2f}s")
        return answer
