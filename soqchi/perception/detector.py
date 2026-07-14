from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import supervision as sv

if TYPE_CHECKING:
    import numpy as np

PERSON_CLASS_ID = 0


class PersonDetector:
    """YOLO, только класс person. Один инстанс на процесс, потокобезопасен (lock)."""

    def __init__(self, weights: str = "yolo11n.pt", device: str | None = None):
        from ultralytics import YOLO  # ленивый импорт: тянет torch

        self.model = YOLO(weights)
        self.device = device
        self._lock = threading.Lock()

    def detect(self, image: np.ndarray, conf: float, imgsz: int = 640) -> sv.Detections:
        with self._lock:
            result = self.model.predict(
                image,
                classes=[PERSON_CLASS_ID],
                conf=conf,
                imgsz=imgsz,
                device=self.device,
                verbose=False,
            )[0]
        return sv.Detections.from_ultralytics(result)
