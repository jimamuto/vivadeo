import pytest

from vivadeo.visual_calibration import calibrate_visual_thresholds, load_visual_calibration


def test_calibration_derives_boundaries_from_labeled_examples():
    calibration = calibrate_visual_thresholds([
        {"relevant": True, "verifier_confidence": 0.8, "combined_score": 0.7},
        {"relevant": True, "verifier_confidence": 0.9, "combined_score": 0.8},
        {"relevant": False, "verifier_confidence": 0.2, "combined_score": 0.3},
        {"relevant": False, "verifier_confidence": 0.4, "combined_score": 0.45},
    ])

    assert calibration.verifier_threshold == 0.8
    assert calibration.combined_threshold == 0.7
    assert calibration.sample_count == 4
    assert calibration.positive_count == 2


def test_default_calibration_is_labeled_and_loadable():
    calibration = load_visual_calibration()

    assert calibration.sample_count == 9
    assert calibration.positive_count == 5
    assert calibration.verifier_threshold == 0.7
    assert calibration.combined_threshold == 0.6


def test_calibration_requires_both_classes():
    with pytest.raises(ValueError):
        calibrate_visual_thresholds([{"relevant": True, "verifier_confidence": 0.8, "combined_score": 0.7}])
