"""YOLO object detection wrapper. Model weights are downloaded on first run."""
import cv2
import numpy as np
from config import MODEL_NAME, CONFIDENCE_THRESHOLD

class ObjectDetector:
    def __init__(self, model_name=MODEL_NAME, confidence=CONFIDENCE_THRESHOLD):
        self.model_name = model_name
        self.confidence = confidence
        self.model = None
        self.load_error = None

    @property
    def loaded(self):
        return self.model is not None

    def _load(self):
        if self.model is not None:
            return
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_name)
        except Exception as exc:
            self.load_error = str(exc)
            raise RuntimeError(
                "Could not load the YOLO model. Check your internet connection on "
                "first run, then try again. Details: " + str(exc)
            ) from exc

    def detect_bytes(self, frame_bytes):
        array = np.frombuffer(frame_bytes, dtype=np.uint8)
        frame = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("The uploaded frame is not a valid image.")
        return self.detect_frame(frame)

    def detect_frame(self, frame):
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError("The camera frame is empty or invalid.")
        self._load()
        result = self.model.predict(
            source=frame, conf=self.confidence, imgsz=640, verbose=False, device="cpu"
        )[0]
        names = result.names
        output = []
        if result.boxes is None:
            return output
        for box in result.boxes:
            cls_id = int(box.cls[0].item())
            confidence = float(box.conf[0].item())
            x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
            output.append({
                "label": str(names.get(cls_id, cls_id)),
                "confidence": round(confidence, 3),
                "box": [x1, y1, x2, y2],
            })
        return output
