from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

import cv2
import numpy as np

if TYPE_CHECKING:
    from pragmata.config import CameraConfig, GlobalRules, SiteInfo, WorkingHours, ZoneConfig
    from pragmata.perception.tracker import TrackState

SEVERITY = {
    "person_entered": "info",
    "person_exited": "info",
    "loitering": "warning",
    "zone_intrusion": "alert",
    "after_hours_presence": "alert",
    "camera_offline": "alert",
    "camera_online": "info",
    "watchlist_match": "alert",
    "person_recognized": "info",
    "weapon_detected": "alert",
    "vehicle_seen": "info",
    "crowd_gathering": "warning",
    "queue_buildup": "info",
    "danger_zone_presence": "alert",
    "hygiene_violation": "warning",
    "fire_smoke": "alert",
    "ppe_violation": "warning",
    "package_damage": "warning",
    "abandoned_object": "alert",
    "equipment_idle": "info",
    "illegal_parking": "warning",
    "loading_activity": "info",
    "plate_recognized": "info",
    "plate_unlisted": "warning",
}

_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def is_outside_hours(ts: float, tz: str, wh: WorkingHours) -> bool:
    local = datetime.fromtimestamp(ts, tz=ZoneInfo(tz))
    if _DAY_KEYS[local.weekday()] not in wh.days:
        return True
    now = local.strftime("%H:%M")
    return not (wh.open <= now < wh.close)


def _parse_days(raw: str) -> list[str]:
    """«mon,tue» и диапазоны «mon-fri» → список валидных дней (порядок _DAY_KEYS)."""
    out: set[str] = set()
    for part in raw.split(","):
        part = part.strip().lower()
        if not part:
            continue
        if "-" in part:  # диапазон mon-fri (с переносом через воскресенье: sat-mon)
            a, _, b = part.partition("-")
            a, b = a.strip()[:3], b.strip()[:3]
            if a in _DAY_KEYS and b in _DAY_KEYS:
                ia, ib = _DAY_KEYS.index(a), _DAY_KEYS.index(b)
                span = _DAY_KEYS[ia : ib + 1] if ia <= ib else _DAY_KEYS[ia:] + _DAY_KEYS[: ib + 1]
                out.update(span)
        elif part[:3] in _DAY_KEYS:
            out.add(part[:3])
    return [d for d in _DAY_KEYS if d in out]


def effective_working_hours(
    cam_after_hours: object, site_wh: WorkingHours | None
) -> WorkingHours | None:
    """Эффективное рабочее расписание камеры для after_hours.

    Камера переопределяет организацию: модуль after_hours на камере с
    enabled=true → mode «always» (круглосуточно, тревог нет → None) или
    «custom» (свои дни/часы). Иначе наследуется расписание организации.
    """
    from pragmata.config import WorkingHours

    if isinstance(cam_after_hours, dict) and cam_after_hours.get("enabled"):
        if str(cam_after_hours.get("mode", "custom")) == "always":
            return None  # 24/7 — понятия «вне часов» нет
        days = _parse_days(str(cam_after_hours.get("days", "")))
        base = site_wh or WorkingHours()
        return WorkingHours(
            days=days or base.days,
            open=str(cam_after_hours.get("open") or base.open),
            close=str(cam_after_hours.get("close") or base.close),
        )
    return site_wh  # нет переопределения → расписание организации


@dataclass
class RuleEvent:
    type: str
    camera_id: str
    t_start: float
    t_end: float
    zone: str | None = None
    track: TrackState | None = None
    meta: dict[str, Any] = field(default_factory=dict)
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    # готовое описание (напр. текст госномера) — минуя VLM-очередь
    description: str | None = None
    # кадр момента срабатывания (только для alert; иначе best_frame трека)
    frame: np.ndarray | None = None
    # bbox остальных людей в зоне в момент срабатывания — для оверлея на доказательстве
    others: list[tuple[float, float, float, float]] = field(default_factory=list)

    @property
    def severity(self) -> str:
        return SEVERITY.get(self.type, "info")


