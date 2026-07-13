from __future__ import annotations

import argparse
import logging
import signal
import threading
import time

from soqchi.config import SiteConfig, get_settings, load_site_config
from soqchi.media import MediaStore
from soqchi.perception.detector import PersonDetector
from soqchi.perception.faces import FaceCropper
from soqchi.pipeline import CameraWorker
from soqchi.sinks import ConsoleSink, DbSink, EventSink, JsonlSink, MultiSink


def build_sink(kinds: set[str], cfg: SiteConfig, media: MediaStore) -> MultiSink:
    sinks: list[EventSink] = [ConsoleSink()]
    if "db" in kinds:
        sinks.append(DbSink(cfg, media))
    if "jsonl" in kinds:
        sinks.append(JsonlSink(get_settings().media_dir.parent / "events.jsonl", media))
    return MultiSink(sinks)


def main() -> None:
    parser = argparse.ArgumentParser("soqchi", description="Soqchi AI — camera pipeline (week 1)")
    parser.add_argument("--config", required=True, help="YAML конфиг объекта")
    parser.add_argument("--sink", default="db", help="куда писать события: db | jsonl | db,jsonl")
    parser.add_argument("--duration", type=float, default=0, help="сек; 0 = работать до Ctrl+C")
    parser.add_argument("--loop-file", action="store_true", help="зациклить файловые источники")
    parser.add_argument(
        "--offline",
        action="store_true",
        help="файлы читать быстрее реального времени (golden-прогоны)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    log = logging.getLogger("soqchi")

    cfg = load_site_config(args.config)
    settings = get_settings()
    media = MediaStore(settings.media_dir)
    sink = build_sink({s.strip() for s in args.sink.split(",")}, cfg, media)

    log.info("loading detector (первый запуск скачает yolo11n.pt)...")
    detector = PersonDetector()
    faces = FaceCropper(settings.models_dir)
    log.info("face detector (L0): %s", "on" if faces.available else "OFF (нет models/yunet)")

    stop_event = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop_event.set())
    signal.signal(signal.SIGTERM, lambda *_: stop_event.set())

    workers = [
        CameraWorker(
            cam,
            cfg.rules,
            detector,
            faces,
            sink,
            stop_event,
            loop_file=args.loop_file,
            realtime=not args.offline,
        )
        for cam in cfg.cameras
    ]
    for w in workers:
        w.start()

    started = time.time()
    try:
        while not stop_event.is_set():
            time.sleep(5)
            for w in workers:
                log.info("[%s] %s", w.camera.id, w.stats.snapshot())
            if args.duration and time.time() - started >= args.duration:
                stop_event.set()
            if all(not w.is_alive() for w in workers):
                stop_event.set()
    finally:
        stop_event.set()
        for w in workers:
            w.join(timeout=15)
        total = {
            "events": sum(w.stats.events for w in workers),
            "processed": sum(w.stats.frames_processed for w in workers),
        }
        log.info("done: %s", total)


if __name__ == "__main__":
    main()
