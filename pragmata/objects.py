"""Стационарные объекты: YOLO ловит объект (сумка / транспорт), мини-трекер по
ближайшему центру следит, чтобы он стоял без движения. Отсюда:
  - оставленные предметы (сумка/рюкзак/чемодан стоит без владельца);
  - простой техники / неправильная парковка (транспорт стоит дольше порога,
    в т.ч. в запретной зоне).

Без отдельного ByteTrack: сопоставление по ближайшему центру в пределах move_thr.
Упрощение: «без владельца» не проверяем — стационарности достаточно для сигнала.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from pragmata.perception.detector import BAG_CLASS_IDS, VEHICLE_CLASS_IDS
from pragmata.rules.engine import RuleEvent

if TYPE_CHECKING:
    import numpy as np
    import supervision as sv

    from pragmata.perception.detector import PersonDetector

log = logging.getLogger("pragmata.objects")

_STALE_S = 3.0  # объект не виден дольше — забываем трек
_MOVE_FRAC = 0.05  # «стационарен», если центр сдвинулся меньше этой доли max(h,w)

Box = tuple[int, int, int, int]


@dataclass
class _Obj:
    cx: float
    cy: float
    box: Box
    first_ts: float
    last_ts: float
    alerted: bool = False


def _centers(dets: sv.Detections) -> list[tuple[float, float, Box]]:
    out: list[tuple[float, float, Box]] = []
    if dets.xyxy is not None:
        for xyxy in dets.xyxy:
            x0, y0, x1, y1 = (float(v) for v in xyxy)
            out.append(((x0 + x1) / 2, (y0 + y1) / 2, (int(x0), int(y0), int(x1), int(y1))))
    return out


def _track(
    tracked: list[_Obj], curr: list[tuple[float, float, Box]], ts: float, move_thr: float
) -> None:
    """Продлить существующие треки ближайшей детекцией; новые — добавить; старые убрать."""
    used: set[int] = set()
    for t in tracked:
        best, best_d = -1, move_thr
        for i, (cx, cy, _b) in enumerate(curr):
            if i in used:
                continue
            d = ((cx - t.cx) ** 2 + (cy - t.cy) ** 2) ** 0.5
            if d < best_d:
                best_d, best = d, i
        if best >= 0:
            used.add(best)
            cx, cy, box = curr[best]
            t.cx, t.cy, t.box, t.last_ts = cx, cy, box, ts
    for i, (cx, cy, box) in enumerate(curr):
        if i not in used:
            tracked.append(_Obj(cx=cx, cy=cy, box=box, first_ts=ts, last_ts=ts))
    tracked[:] = [t for t in tracked if ts - t.last_ts <= _STALE_S]


def _newly_over(tracked: list[_Obj], dwell_s: float) -> list[_Obj]:
    """Объекты, ТОЛЬКО ЧТО перешедшие порог стационарности (для однократного алерта)."""
    out = []
    for t in tracked:
        if not t.alerted and (t.last_ts - t.first_ts) >= dwell_s:
            t.alerted = True
            out.append(t)
    return out


class AbandonedObjectWatcher:
    """Сумки: стационарность дольше dwell → событие abandoned_object."""

    def __init__(self, detector: PersonDetector, conf: float = 0.35, imgsz: int = 640):
        self.detector = detector
        self.conf = conf
        self.imgsz = imgsz
        self._tracked: dict[str, list[_Obj]] = {}

    def process(
        self, camera_id: str, frame: np.ndarray, ts: float, dwell_s: float
    ) -> list[RuleEvent]:
        dets = self.detector.detect_classes(frame, BAG_CLASS_IDS, self.conf, self.imgsz)
        move_thr = _MOVE_FRAC * max(frame.shape[0], frame.shape[1])
        tracked = self._tracked.setdefault(camera_id, [])
        _track(tracked, _centers(dets), ts, move_thr)
        events: list[RuleEvent] = []
        for t in _newly_over(tracked, dwell_s):
            log.warning("abandoned object cam=%s dwell=%.0fs", camera_id, t.last_ts - t.first_ts)
            ev = RuleEvent(
                "abandoned_object", camera_id, t.first_ts, ts,
                meta={"dwell_s": round(t.last_ts - t.first_ts, 1)},
            )
            ev.frame = frame.copy()
            events.append(ev)
        return events


class VehicleStationaryWatcher:
    """Транспорт: стационарность дольше dwell. Возвращает НОВО-стационарные машины
    (cx, cy, box, first_ts) — пайплайн решает, простой это или парковка в зоне."""

    def __init__(self, detector: PersonDetector, conf: float = 0.3, imgsz: int = 640):
        self.detector = detector
        self.conf = conf
        self.imgsz = imgsz
        self._tracked: dict[str, list[_Obj]] = {}

    def process(
        self, camera_id: str, frame: np.ndarray, ts: float, dwell_s: float
    ) -> list[tuple[float, float, Box, float]]:
        dets = self.detector.detect_classes(frame, VEHICLE_CLASS_IDS, self.conf, self.imgsz)
        move_thr = _MOVE_FRAC * max(frame.shape[0], frame.shape[1])
        tracked = self._tracked.setdefault(camera_id, [])
        _track(tracked, _centers(dets), ts, move_thr)
        return [(t.cx, t.cy, t.box, t.first_ts) for t in _newly_over(tracked, dwell_s)]
