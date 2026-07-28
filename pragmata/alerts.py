"""Синки поверх событий: планирование клипов и push в Telegram."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pragmata.bot.texts import EVENT_TITLES

if TYPE_CHECKING:
    from pragmata.bot.service import BotService
    from pragmata.clips import ClipWorker
    from pragmata.config import SiteConfig
    from pragmata.perception.tracker import TrackState
    from pragmata.rules.engine import RuleEvent
    from pragmata.vlm import VisionWorker, VlmWorker, WeaponWorker


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


class WeaponSink:
    """person_entered → очередь проверки кадра на оружие (VLM, свой бюджет).

    Проверяем именно вход человека: оружие имеет смысл только при людях в кадре,
    а не на каждом треке — так экономим VLM-бюджет и не дёргаем модель впустую.
    """

    def __init__(self, worker: WeaponWorker):
        self.worker = worker

    def emit_event(self, ev: RuleEvent) -> None:
        if ev.type != "person_entered" or ev.track is None:
            return
        frame = ev.frame if ev.frame is not None else ev.track.best_frame
        if frame is not None:
            self.worker.enqueue(ev.camera_id, [frame.copy()])

    def emit_track_end(self, st: TrackState) -> None:
        pass


class VisionSink:
    """person_entered → очередь ВКЛЮЧЁННЫХ VLM-проверок камеры (оружие/гигиена/
    огонь/СИЗ/повреждение). Проверяем при входе человека — экономим VLM-бюджет."""

    def __init__(self, worker: VisionWorker, enabled: dict[str, set[str]]):
        self.worker = worker
        self.enabled = enabled  # camera_id → набор ключей проверок

    def emit_event(self, ev: RuleEvent) -> None:
        if ev.type != "person_entered" or ev.track is None:
            return
        checks = self.enabled.get(ev.camera_id)
        if not checks:
            return
        frame = ev.frame if ev.frame is not None else ev.track.best_frame
        if frame is None:
            return
        f = frame.copy()
        for key in checks:
            self.worker.enqueue(ev.camera_id, key, [f])

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
