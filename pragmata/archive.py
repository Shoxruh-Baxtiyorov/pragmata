"""Ретро-анализ записи (форензика): прогоняем сохранённый видеофайл через тот же
детект-стек, что и live, но быстро (offline) и с реальным временем записи —
события ложатся на настоящую дату и помечаются source=archive.

Тяжёлые модели кэшируются на процесс (детектор/CLIP/лицо) — чтобы повторные
задачи не грузили их заново.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING

import cv2

from pragmata.config import get_settings
from pragmata.media import MediaStore
from pragmata.sinks import DbSink, MultiSink

if TYPE_CHECKING:
    from collections.abc import Callable

    from pragmata.perception.detector import PersonDetector
    from pragmata.perception.embedder import ClipEmbedder
    from pragmata.perception.face_recog import FaceRecognizer

log = logging.getLogger("pragmata.archive")

_detector: PersonDetector | None = None
_embedder: ClipEmbedder | None = None
_face: FaceRecognizer | None = None
_lock = threading.Lock()


def _stack() -> tuple[PersonDetector, ClipEmbedder, FaceRecognizer | None]:
    """Ленивые синглтоны тяжёлых моделей (общие на все архив-задачи)."""
    global _detector, _embedder, _face
    with _lock:
        settings = get_settings()
        if _detector is None:
            from pragmata.perception.detector import PersonDetector

            _detector = PersonDetector(weights=settings.yolo_model)
        if _embedder is None:
            from pragmata.perception.embedder import ClipEmbedder

            _embedder = ClipEmbedder()
        if _face is None and settings.face_recognition:
            from pragmata.perception.face_recog import FaceRecognizer

            _face = FaceRecognizer(settings.models_dir, enabled=True)
    return _detector, _embedder, _face


def frame_count(path: str) -> int:
    cap = cv2.VideoCapture(path)
    n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    cap.release()
    return n


def run_archive_job(
    file_path: str,
    base_ts: float,
    camera_id: str,
    on_progress: Callable[[float], None] = lambda _p: None,
    should_stop: Callable[[], bool] = lambda: False,
) -> int:
    """Прогнать запись → события (source=archive) с реальными датами. → число событий."""
    from pragmata.db.config_store import load_config_from_db
    from pragmata.db.session import make_session_factory
    from pragmata.perception.faces import FaceCropper
    from pragmata.pipeline import CameraWorker
    from pragmata.watchlist import WatchlistMatcher

    settings = get_settings()
    sf = make_session_factory()
    cfg = load_config_from_db(sf)

    cam = next((c for c in cfg.cameras if c.id == camera_id), None)
    if cam is None:
        from pragmata.config import CameraConfig

        cam = CameraConfig(id=camera_id, name=camera_id, url=file_path)
    else:
        cam = cam.model_copy(update={"url": file_path})  # те же зоны/правила, но файл

    detector, embedder, face = _stack()
    faces = FaceCropper(settings.models_dir)
    matcher = WatchlistMatcher(sf)
    sink = MultiSink([DbSink(cfg, MediaStore(settings.media_dir), source="archive")])

    stop = threading.Event()
    worker = CameraWorker(
        cam,
        cfg.rules,
        detector,
        faces,
        sink,
        stop,
        loop_file=False,
        realtime=False,  # быстрее реального времени
        site=cfg.site,
        embedder=embedder,
        watchlist=matcher,
        face_recog=face,
        base_ts=base_ts,  # события лягут на реальную дату записи
    )

    total = frame_count(file_path)
    worker.start()
    try:
        while worker.is_alive():
            if should_stop():
                stop.set()
                break
            if total:
                on_progress(min(0.99, worker.stats.frames_read / total))
            time.sleep(1.0)
    finally:
        worker.join(timeout=30)
    on_progress(1.0)
    log.info("archive: %s → %d событий", file_path, worker.stats.events)
    return worker.stats.events
