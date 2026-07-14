from __future__ import annotations

import argparse
import logging
import signal
import threading
import time
from typing import TYPE_CHECKING

from soqchi.alerts import BotSink, ClipSink
from soqchi.clips import ClipWorker, SegmentRecorder
from soqchi.config import SiteConfig, get_settings, load_site_config
from soqchi.media import MediaStore
from soqchi.perception.detector import PersonDetector
from soqchi.perception.embedder import ClipEmbedder
from soqchi.perception.faces import FaceCropper
from soqchi.pipeline import CameraWorker
from soqchi.rules.engine import RuleEvent
from soqchi.sinks import ConsoleSink, DbSink, EventSink, JsonlSink, MultiSink

if TYPE_CHECKING:
    import uuid

OFFLINE_AFTER_S = 30.0  # нет кадров дольше — camera_offline


def build_sink(
    kinds: set[str], cfg: SiteConfig, media: MediaStore
) -> tuple[MultiSink, DbSink | None]:
    sinks: list[EventSink] = [ConsoleSink()]
    db_sink: DbSink | None = None
    if "db" in kinds:
        db_sink = DbSink(cfg, media)
        sinks.append(db_sink)
    if "jsonl" in kinds:
        sinks.append(JsonlSink(get_settings().media_dir.parent / "events.jsonl", media))
    return MultiSink(sinks), db_sink


class CameraWatchdog:
    """Кадры перестали идти → camera_offline; пошли снова → camera_online."""

    def __init__(self, workers: list[CameraWorker], sink: EventSink):
        self.workers = workers
        self.sink = sink
        now = time.time()
        self._state = {w.camera.id: {"reads": -1, "changed": now, "online": True} for w in workers}

    def check(self) -> None:
        now = time.time()
        for w in self.workers:
            st = self._state[w.camera.id]
            reads = w.stats.frames_read
            if reads != st["reads"]:
                st["reads"], st["changed"] = reads, now
                if not st["online"]:
                    st["online"] = True
                    self._emit(w.camera.id, "camera_online", now)
            elif st["online"] and now - float(st["changed"]) > OFFLINE_AFTER_S:
                st["online"] = False
                self._emit(w.camera.id, "camera_offline", float(st["changed"]))

    def _emit(self, camera_id: str, kind: str, ts: float) -> None:
        self.sink.emit_event(RuleEvent(kind, camera_id, ts, time.time()))


