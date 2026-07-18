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
    from pathlib import Path

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


class _CameraGroup:
    """Перезапускаемая группа: рекордеры + клип-воркер + камеры + вотчдог.

    Живёт до group_stop; при hot-reload конфига пересоздаётся с нуля. Постоянные
    сервисы (бот/VLM/дайджест) в MultiSink `base_sink` переживают перезапуск.
    """

    def __init__(
        self,
        cfg: SiteConfig,
        base_sink: MultiSink,
        detector: PersonDetector,
        faces: FaceCropper,
        embedder: ClipEmbedder,
        data_root: Path,
        db_sink: DbSink | None,
        group_stop: threading.Event,
        *,
        loop_file: bool,
        realtime: bool,
    ):
        self.group_stop = group_stop
        self.recorders: list[SegmentRecorder] = []
        self.clip_worker: ClipWorker | None = None

        # клип-синк — только на время жизни группы (кольца зависят от списка камер)
        sink = MultiSink(list(base_sink.sinks))
        clip_cams = [c for c in cfg.cameras if c.clips.enabled]
        if clip_cams and db_sink is not None:
            sf = db_sink._session_factory

            def persist_clip(event_id: uuid.UUID, path: str) -> None:
                from soqchi.db.queries import update_clip_path

                update_clip_path(sf, event_id, path)

            self.recorders = [
                SegmentRecorder(c, data_root / "ring", group_stop) for c in clip_cams
            ]
            self.clip_worker = ClipWorker(
                data_root / "ring", data_root / "clips", group_stop, persist_clip
            )
            sink.sinks.append(ClipSink(self.clip_worker, cfg))

        self.workers = [
            CameraWorker(
                cam,
                cfg.rules,
                detector,
                faces,
                sink,
                group_stop,
                loop_file=loop_file,
                realtime=realtime,
                site=cfg.site,
                embedder=embedder,
                live_dir=data_root / "live",
            )
            for cam in cfg.cameras
        ]
        self.watchdog = CameraWatchdog(self.workers, sink)

    def start(self) -> None:
        if self.clip_worker is not None:
            self.clip_worker.start()
        for r in self.recorders:
            r.start()
        for w in self.workers:
            w.start()

    def shutdown(self) -> None:
        self.group_stop.set()
        for w in self.workers:
            w.join(timeout=15)
        # рекордеры обязаны пережить terminate ffmpeg-детей — иначе сироты держат пайпы
        for r in self.recorders:
            r.join(timeout=8)
        if self.clip_worker is not None:
            self.clip_worker.join(timeout=3)


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
    parser.add_argument(
        "--no-bot",
        action="store_true",
        help="не поднимать Telegram-бота (тестовые прогоны рядом с боевым инстансом: "
        "два поллера одного токена конфликтуют)",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    log = logging.getLogger("soqchi")

    settings = get_settings()
    media = MediaStore(settings.media_dir)
    data_root = settings.media_dir.parent

    # база всегда есть → строим db-синк; конфиг из YAML сидим в БД однократно
    yaml_cfg = load_site_config(args.config)
    sink, db_sink = build_sink({s.strip() for s in args.sink.split(",")}, yaml_cfg, media)
    if db_sink is not None:
        from soqchi.db.config_store import (
            config_version,
            load_config_from_db,
            seed_config_from_yaml,
        )

        seed_config_from_yaml(db_sink._session_factory, yaml_cfg)
        cfg = load_config_from_db(db_sink._session_factory)
        log.info(
            "config: из БД (%d камер); правки из UI/чата подхватятся на лету", len(cfg.cameras)
        )
    else:
        cfg = yaml_cfg  # jsonl-режим без БД — статичный YAML, без hot-reload

    log.info("loading detector %s ...", settings.yolo_model)
    detector = PersonDetector(weights=settings.yolo_model)
    faces = FaceCropper(settings.models_dir)
    log.info("face detector (L0): %s", "on" if faces.available else "OFF (нет models/yunet)")
    embedder = ClipEmbedder()  # ленивый: веса скачаются при первом завершённом треке

    stop_event = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop_event.set())
    signal.signal(signal.SIGTERM, lambda *_: stop_event.set())

    # --- telegram ------------------------------------------------------------
    bot = None
    digest_thread: threading.Thread | None = None
    if settings.telegram_bot_token and db_sink is not None and not args.no_bot:
        from soqchi.bot.service import BotService
        from soqchi.db.queries import get_clip_path, save_feedback
        from soqchi.digest import build_digest_text, seconds_until

        sf = db_sink._session_factory

        def find_person_cmd(query: str) -> list[tuple[str, str]]:
            from soqchi.investigation import find_people

            found = find_people(
                sf, embedder, query, hours=48, limit=5, min_margin=settings.find_min_margin
            )
            cam_names = {c.id: c.name for c in cfg.cameras}
            out: list[tuple[str, str]] = []
            for t, sim in found:
                if t.best_frame_path:
                    caption = (
                        f"{t.started_at.astimezone().strftime('%d.%m %H:%M:%S')} · "
                        f"{cam_names.get(t.camera_id, t.camera_id)} · сходство {sim:.0%}"
                    )
                    out.append((str(settings.media_dir / t.best_frame_path), caption))
            return out

        agent_answer = None
        if settings.llm_api_key:
            from soqchi.agent.runner import AgentRunner
            from soqchi.agent.tools import AgentTools

            runner = AgentRunner(
                settings.llm_base_url,
                settings.llm_api_key,
                settings.llm_model,
                AgentTools(sf, cfg, embedder),
                cfg,
            )
            agent_answer = runner.answer
            log.info("agent: on (%s @ %s)", settings.llm_model, settings.llm_base_url)
        else:
            log.info("agent: off (нет LLM_API_KEY)")

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

    # --- VLM-описания alert-событий (независимо от бота: описания нужны и в БД) ---
    if settings.llm_api_key and settings.vlm_model and db_sink is not None:
        from soqchi.alerts import VlmSink
        from soqchi.db.queries import update_description
        from soqchi.vlm import HourBudget, VlmDescriber, VlmWorker

        vlm_sf = db_sink._session_factory

        def persist_description(eid: uuid.UUID, text: str, meta: dict[str, object]) -> None:
            update_description(vlm_sf, eid, text, meta)

        vlm_worker = VlmWorker(
            VlmDescriber(settings.llm_base_url, settings.llm_api_key, settings.vlm_model),
            HourBudget(settings.vlm_max_per_hour),
            persist=persist_description,
            notify=(bot.attach_description if bot is not None else None),
            stop_event=stop_event,
        )
        vlm_worker.start()
        sink.sinks.append(VlmSink(vlm_worker, cfg))
        log.info("vlm: on (%s, лимит %d/час)", settings.vlm_model, settings.vlm_max_per_hour)
    else:
        log.info("vlm: off")

    # --- камеры: перезапускаемая группа с hot-reload по config_version --------
    reloadable = db_sink is not None and not args.loop_file
    started = time.time()
    try:
        while not stop_event.is_set():
            if db_sink is not None:
                from soqchi.db.config_store import config_version, load_config_from_db

                cfg = load_config_from_db(db_sink._session_factory)
                cur_ver = config_version(db_sink._session_factory)
            else:
                cur_ver = 0

            group_stop = threading.Event()
            group = _CameraGroup(
                cfg,
                sink,
                detector,
                faces,
                embedder,
                data_root,
                db_sink,
                group_stop,
                loop_file=args.loop_file,
                realtime=not args.offline,
            )
            group.start()
            log.info("camera group up: %d камер (config v%d)", len(group.workers), cur_ver)

            while not stop_event.is_set() and not group_stop.is_set():
                if stop_event.wait(5):
                    break
                group.watchdog.check()
                if args.duration and time.time() - started >= args.duration:
                    stop_event.set()
                if group.workers and all(not w.is_alive() for w in group.workers):
                    stop_event.set()
                if reloadable and config_version(db_sink._session_factory) != cur_ver:  # type: ignore[union-attr]
                    log.info("config изменился → перезапуск камер")
                    break

            group.shutdown()
            if not reloadable:
                stop_event.set()  # jsonl/loop-file режим: один прогон
    finally:
        stop_event.set()
        if bot is not None:
            bot.stop()
        log.info("done")


if __name__ == "__main__":
    main()
