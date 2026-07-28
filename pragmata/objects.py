"""Оставленные предметы: YOLO ловит сумку/рюкзак/чемодан, мини-трекер следит за
стационарностью — предмет, стоящий без движения дольше порога, помечается
«оставленным». Без отдельного ByteTrack: сопоставление по ближайшему центру.

Упрощение: «без владельца» не проверяем (нет человека рядом) — считаем оставленным
любой предмет, простоявший неподвижно dwell_s. Для реального объекта достаточно,
для строгости позже можно добавить проверку отсутствия людей рядом.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

from pragmata.perception.detector import BAG_CLASS_IDS
from pragmata.rules.engine import RuleEvent

if TYPE_CHECKING:
    import numpy as np

    from pragmata.perception.detector import PersonDetector

log = logging.getLogger("pragmata.objects")

_STALE_S = 3.0  # предмет не виден дольше — забываем трек
_MOVE_FRAC = 0.05  # «стационарен», если центр сдвинулся меньше этой доли max(h,w)


@dataclass
class _Obj:
    cx: float
    cy: float
    box: tuple[int, int, int, int]
    first_ts: float
    last_ts: float
    alerted: bool = False


class AbandonedObjectWatcher:
    """Детектит сумки, отслеживает стационарность, шлёт abandoned_object по dwell."""

    def __init__(self, detector: PersonDetector, conf: float = 0.35, imgsz: int = 640):
        self.detector = detector
        self.conf = conf
        self.imgsz = imgsz
        self._tracked: dict[str, list[_Obj]] = {}

    def process(
        self, camera_id: str, frame: np.ndarray, ts: float, dwell_s: float
    ) -> list[RuleEvent]:
        dets = self.detector.detect_classes(frame, BAG_CLASS_IDS, self.conf, self.imgsz)
        h, w = frame.shape[:2]
        move_thr = _MOVE_FRAC * max(h, w)
        curr: list[tuple[float, float, tuple[int, int, int, int]]] = []
        if dets.xyxy is not None:
            for xyxy in dets.xyxy:
                x0, y0, x1, y1 = (float(v) for v in xyxy)
                curr.append(((x0 + x1) / 2, (y0 + y1) / 2, (int(x0), int(y0), int(x1), int(y1))))

        tracked = self._tracked.setdefault(camera_id, [])
        used: set[int] = set()
        # продлеваем существующие треки ближайшей детекцией (в пределах move_thr)
        for t in tracked:
            best, best_d = -1, move_thr
            for i, (cx, cy, _box) in enumerate(curr):
                if i in used:
                    continue
                d = ((cx - t.cx) ** 2 + (cy - t.cy) ** 2) ** 0.5
                if d < best_d:
                    best_d, best = d, i
            if best >= 0:
                used.add(best)
                cx, cy, box = curr[best]
                t.cx, t.cy, t.box, t.last_ts = cx, cy, box, ts
        # новые детекции → новые треки
        for i, (cx, cy, box) in enumerate(curr):
            if i not in used:
                tracked.append(_Obj(cx=cx, cy=cy, box=box, first_ts=ts, last_ts=ts))
        # чистим устаревшие
        tracked[:] = [t for t in tracked if ts - t.last_ts <= _STALE_S]

        events: list[RuleEvent] = []
        for t in tracked:
            if not t.alerted and (t.last_ts - t.first_ts) >= dwell_s:
                t.alerted = True
                held = t.last_ts - t.first_ts
                log.warning("abandoned object cam=%s dwell=%.0fs", camera_id, held)
                ev = RuleEvent(
                    "abandoned_object",
                    camera_id,
                    t.first_ts,
                    ts,
                    meta={"dwell_s": round(t.last_ts - t.first_ts, 1)},
                )
                ev.frame = frame.copy()
                events.append(ev)
        return events