def main() -> None:
    parser = argparse.ArgumentParser("soqchi", description="Soqchi AI — camera pipeline (week 2)")
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
    sink, db_sink = build_sink({s.strip() for s in args.sink.split(",")}, cfg, media)

    log.info("loading detector %s ...", settings.yolo_model)
    detector = PersonDetector(weights=settings.yolo_model)
    faces = FaceCropper(settings.models_dir)
    log.info("face detector (L0): %s", "on" if faces.available else "OFF (нет models/yunet)")
    embedder = ClipEmbedder()  # ленивый: веса скачаются при первом завершённом треке

    stop_event = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop_event.set())
    signal.signal(signal.SIGTERM, lambda *_: stop_event.set())

    # --- клипы: кольцевые буферы + отложенная нарезка -----------------------
    data_root = settings.media_dir.parent
    clip_cams = [c for c in cfg.cameras if c.clips.enabled]
    recorders = [SegmentRecorder(c, data_root / "ring", stop_event) for c in clip_cams]
    clip_worker: ClipWorker | None = None
    if clip_cams:
        session_factory = db_sink._session_factory if db_sink is not None else None

        def persist_clip(event_id: uuid.UUID, path: str) -> None:
            if session_factory is not None:
                from soqchi.db.queries import update_clip_path

                update_clip_path(session_factory, event_id, path)

        clip_worker = ClipWorker(data_root / "ring", data_root / "clips", stop_event, persist_clip)
        sink.sinks.append(ClipSink(clip_worker, cfg))
        clip_worker.start()
        for r in recorders:
            r.start()
        log.info(
            "clips: on (%d камер, кольцо %d мин)", len(clip_cams), clip_cams[0].clips.ring_minutes
        )
    else:
        log.info("clips: off (нет камер с clips.enabled)")

    # --- telegram ------------------------------------------------------------
    bot = None
    digest_thread: threading.Thread | None = None
    if settings.telegram_bot_token and db_sink is not None:
        from soqchi.bot.service import BotService
        from soqchi.db.queries import get_clip_path, save_feedback
        from soqchi.digest import build_digest_text, seconds_until

        sf = db_sink._session_factory

        def find_person_cmd(query: str) -> list[tuple[str, str]]:
            from soqchi.db.queries import find_tracks_by_embedding

            emb = embedder.embed_text(query)
            tracks = find_tracks_by_embedding(sf, emb, hours=48, limit=5)
            cam_names = {c.id: c.name for c in cfg.cameras}
            out: list[tuple[str, str]] = []
            for t in tracks:
                if t.best_frame_path:
                    caption = (
                        f"{t.started_at.astimezone().strftime('%d.%m %H:%M:%S')} · "
                        f"{cam_names.get(t.camera_id, t.camera_id)}"
                    )
                    out.append((str(settings.media_dir / t.best_frame_path), caption))
            return out

        agent_answer = None
        if settings.openrouter_api_key:
            from soqchi.agent.runner import AgentRunner
            from soqchi.agent.tools import AgentTools

            runner = AgentRunner(
                settings.openrouter_api_key,
                settings.openrouter_model,
                AgentTools(sf, cfg, embedder),
                cfg,
            )
            agent_answer = runner.answer
            log.info("agent: on (%s)", settings.openrouter_model)
        else:
            log.info("agent: off (нет OPENROUTER_API_KEY)")

        bot = BotService(
            settings.telegram_bot_token,
            settings.allowed_chat_ids,
            cfg,
            get_clip_path=lambda eid: get_clip_path(sf, eid),
            save_feedback=lambda eid, chat, verdict: save_feedback(sf, eid, chat, verdict),
            build_digest=lambda: build_digest_text(sf, cfg),
            find_person=find_person_cmd,
            agent_answer=agent_answer,
        )
        bot.media_root = settings.media_dir
        bot.start()
        sink.sinks.append(BotSink(bot))

        def _digest_loop() -> None:
            while not stop_event.is_set():
                wait = seconds_until(cfg.site.digest_time, cfg.site.timezone, time.time())
                if stop_event.wait(wait):
                    return
                assert bot is not None
                bot.broadcast_text(build_digest_text(sf, cfg))

        digest_thread = threading.Thread(target=_digest_loop, name="digest", daemon=True)
        digest_thread.start()
        log.info("digest: ежедневно в %s (%s)", cfg.site.digest_time, cfg.site.timezone)
    else:
        log.info("telegram: off (%s)", "нет TELEGRAM_BOT_TOKEN" if db_sink else "нужен --sink db")

    # --- камеры ---------------------------------------------------------------
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
            site=cfg.site,
            embedder=embedder,
        )
        for cam in cfg.cameras
    ]
    for w in workers:
        w.start()
    watchdog = CameraWatchdog(workers, sink)

    started = time.time()
    try:
        while not stop_event.is_set():
            time.sleep(5)
            watchdog.check()
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
        # рекордеры обязаны пережить terminate ffmpeg-детей ДО выхода интерпретатора,
        # иначе сироты-ffmpeg держат кольцо и пайпы
        for r in recorders:
            r.join(timeout=8)
        if clip_worker is not None:
            clip_worker.join(timeout=3)
        if bot is not None:
            bot.stop()
        total = {
            "events": sum(w.stats.events for w in workers),
            "processed": sum(w.stats.frames_processed for w in workers),
        }
        log.info("done: %s", total)


if __name__ == "__main__":
    main()
