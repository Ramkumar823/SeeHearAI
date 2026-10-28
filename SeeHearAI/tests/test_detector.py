import numpy as np
import pytest
from backend.detector import ObjectDetector

def test_invalid_frame_raises_value_error():
    detector = ObjectDetector()
    with pytest.raises(ValueError):
        detector.detect_frame(None)

def test_invalid_encoded_image_raises_value_error():
    detector = ObjectDetector()
    with pytest.raises(ValueError):
        detector.detect_bytes(b"not an image")
