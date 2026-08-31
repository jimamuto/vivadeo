import pytest
from pydantic import ValidationError

from vivadeo.chat_accuracy import route_chat_intent, suggested_refinements, verification_for_hit
from vivadeo.schemas import ChatMessage, ChatRequest


def test_request_accepts_accuracy_controls_and_rejects_unknown_mode():
    request = ChatRequest(messages=[ChatMessage(role="user", content="face the camera")], modality="visual", search_mode="focused", focus_window_seconds=12)
    assert request.modality == "visual"
    assert request.focus_window_seconds == 12
    all_request = ChatRequest(messages=[], search_mode="all")
    assert all_request.search_mode == "all"
    with pytest.raises(ValidationError):
        ChatRequest(messages=[], search_mode="unsupported")


def test_routes_visual_question_with_predicate():
    intent = route_chat_intent("When does the speaker face us?")
    assert intent["modality"] == "visual"
    assert intent["visual_predicates"] == ["faces_camera"]
    assert intent["search_mode"] == "top"


def test_routes_spoken_question_without_visual_override():
    intent = route_chat_intent("What did the speaker say about the launch?")
    assert intent["modality"] == "transcript"
    assert intent["visual_predicates"] == []


def test_routes_conceptual_points_to_transcript_and_pointing_gestures_to_visual():
    conceptual = route_chat_intent("What is the most important point given by the interviewee?")
    assert conceptual["modality"] == "transcript"
    assert conceptual["visual_predicates"] == []
    assert route_chat_intent("When does the interviewee point at the screen?")["modality"] == "visual"


def test_routes_hybrid_and_focused_questions():
    intent = route_chat_intent("What did she say while holding the product?", focused=True)
    assert intent["modality"] == "hybrid"
    assert intent["search_mode"] == "focused"
    assert route_chat_intent("Find every time the speaker faces us")["search_mode"] == "all"


def test_override_and_verification_contract():
    intent = route_chat_intent("Tell me about the scene", modality_override="visual", search_mode_override="focused")
    assert intent["modality"] == "visual"
    assert intent["confidence"] == 1.0
    status, confidence, reason = verification_for_hit({"similarity_score": 0.8, "visual_verified": False}, "visual")
    assert status == "possible"
    assert confidence == 0.8
    assert reason
    assert suggested_refinements(intent, has_results=True)[-1] == "Ask about this moment"
