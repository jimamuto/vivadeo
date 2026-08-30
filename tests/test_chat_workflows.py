from vivadeo.chat_workflows import comparison_claims, extraction_rows


def _citation(video_id, start, text="evidence"):
    return {
        "video_id": video_id,
        "filename": f"{video_id}.mp4",
        "start_time": start,
        "end_time": start + 2,
        "text": text,
        "confidence": 0.9,
        "verification_status": "verified",
    }


def test_extraction_rows_preserve_evidence_identity():
    rows = extraction_rows([_citation("one", 4.0, "Launch is Friday")], "claims")
    assert rows[0]["item"] == "Launch is Friday"
    assert rows[0]["evidence_key"] == "one:4.000-6.000"


def test_comparison_claim_requires_two_sources():
    assert comparison_claims([_citation("one", 1.0)], "Only one side") == []
    claims = comparison_claims([_citation("one", 1.0), _citation("two", 8.0)], "They differ")
    assert claims[0]["claim"] == "They differ"
    assert claims[0]["left_citations"][0]["video_id"] == "one"
    assert claims[0]["right_citations"][0]["video_id"] == "two"
