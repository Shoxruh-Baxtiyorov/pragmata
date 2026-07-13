"""Синки поверх событий: планирование клипов и push в Telegram."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from soqchi.bot.service import BotService
    from soqchi.clips import ClipWorker
    from soqchi.config import SiteConfig
    from soqchi.perception.tracker import TrackState
    from soqchi.rules.engine import RuleEvent


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
