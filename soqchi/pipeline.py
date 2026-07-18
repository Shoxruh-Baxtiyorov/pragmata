from __future__ import annotations

import logging
import os
import threading
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import cv2

from soqchi.core.redact import redact_url
from soqchi.ingest.motion import MotionGate
from soqchi.ingest.source import make_source
from soqchi.perception.tracker import TrackManager
from soqchi.rules.engine import RuleEngine, RuleEvent

if TYPE_CHECKING:
    from pathlib import Path

    import numpy as np

    from soqchi.config import CameraConfig, GlobalRules, SiteInfo
    from soqchi.perception.detector import PersonDetector
    from soqchi.perception.embedder import ClipEmbedder
    from soqchi.perception.face_recog import FaceRecognizer
    from soqchi.perception.faces import FaceCropper
    from soqchi.perception.tracker import TrackState
    from soqchi.sinks import EventSink
    from soqchi.watchlist import WatchlistMatcher

log = logging.getLogger("soqchi.pipeline")


@dataclass
class CameraStats:
    frames_read: int = 0
    frames_processed: int = 0
    detections: int = 0
    events: int = 0
    active_tracks: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def snapshot(self) -> dict[str, int]:
        with self._lock:
            return {
                "read": self.frames_read,
                "processed": self.frames_processed,
                "detections": self.detections,
                "events": self.events,
                "tracks": self.active_tracks,
            }


class CameraWorker(threading.Thread):
    """Один поток на камеру: source → motion gate → YOLO → tracking → rules → sink."""

    def __init__(
        self,
        camera: CameraConfig,
        global_rules: GlobalRules,
        detector: PersonDetector,
        faces: FaceCropper | None,
        sink: EventSink,
        stop_event: threading.Event,
        loop_file: bool = False,
        realtime: bool = True,
        site: SiteInfo | None = None,
        embedder: ClipEmbedder | None = None,
        live_dir: Path | None = None,
        watchlist: WatchlistMatcher | None = None,
        face_recog: FaceRecognizer | None = None,
    ):
        super().__init__(name=f"cam-{camera.id}", daemon=True)
        self.camera = camera
        self.g = global_rules
        self.embedder = embedder
        self.live_dir = live_dir
        self.watchlist = watchlist
        self.face_recog = face_recog
        self._last_live = 0.0
        self.detector = detector
        self.sink = sink
        self.stop_event = stop_event
        self.loop_file = loop_file
        self.realtime = realtime
        self.stats = CameraStats()

        self.gate = MotionGate(camera.motion)
        self.tracks = TrackManager(
            camera.id, faces, lost_ttl=global_rules.track_lost_ttl, fps=camera.process_fps
        )
        self.rules = RuleEngine(camera, global_rules, site)

    def run(self) -> None:
        src = make_source(
            self.camera.url,
            loop=self.loop_file,
            realtime=self.realtime,
            stop_check=self.stop_event.is_set,
        )
        interval = 1.0 / max(self.camera.process_fps, 0.1)
        last_processed = 0.0
        log.info("[%s] start url=%s", self.camera.id, redact_url(self.camera.url))
        try:
            for frame in src.frames():
                if self.stop_event.is_set():
                    break
                self.stats.frames_read += 1
                if self.live_dir is not None and frame.ts - self._last_live >= 2.0:
                    self._last_live = frame.ts
                    self._write_live(frame.image)
                if frame.ts - last_processed < interval:
                    continue
                last_processed = frame.ts

                if not self.gate.check(
                    frame.image, frame.ts, force_active=bool(self.tracks.active)
                ):
                    continue

                detections = self.detector.detect(
                    frame.image, self.camera.detect_conf, self.camera.detect_imgsz
                )
                updated, ended = self.tracks.update(detections, frame.image, frame.ts)
                events = self.rules.process(updated, ended, frame.ts, frame.image.shape)
                # для событий с ВИДИМЫМ сейчас треком доказательство = текущий кадр
                # со ВСЕМИ людьми (виновник + остальные), а не best-frame с одним боксом.
                # exited-события трек уже не виден → оставляем его best-frame.
                visible = {id(st) for st in updated}
                for ev in events:
                    if ev.track is not None and id(ev.track) in visible:
                        ev.frame = frame.image.copy()
                        ev.others = [o.bbox for o in updated if o is not ev.track]

                self.stats.frames_processed += 1
                self.stats.detections += len(detections)
                self.stats.active_tracks = len(self.tracks.active)

                for st in ended:
                    self._embed_track(st)
                    self.sink.emit_track_end(st)
                for ev in events:
                    self.stats.events += 1
                    self.sink.emit_event(ev)
        finally:
            # остановка: закрыть живые треки, чтобы exited-события не потерялись
            ended = self.tracks.flush()
            if ended:
                ts = max(st.last_ts for st in ended)
                for ev in self.rules.process([], ended, ts, (1, 1)):
                    self.sink.emit_event(ev)
                for st in ended:
                    self._embed_track(st)
                    self.sink.emit_track_end(st)
            src.close()
            log.info("[%s] stopped: %s", self.camera.id, self.stats.snapshot())

    def _write_live(self, image: np.ndarray) -> None:
        """Свежий кадр для live-стены дашборда (атомарная запись, ≤640px)."""
        assert self.live_dir is not None
        try:
            h, w = image.shape[:2]
            if w > 640:
                image = cv2.resize(image, (640, max(int(h * 640 / w), 1)))
            self.live_dir.mkdir(parents=True, exist_ok=True)
            # расширение должно остаться .jpg — по нему cv2 выбирает кодек
            tmp = self.live_dir / f".{self.camera.id}.tmp.jpg"
            cv2.imwrite(str(tmp), image, [cv2.IMWRITE_JPEG_QUALITY, 80])
            os.replace(tmp, self.live_dir / f"{self.camera.id}.jpg")
        except Exception:  # noqa: BLE001 — live-кадр не должен ронять камеру
            log.exception("[%s] live frame write failed", self.camera.id)

    def _embed_track(self, st: TrackState) -> None:
        """CLIP-эмбеддинг тела + эмбеддинг лица + watchlist-матч — при завершении трека."""
        if self.embedder is None or st.best_frame is None:
            return
        x0, y0, x1, y1 = (int(v) for v in st.best_bbox)
        h, w = st.best_frame.shape[:2]
        crop = st.best_frame[max(y0, 0) : min(y1, h), max(x0, 0) : min(x1, w)]
        try:
            st.clip_emb = self.embedder.embed_image(crop)
        except Exception:  # noqa: BLE001 — эмбеддинг не должен ронять камеру
            log.exception("[%s] clip embed failed", self.camera.id)
            return
        # лицо (insightface) — точный канал watchlist; degradation-first внутри
        if self.face_recog is not None:
            st.face_emb = self.face_recog.embed(st.best_frame, st.best_bbox)
        if self.watchlist is not None and (st.clip_emb is not None or st.face_emb is not None):
            hit = self.watchlist.match(st.clip_emb, st.face_emb)
            if hit is not None:
                st.person_id, st.person_name, st.person_watch = hit
                if st.person_watch:
                    ev = RuleEvent(
                        "watchlist_match",
                        self.camera.id,
                        st.first_ts,
                        st.last_ts,
                        track=st,
                        meta={"person": st.person_name, "person_id": st.person_id},
                    )
                    ev.frame = st.best_frame
                    ev.others = []
                    self.sink.emit_event(ev)
