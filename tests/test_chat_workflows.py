from vivadeo.chat_workflows import comparison_claims, extraction_rows, merge_evidence_ranges


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


def test_merge_evidence_ranges_combines_nearby_segments_and_keeps_rank():
    citations = [
        {**_citation("video-a", 10.0, "Third"), "end_time": 14.0, "modality": "transcript", "similarity_score": 0.9},
        {**_citation("video-a", 0.0, "First"), "end_time": 5.0, "modality": "transcript", "similarity_score": 0.7},
        {**_citation("video-a", 6.0, "Second"), "end_time": 9.0, "modality": "transcript", "similarity_score": 0.8},
        {**_citation("video-a", 70.0, "Separate"), "end_time": 75.0, "modality": "transcript", "similarity_score": 0.6},
    ]

    merged = merge_evidence_ranges(citations, max_ranges=3)

    assert [(item["start_time"], item["end_time"]) for item in merged] == [(0.0, 14.0), (70.0, 75.0)]
    assert merged[0]["text"] == "First Second Third"
    assert merged[0]["similarity_score"] == 0.9


def test_merge_evidence_ranges_preserves_distinct_and_exhaustive_ranges():
    citations = [
        {**_citation("video-a", 0.0, "One"), "end_time": 30.0, "modality": "visual"},
        {**_citation("video-a", 33.0, "Two"), "end_time": 50.0, "modality": "visual"},
        {**_citation("video-b", 1.0, "Three"), "end_time": 3.0, "modality": "visual"},
    ]

    assert len(merge_evidence_ranges(citations, max_ranges=2)) == 2
    assert len(merge_evidence_ranges(citations, max_ranges=None)) == 3


def test_extraction_rows_preserve_model_item_and_evidence_identity():
    rows = extraction_rows(
        [_citation("one", 4.0, "Launch is Friday")],
        '```json\n{"rows":[{"item":"Launch happens Friday","evidence_index":0}]}\n```',
    )
    assert rows[0]["item"] == "Launch happens Friday"
    assert rows[0]["evidence_key"] == "one:4.000-6.000"


def test_extraction_rows_reject_malformed_or_ungrounded_items():
    citations = [_citation("one", 4.0)]
    assert extraction_rows(citations, "not json") == []
    assert extraction_rows(citations, '{"rows":[{"item":"Invented","evidence_index":2}]}') == []


def test_comparison_claim_requires_two_sources():
    assert comparison_claims([_citation("one", 1.0)], "Only one side") == []
    claims = comparison_claims([_citation("one", 1.0), _citation("two", 8.0)], "They differ")
    assert claims[0]["claim"] == "They differ"
    assert claims[0]["left_citations"][0]["video_id"] == "one"
    assert claims[0]["right_citations"][0]["video_id"] == "two"
