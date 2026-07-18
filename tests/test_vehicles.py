"""VehicleWatcher: детект транспорта → vehicle_seen с кулдауном и фильтром мелочи."""

from __future__ import annotations

import numpy as np
import supervision as sv

from soqchi.vehicles import COOLDOWN_S, VehicleWatcher


class _StubDetector:
    """Возвращает заранее заданные боксы транспорта (класс 2 = car)."""

    def __init__(self, boxes: list[tuple[int, int, int, int]], cls: int = 2):
        self._boxes = boxes
        self._cls = cls

    def detect_vehicles(self, image: np.ndarray, conf: float, imgsz: int) -> sv.Detections:
        if not self._boxes:
            return sv.Detections.empty()
        return sv.Detections(
            xyxy=np.array(self._boxes, dtype=float),
            class_id=np.array([self._cls] * len(self._boxes)),
        )


def _frame() -> np.ndarray:
    return np.zeros((100, 100, 3), dtype=np.uint8)


def test_vehicle_seen_emitted_then_cooldown() -> None:
    det = _StubDetector([(10, 10, 90, 90)])  # 64% кадра — крупный
    w = VehicleWatcher(det, conf=0.3, imgsz=640)  # type: ignore[arg-type]

    ev = w.process("cam1", _frame(), ts=100.0)
    assert len(ev) == 1
    assert ev[0].type == "vehicle_seen"
    assert ev[0].meta["vehicle_type"] == "car"

    # тот же тип в кулдауне → тишина
    assert w.process("cam1", _frame(), ts=100.0 + COOLDOWN_S - 1) == []
    # кулдаун прошёл → снова событие
    assert len(w.process("cam1", _frame(), ts=100.0 + COOLDOWN_S + 1)) == 1


def test_small_vehicle_ignored() -> None:
    det = _StubDetector([(0, 0, 5, 5)])  # 0.25% кадра — мельче порога
    w = VehicleWatcher(det, conf=0.3, imgsz=640)  # type: ignore[arg-type]
    assert w.process("cam1", _frame(), ts=1.0) == []


def test_no_detections_no_events() -> None:
    w = VehicleWatcher(_StubDetector([]), conf=0.3, imgsz=640)  # type: ignore[arg-type]
    assert w.process("cam1", _frame(), ts=1.0) == []
