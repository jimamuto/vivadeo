import json
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from vivadeo.evidence_answer import answer_from_evidence
from vivadeo.evidence_tools import EvidenceTool, choose_evidence_tool


def test_clear_spoken_question_never_calls_planner():
    generator = SimpleNamespace(answer=lambda *a: pytest.fail("Unnecessary planning call"))
    assert choose_evidence_tool("What did she say about pricing?", modality="auto", source_count=1, generator=generator).tool == "search_transcript"


def test_clear_visual_question_requests_visual_search():
    selected = choose_evidence_tool("When does she wave?", modality="auto", source_count=1)
    assert selected.tool == "search_visual_moments"


def test_planner_failure_falls_back_to_safe_transcript_search():
    generator = SimpleNamespace(answer=lambda *_: "not json")
    selected = choose_evidence_tool("Help me understand this", modality="auto", source_count=1, generator=generator)
    assert selected.tool == "search_transcript"


def test_ambiguous_question_uses_one_bounded_selection():
    calls = []
    def answer(messages, context):
        calls.append(messages)
        assert context == []
        return json.dumps({"tool": "inspect_moment", "start_time": 135, "end_time": 145})
    selected = choose_evidence_tool("What happens in the highlighted moment?", modality="auto", source_count=1, generator=SimpleNamespace(answer=answer))
    assert selected.tool == "inspect_moment"
    assert len(calls) == 1


@pytest.mark.parametrize("payload", [
    {"tool": "run_shell"},
    {"tool": "search_transcript", "video_ids": ["another-workspace"]},
    {"tool": "inspect_moment", "start_time": 1, "end_time": 200},
    {"tool": "inspect_moment", "start_time": 10, "end_time": 1},
    {"tool": "inspect_moment", "start_time": float("nan"), "end_time": 1},
])
def test_tool_selection_rejects_unbounded_or_unauthorized_arguments(payload):
    with pytest.raises(ValidationError):
        EvidenceTool.model_validate(payload)


def test_long_transcript_answer_covers_final_segments():
    evidence = [{"video_id": "v", "filename": "test.mp4", "start_time": i, "end_time": i+1, "text": (f"FACT_{i} " * 600)} for i in range(12)]
    seen = []
    class Generator:
        def answer(self, messages, context, **kwargs):
            text = " ".join(item["text"] for item in context)
            seen.append(text)
            if "on_delta" in kwargs:
                kwargs["on_delta"]("Complete summary")
                return "Complete summary"
            return " ".join(f"FACT_{i}" for i in range(12) if f"FACT_{i} " in text)
    deltas = []
    result = answer_from_evidence(Generator(), [{"role": "user", "content": "Summarize the discussion"}], evidence, on_delta=deltas.append)
    assert "FACT_11" in seen[-1]
    assert all(any(f"FACT_{i}" in text for text in seen) for i in range(12))
    assert result == "Complete summary" and deltas == ["Complete summary"]


def test_summary_refuses_nonshrinking_output_instead_of_looping():
    generator = SimpleNamespace(answer=lambda messages, context: "x" * 20000)
    evidence = [{"video_id": "v", "start_time": 0, "end_time": 1, "text": "x" * 18000}]
    with pytest.raises(ValueError, match="condense"):
        answer_from_evidence(generator, [{"content": "summary"}], evidence)
