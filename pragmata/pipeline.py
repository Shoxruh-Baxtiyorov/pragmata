from __future__ import annotations

import contextlib
import logging
import os
import queue
import threading
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

import cv2

from pragmata.core.redact import redact_url
from pragmata.ingest.motion import MotionGate
from pragmata.ingest.source import make_source
from pragmata.perception.tracker import TrackManager
from pragmata.rules.engine import RuleEngine, RuleEvent

if TYPE_CHECKING:
    from pathlib import Path

    import numpy as np

    from pragmata.config import CameraConfig, GlobalRules, SiteInfo
    from pragmata.objects import AbandonedObjectWatcher
    from pragmata.perception.detector import PersonDetector
    from pragmata.perception.embedder import ClipEmbedder
    from pragmata.perception.face_recog import FaceRecognizer
    from pragmata.perception.faces import FaceCropper
    from pragmata.perception.tracker import TrackState
    from pragmata.sinks import EventSink
    from pragmata.vehicles import VehicleWatcher
    from pragmata.watchlist import WatchlistMatcher

log = logging.getLogger("pragmata.pipeline")

# как часто пробуем распознать лицо ЖИВОГО (ещё видимого) трека — пока не узнан.
# Дёшево (buffalo_l ~50-100мс) при 1-2 людях; даёт узнавание рано и на многих
# кадрах, а не по одному лучшему кадру в конце трека.
FACE_RECHECK_S = 0.8


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
        vehicle_watcher: VehicleWatcher | None = None,
        object_watcher: AbandonedObjectWatcher | None = None,
        base_ts: float | None = None,
        force_file: bool = False,
    ):
        super().__init__(name=f"cam-{camera.id}", daemon=True)
        self.camera = camera
        self.g = global_rules
        self.embedder = embedder
        self.live_dir = live_dir
        self.watchlist = watchlist
        self.face_recog = face_recog
        self.vehicle_watcher = vehicle_watcher
        self.object_watcher = object_watcher
        self._last_object = 0.0
        # «оставленные предметы» включены на камере/зоне? берём dwell из конфига
        self._abandoned: dict[str, object] | None = None
        for _z in camera.zones:
            _a = _z.analytics.get("abandoned_object")
            if isinstance(_a, dict) and _a.get("enabled"):
                self._abandoned = _a
                break
        if self._abandoned is None:
            _a = camera.analytics.get("abandoned_object")
            if isinstance(_a, dict) and _a.get("enabled"):
                self._abandoned = _a
        self.base_ts = base_ts  # архив: реальное время начала записи
        self.force_file = force_file  # архив/NVR: читать URL как конечную запись
        self._last_vehicle = 0.0
        self._last_live = 0.0
        # очередь задач распознавания лиц → отдельный поток (эмбеддинг не стопорит
        # детекцию). Маленькая и non-blocking: если поток занят, кадр пропускаем.
        self._face_q: queue.Queue[tuple[TrackState, np.ndarray, float] | None] = queue.Queue(
            maxsize=4
        )
        self._face_thread: threading.Thread | None = None
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
            base_ts=self.base_ts,
            force_file=self.force_file,
        )
        interval = 1.0 / max(self.camera.process_fps, 0.1)
        last_processed = 0.0
        log.info("[%s] start url=%s", self.camera.id, redact_url(self.camera.url))
        if self.face_recog is not None and self.watchlist is not None:
            self._face_thread = threading.Thread(
                target=self._face_worker_loop, name=f"face-{self.camera.id}", daemon=True
            )
            self._face_thread.start()
        try:
            for frame in src.frames():
                if self.stop_event.is_set():
                    break
                self.stats.frames_read += 1
                # живой кадр 4 раза в секунду — стена ощущается как видео
                # (≤640px jpeg — дёшево); ниже уже нужен MJPEG/WebRTC-стрим
                if self.live_dir is not None and frame.ts - self._last_live >= 0.15:
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

                # живое распознавание лица: пока человек в кадре — узнаём и подписываем
                for st in updated:
                    self._recognize_live(st, frame.image, frame.ts)

                # транспорт (ANPR): отдельный YOLO-проход, дросселируем до ~1/сек —
                # машинам не нужна частота людей, а инференс не бесплатен
                if self.vehicle_watcher is not None and frame.ts - self._last_vehicle >= 1.0:
                    self._last_vehicle = frame.ts
                    for ev in self.vehicle_watcher.process(self.camera.id, frame.image, frame.ts):
                        self.stats.events += 1
                        self.sink.emit_event(ev)

                # оставленные предметы: дросселируем до ~1/сек (сумки не спешат)
                if (
                    self.object_watcher is not None
                    and self._abandoned is not None
                    and frame.ts - self._last_object >= 1.0
                ):
                    self._last_object = frame.ts
                    dwell = float(self._abandoned.get("dwell_s", 30))  # type: ignore[arg-type]
                    for ev in self.object_watcher.process(
                        self.camera.id, frame.image, frame.ts, dwell
                    ):
                        self.stats.events += 1
                        self.sink.emit_event(ev)

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
            if self._face_thread is not None:
                with contextlib.suppress(queue.Full):
                    self._face_q.put_nowait(None)  # разбудить поток на выход
                self._face_thread.join(timeout=1.0)
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

    def _recognize_live(self, st: TrackState, image: np.ndarray, ts: float) -> None:
        """Пока человек ВИДЕН — ставим распознавание лица в ФОНОВЫЙ поток, чтобы
        тяжёлый эмбеддинг (особенно на CPU, ~250мс) не стопорил цикл детекции.
        Троттлим на трек; как узнали — модель больше не дёргаем."""
        if self.face_recog is None or self.watchlist is None:
            return
        if st.person_id is not None:  # уже узнан
            return
        if ts - st.last_face_try < FACE_RECHECK_S:
            return
        st.last_face_try = ts
        # поток занят (очередь полна) → пропускаем кадр, повторим на след. окне
        with contextlib.suppress(queue.Full):
            self._face_q.put_nowait((st, image.copy(), ts))

    def _face_worker_loop(self) -> None:
        """Отдельный поток: разбирает очередь распознавания, не блокируя детекцию."""
        while not self.stop_event.is_set():
            try:
                job = self._face_q.get(timeout=0.4)
            except queue.Empty:
                continue
            if job is None:
                break
            st, image, ts = job
            if st.person_id is not None:  # успели узнать другим кадром
                continue
            try:
                self._do_recognize(st, image, ts)
            except Exception:  # noqa: BLE001 — распознавание не должно ронять камеру
                log.exception("[%s] face recognize failed", self.camera.id)

    def _do_recognize(self, st: TrackState, image: np.ndarray, ts: float) -> None:
        """Тяжёлая часть (в фоновом потоке): эмбеддинг лица + watchlist-матч + событие."""
        if self.face_recog is None or self.watchlist is None:
            return
        emb = self.face_recog.embed(image, st.bbox)
        if emb is None:
            return
        st.face_emb = emb
        hit = self.watchlist.match(None, emb)  # только канал лица (живое узнавание)
        if hit is None:
            return
        st.person_id, st.person_name, st.person_watch = hit
        ev = RuleEvent(
            "watchlist_match" if st.person_watch else "person_recognized",
            self.camera.id,
            st.first_ts,
            ts,
            track=st,
            meta={"person": st.person_name, "person_id": st.person_id},
        )
        ev.frame = image  # уже копия (из очереди)
        self.stats.events += 1
        self.sink.emit_event(ev)

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
        # уже узнали живьём (пока трек был виден) → не дублируем событие,
        # clip_emb выше всё равно посчитан для поиска
        if st.person_id is not None:
            return
        # лицо (insightface) — точный канал watchlist; degradation-first внутри
        if self.face_recog is not None:
            st.face_emb = self.face_recog.embed(st.best_frame, st.best_bbox)
        if self.watchlist is not None and (st.clip_emb is not None or st.face_emb is not None):
            hit = self.watchlist.match(st.clip_emb, st.face_emb)
            if hit is not None:
                st.person_id, st.person_name, st.person_watch = hit
                meta = {"person": st.person_name, "person_id": st.person_id}
                # watch=true → тревога; известный (сотрудник) → info-лог «кто был»
                ev = RuleEvent(
                    "watchlist_match" if st.person_watch else "person_recognized",
                    self.camera.id,
                    st.first_ts,
                    st.last_ts,
                    track=st,
                    meta=meta,
                )
                ev.frame = st.best_frame
                ev.others = []
                self.sink.emit_event(ev)
