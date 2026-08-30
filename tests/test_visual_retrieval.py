from vivadeo.visual_retrieval import cosine_similarity, is_visual_query, rank_frame_candidates, sample_timestamps


def test_visual_query_detection_and_sampling():
    assert is_visual_query("When does the speaker face us?")
    assert not is_visual_query("What did the speaker say about the launch?")
    assert sample_timestamps(10, 20, count=4) == [10.0, 12.5, 15.0, 17.5]


def test_frame_candidates_are_ranked_by_cosine_similarity():
    assert cosine_similarity([1, 0], [1, 0]) == 1.0
    ranked = rank_frame_candidates(
        [1, 0],
        [
            {"timestamp": 10.0, "embedding": [0, 1]},
            {"timestamp": 20.0, "embedding": [1, 0]},
        ],
    )
    assert ranked[0]["timestamp"] == 20.0
    assert ranked[0]["similarity_score"] == 1.0
