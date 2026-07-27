from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import cv2
import supervision as sv

if TYPE_CHECKING:
    import numpy as np

    from pragmata.perception.faces import FaceCropper


@dataclass
class TrackState:
    track_id: int
    camera_id: str
    first_ts: float
    last_ts: float
    frames: int = 0
    dt: float = 0.0  # секунды с прошлого апдейта (для dwell в правилах)
    bbox: tuple[float, float, float, float] = (0, 0, 0, 0)  # xyxy последнего кадра
    conf: float = 0.0
    best_score: float = -1.0
    best_frame: np.ndarray | None = None  # полный кадр в момент лучшего вида
    best_bbox: tuple[float, float, float, float] = (0, 0, 0, 0)
    face_crop: np.ndarray | None = None
    face_score: float = 0.0
    entered_emitted: bool = False
    after_hours_emitted: bool = False
    clip_emb: list[float] | None = None  # заполняется при завершении трека
    face_emb: list[float] | None = None  # эмбеддинг лица (insightface), если видно
    person_id: str | None = None  # watchlist-совпадение (имя ниже)
    person_name: str | None = None
    person_watch: bool = False
    last_face_try: float = 0.0  # троттлинг живого распознавания лица (пока трек виден)
    zone_hits: dict[str, int] = field(default_factory=dict)  # hysteresis-счётчики
    zone_dwell: dict[str, float] = field(default_factory=dict)  # непрерывные секунды в зоне
    zone_miss: dict[str, int] = field(default_factory=dict)  # подряд кадров ВНЕ зоны

    @property
    def lifetime(self) -> float:
        return self.last_ts - self.first_ts

    @property
    def foot(self) -> tuple[float, float]:
        x0, y0, x1, y1 = self.bbox
        return ((x0 + x1) / 2.0, y1)


def _sharpness(image: np.ndarray) -> float:
    if image.size == 0:
        return 0.0
    h = image.shape[0]
    if h > 128:
        scale = 128.0 / h
        image = cv2.resize(image, (max(int(image.shape[1] * scale), 1), 128))
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


class TrackManager:
    """ByteTrack + жизненный цикл треков: best-frame, L0-лицо, завершение по TTL."""

    def __init__(
        self, camera_id: str, faces: FaceCropper | None, lost_ttl: float = 2.0, fps: float = 5.0
    ):
        self.camera_id = camera_id
        self.faces = faces
        self.lost_ttl = lost_ttl
        self._bt = sv.ByteTrack(frame_rate=max(int(fps), 1))
        self.active: dict[int, TrackState] = {}

    def update(
        self, detections: sv.Detections, image: np.ndarray, ts: float
    ) -> tuple[list[TrackState], list[TrackState]]:
        """→ (треки, видимые в этом кадре; треки, завершившиеся к этому кадру)."""
        tracked = self._bt.update_with_detections(detections)
        seen: list[TrackState] = []
        if tracked.tracker_id is not None:
            confs = (
                tracked.confidence if tracked.confidence is not None else [0.0] * len(tracked.xyxy)
            )
            for bbox, tid, conf in zip(tracked.xyxy, tracked.tracker_id, confs, strict=False):
                if tid is None:
                    continue
                tid = int(tid)
                st = self.active.get(tid)
                if st is None:
                    st = TrackState(tid, self.camera_id, first_ts=ts, last_ts=ts)
                    self.active[tid] = st
                    st.dt = 0.0
                else:
                    st.dt = ts - st.last_ts
                st.last_ts = ts
                st.frames += 1
                st.bbox = (float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3]))
                st.conf = float(conf)
                self._maybe_update_best(st, image)
                seen.append(st)

        ended: list[TrackState] = []
        for tid, st in list(self.active.items()):
            if ts - st.last_ts > self.lost_ttl:
                ended.append(st)
                del self.active[tid]
        return seen, ended

    def flush(self) -> list[TrackState]:
        """Завершить все живые треки (остановка пайплайна)."""
        ended = list(self.active.values())
        self.active.clear()
        return ended

    def _maybe_update_best(self, st: TrackState, image: np.ndarray) -> None:
        x0, y0, x1, y1 = (int(v) for v in st.bbox)
        h, w = image.shape[:2]
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, w), min(y1, h)
        if x1 <= x0 or y1 <= y0:
            return
        crop = image[y0:y1, x0:x1]
        score = _sharpness(crop) * float((x1 - x0) * (y1 - y0))
        if score <= st.best_score:
            return
        st.best_score = score
        st.best_frame = image.copy()
        st.best_bbox = st.bbox
        if self.faces is not None and self.faces.available:
            found = self.faces.best_face(crop)
            if found is not None and found[1] > st.face_score:
                st.face_crop, st.face_score = found
