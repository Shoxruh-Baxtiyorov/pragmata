from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from soqchi.core.redact import redact_url
from soqchi.ingest.motion import MotionGate
from soqchi.ingest.source import make_source
from soqchi.perception.tracker import TrackManager
from soqchi.rules.engine import RuleEngine

if TYPE_CHECKING:
    from soqchi.config import CameraConfig, GlobalRules, SiteInfo
    from soqchi.perception.detector import PersonDetector
    from soqchi.perception.faces import FaceCropper
    from soqchi.sinks import EventSink

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
    ):
        super().__init__(name=f"cam-{camera.id}", daemon=True)
        self.camera = camera
        self.g = global_rules
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
                if frame.ts - last_processed < interval:
                    continue
                last_processed = frame.ts

                if not self.gate.check(
                    frame.image, frame.ts, force_active=bool(self.tracks.active)
                ):
                    continue

                detections = self.detector.detect(frame.image, self.camera.detect_conf)
                updated, ended = self.tracks.update(detections, frame.image, frame.ts)
                events = self.rules.process(updated, ended, frame.ts, frame.image.shape)

                self.stats.frames_processed += 1
                self.stats.detections += len(detections)
                self.stats.active_tracks = len(self.tracks.active)

                for st in ended:
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
                    self.sink.emit_track_end(st)
            src.close()
            log.info("[%s] stopped: %s", self.camera.id, self.stats.snapshot())
