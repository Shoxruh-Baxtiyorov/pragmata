"""Учёт транспорта (ANPR-lite): YOLO ловит машину → событие vehicle_seen.

Без отдельного трекинга транспорта (пайплайн заточен под людей): дедуп по
кулдауну на (камера, тип) — чтобы стоящая/проезжающая машина не спамила каждый
кадр. Номер читаем best-effort через PlateReader, если он доступен.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from pragmata.perception.detector import VEHICLE_NAMES
from pragmata.rules.engine import RuleEvent

if TYPE_CHECKING:
    import numpy as np

    from pragmata.perception.detector import PersonDetector
    from pragmata.perception.plates import PlateReader

log = logging.getLogger("pragmata.vehicles")

COOLDOWN_S = 60.0  # повторный vehicle_seen того же типа не чаще раза в минуту
MIN_AREA_PCT = 1.0  # игнорировать совсем мелкий транспорт (доля площади кадра, %)


class VehicleWatcher:
    """На кадр (когда включено) детектит транспорт, шлёт vehicle_seen с кулдауном."""

    def __init__(
        self,
        detector: PersonDetector,
        conf: float,
        imgsz: int,
        plate_reader: PlateReader | None = None,
    ):
        self.detector = detector
        self.conf = conf
        self.imgsz = imgsz
        self.plate_reader = plate_reader
        self._cooldown: dict[tuple[str, str], float] = {}  # (camera, type) → ts до

    def process(self, camera_id: str, frame: np.ndarray, ts: float) -> list[RuleEvent]:
        dets = self.detector.detect_vehicles(frame, self.conf, self.imgsz)
        if dets.class_id is None or len(dets) == 0:
            return []
        h, w = frame.shape[:2]
        frame_area = float(h * w)
        events: list[RuleEvent] = []
        # крупнейший бокс каждого типа — репрезентант для кулдауна и OCR
        by_type: dict[str, tuple[float, tuple[int, int, int, int]]] = {}
        for xyxy, cls_id in zip(dets.xyxy, dets.class_id, strict=False):
            vtype = VEHICLE_NAMES.get(int(cls_id), "vehicle")
            x0, y0, x1, y1 = (int(v) for v in xyxy)
            area = float((x1 - x0) * (y1 - y0))
            if area / frame_area * 100.0 < MIN_AREA_PCT:
                continue
            if vtype not in by_type or area > by_type[vtype][0]:
                by_type[vtype] = (area, (x0, y0, x1, y1))

        for vtype, (_area, (x0, y0, x1, y1)) in by_type.items():
            key = (camera_id, vtype)
            if ts < self._cooldown.get(key, 0.0):
                continue
            self._cooldown[key] = ts + COOLDOWN_S
            meta: dict[str, object] = {"vehicle_type": vtype}
            if self.plate_reader is not None:
                crop = frame[max(y0, 0) : min(y1, h), max(x0, 0) : min(x1, w)]
                plate = self.plate_reader.read(crop)
                if plate:
                    meta["plate"] = plate
            ev = RuleEvent("vehicle_seen", camera_id, ts, ts, meta=meta)
            ev.frame = frame.copy()
            events.append(ev)
        return events