class ZoneRuntime:
    """Полигон зоны в пикселях; строится лениво по размеру первого кадра."""

    def __init__(self, cfg: ZoneConfig):
        self.cfg = cfg
        self._contour: np.ndarray | None = None
        self._shape: tuple[int, int] | None = None

    def contains(self, point: tuple[float, float], frame_shape: tuple[int, ...]) -> bool:
        h, w = frame_shape[0], frame_shape[1]
        if self._contour is None or self._shape != (h, w):
            pts = [(int(x * w), int(y * h)) for x, y in self.cfg.polygon]
            self._contour = np.array(pts, dtype=np.int32)
            self._shape = (h, w)
        return cv2.pointPolygonTest(self._contour, point, False) >= 0


class RuleEngine:
    """Детерминированная фабрика событий: hysteresis + cooldown + dwell, никакого ML."""

    def __init__(
        self, camera: CameraConfig, global_rules: GlobalRules, site: SiteInfo | None = None
    ):
        self.camera = camera
        self.g = global_rules
        self.site = site
        self.zones = [ZoneRuntime(z) for z in camera.zones]
        self._cooldown_until: dict[tuple[str, str, int], float] = {}  # (rule, zone, track_id) → ts
        self._queue_since: dict[str, float] = {}  # зона → когда набралось ≥ порога (очередь)

    def _cooldown_ok(
        self, rule: str, zone: str, track_id: int, ts: float, cooldown_s: float
    ) -> bool:
        key = (rule, zone, track_id)
        if ts < self._cooldown_until.get(key, 0.0):
            return False
        self._cooldown_until[key] = ts + cooldown_s
        return True

    def process(
        self,
        updated: list[TrackState],
        ended: list[TrackState],
        ts: float,
        frame_shape: tuple[int, ...],
    ) -> list[RuleEvent]:
        events: list[RuleEvent] = []

        for st in updated:
            if not st.entered_emitted and st.lifetime >= self.g.min_track_seconds:
                st.entered_emitted = True
                events.append(
                    RuleEvent(
                        "person_entered",
                        self.camera.id,
                        st.first_ts,
                        st.last_ts,
                        track=st,
                        meta={"track_id": st.track_id},
                    )
                )

            eff_hours = effective_working_hours(
                self.camera.analytics.get("after_hours"),
                self.site.working_hours if self.site is not None else None,
            )
            if (
                self.site is not None
                and eff_hours is not None
                and st.entered_emitted
                and not st.after_hours_emitted
                and is_outside_hours(ts, self.site.timezone, eff_hours)
            ):
                st.after_hours_emitted = True
                events.append(
                    RuleEvent(
                        "after_hours_presence",
                        self.camera.id,
                        st.first_ts,
                        ts,
                        track=st,
                        meta={"track_id": st.track_id},
                    )
                )

            foot = st.foot
            for zr in self.zones:
                zname = zr.cfg.name
                inside = zr.contains(foot, frame_shape)
                if inside:
                    st.zone_miss[zname] = 0
                    st.zone_hits[zname] = st.zone_hits.get(zname, 0) + 1
                    st.zone_dwell[zname] = st.zone_dwell.get(zname, 0.0) + st.dt
                else:
                    # флаппинг-толерантность: один пропавший кадр (перекрытие людей,
                    # дрожание детекции) не обнуляет счётчики — только 2+ подряд
                    st.zone_miss[zname] = st.zone_miss.get(zname, 0) + 1
                    if st.zone_miss[zname] >= 2:
                        st.zone_hits[zname] = 0
                        st.zone_dwell[zname] = 0.0
                    continue

                zi = zr.cfg.rules.zone_intrusion
                if (
                    zi is not None
                    and st.zone_hits[zname] == zi.hysteresis_frames
                    and self._cooldown_ok("zone_intrusion", zname, st.track_id, ts, zi.cooldown_s)
                ):
                    others = [
                        o.bbox for o in updated if o is not st and zr.contains(o.foot, frame_shape)
                    ]
                    events.append(
                        RuleEvent(
                            "zone_intrusion",
                            self.camera.id,
                            ts,
                            ts,
                            zone=zname,
                            track=st,
                            meta={
                                "track_id": st.track_id,
                                "hits": st.zone_hits[zname],
                                "people_in_zone": 1 + len(others),
                            },
                            others=others,
                        )
                    )

                lo = zr.cfg.rules.loitering
                if (
                    lo is not None
                    and st.zone_dwell[zname] >= lo.dwell_s
                    and self._cooldown_ok("loitering", zname, st.track_id, ts, lo.cooldown_s)
                ):
                    events.append(
                        RuleEvent(
                            "loitering",
                            self.camera.id,
                            ts - st.zone_dwell[zname],
                            ts,
                            zone=zname,
                            track=st,
                            meta={
                                "track_id": st.track_id,
                                "dwell_s": round(st.zone_dwell[zname], 1),
                            },
                        )
                    )

                # опасная зона: как вторжение, но семантика «зона у механизмов»
                dz = zr.cfg.analytics.get("danger_zone")
                if (
                    isinstance(dz, dict)
                    and dz.get("enabled")
                    and st.zone_hits[zname] >= 6
                    and self._cooldown_ok(
                        "danger_zone", zname, st.track_id, ts, float(dz.get("cooldown_s", 120))
                    )
                ):
                    events.append(
                        RuleEvent(
                            "danger_zone_presence",
                            self.camera.id,
                            ts,
                            ts,
                            zone=zname,
                            track=st,
                            meta={"track_id": st.track_id},
                        )
                    )

        self._crowd_queue(updated, ts, frame_shape, events)
        for st in ended:
            if st.entered_emitted:
                events.append(
                    RuleEvent(
                        "person_exited",
                        self.camera.id,
                        st.first_ts,
                        st.last_ts,
                        track=st,
                        meta={"track_id": st.track_id, "lifetime_s": round(st.lifetime, 1)},
                    )
                )
        return events

    def _crowd_queue(
        self,
        updated: list[TrackState],
        ts: float,
        frame_shape: tuple[int, ...],
        events: list[RuleEvent],
    ) -> None:
        """Скопление/очередь: считаем людей в зоне СЕЙЧАС (по кадру, не по треку)."""
        for zr in self.zones:
            an = zr.cfg.analytics
            crowd = an.get("crowd")
            queue = an.get("queue_length")
            crowd_on = isinstance(crowd, dict) and crowd.get("enabled")
            queue_on = isinstance(queue, dict) and queue.get("enabled")
            if not crowd_on and not queue_on:
                continue
            zname = zr.cfg.name
            n_in = sum(1 for st in updated if zr.contains(st.foot, frame_shape))
            if crowd_on and isinstance(crowd, dict):
                thr = int(crowd.get("threshold", 8))
                cd = float(crowd.get("cooldown_s", 300))
                if n_in >= thr and self._cooldown_ok("crowd", zname, 0, ts, cd):
                    events.append(
                        RuleEvent(
                            "crowd_gathering",
                            self.camera.id,
                            ts,
                            ts,
                            zone=zname,
                            meta={"people": n_in, "threshold": thr},
                        )
                    )
            if queue_on and isinstance(queue, dict):
                thr = int(queue.get("threshold", 4))
                if n_in >= thr:
                    self._queue_since.setdefault(zname, ts)
                    held = ts - self._queue_since[zname]
                    cd = float(queue.get("cooldown_s", 300))
                    if held >= float(queue.get("wait_s", 30)) and self._cooldown_ok(
                        "queue", zname, 0, ts, cd
                    ):
                        events.append(
                            RuleEvent(
                                "queue_buildup",
                                self.camera.id,
                                self._queue_since[zname],
                                ts,
                                zone=zname,
                                meta={"people": n_in, "held_s": round(held, 1)},
                            )
                        )
                else:
                    self._queue_since.pop(zname, None)
