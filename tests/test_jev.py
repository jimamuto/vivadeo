import json

from vivadeo import jev
from vivadeo.jev import JevClient


class _Response:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def __iter__(self):
        return iter(())

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def test_score_relevance_sends_structured_questions(monkeypatch):
    captured = {}

    def fake_urlopen(request, timeout):
        captured["payload"] = json.loads(request.data)
        captured["timeout"] = timeout
        return _Response({
            "answers": {
                "candidate_0": {"noul": 0.9},
                "candidate_1": {"noul": 0.1},
            }
        })

    monkeypatch.setattr(jev, "urlopen", fake_urlopen)
    scores, latency_ms = JevClient(
        api_key="secret",
        base_url="https://api.typesafe.ai",
        model="jev-latest",
        timeout=7,
    ).score_relevance("What happened?", [
        {"id": "a", "text": "The incident happened at noon."},
        {"id": "b", "text": "The speaker introduced the team."},
    ])

    assert scores == {"a": 0.9, "b": 0.1}
    assert latency_ms >= 0
    assert captured["timeout"] == 7
    assert captured["payload"]["model"] == "jev-latest"
    assert captured["payload"]["state"]["query"] == "What happened?"
    assert len(captured["payload"]["questions"]) == 2
    assert captured["payload"]["questions"]["candidate_0"]["type"] == "noul"

