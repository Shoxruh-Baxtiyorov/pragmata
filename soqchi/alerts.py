"""Синки поверх событий: планирование клипов и push в Telegram."""

from __future__ import annotations

from typing import TYPE_CHECKING

from soqchi.bot.texts import EVENT_TITLES

if TYPE_CHECKING:
    from soqchi.bot.service import BotService
    from soqchi.clips import ClipWorker
    from soqchi.config import SiteConfig
    from soqchi.perception.tracker import TrackState
    from soqchi.rules.engine import RuleEvent
    from soqchi.vlm import VlmWorker


class ClipSink:
    """alert-событие → отложенная нарезка клипа из кольцевого буфера."""

    def __init__(self, worker: ClipWorker, site_cfg: SiteConfig):
        self.worker = worker
        self.clip_cfg = {c.id: c.clips for c in site_cfg.cameras if c.clips.enabled}

    def emit_event(self, ev: RuleEvent) -> None:
        cfg = self.clip_cfg.get(ev.camera_id)
        if cfg is None or ev.severity != "alert" or ev.track is None:
            return
        self.worker.schedule(ev.id, ev.camera_id, ev.t_start, ev.t_end, cfg.pre_s, cfg.post_s)

    def emit_track_end(self, st: TrackState) -> None:
        pass


class BotSink:
    def __init__(self, bot: BotService):
        self.bot = bot

    def emit_event(self, ev: RuleEvent) -> None:
        self.bot.notify_event(ev)

    def emit_track_end(self, st: TrackState) -> None:
        pass


class VlmSink:
    """alert-событие → очередь VLM-описания (кадр момента + best-frame трека)."""

    def __init__(self, worker: VlmWorker, site_cfg: SiteConfig):
        self.worker = worker
        self.camera_names = {c.id: c.name for c in site_cfg.cameras}
        self.titles = dict(EVENT_TITLES)

    def emit_event(self, ev: RuleEvent) -> None:
        if ev.severity != "alert" or ev.track is None:
            return
        frames = [f for f in (ev.frame, ev.track.best_frame) if f is not None]
        if not frames:
            return
        self.worker.enqueue(
            ev.id,
            self.titles.get(ev.type, ev.type),
            self.camera_names.get(ev.camera_id, ev.camera_id),
            ev.zone,
            [f.copy() for f in frames],
        )

    def emit_track_end(self, st: TrackState) -> None:
        pass
