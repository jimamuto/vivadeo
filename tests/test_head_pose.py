from vivadeo.head_pose import estimate_head_pose, is_face_orientation_query


def test_face_orientation_query_detection():
    assert is_face_orientation_query("When does the speaker face us?")
    assert is_face_orientation_query("When does she look at the camera?")
    assert not is_face_orientation_query("What did the speaker say about pricing?")


def test_unreadable_frame_is_unknown():
    result = estimate_head_pose("does-not-exist.jpg")
    assert result["pose"] == "unknown"
    assert result["facing_camera"] is None
