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
}

_DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def is_outside_hours(ts: float, tz: str, wh: WorkingHours) -> bool:
    local = datetime.fromtimestamp(ts, tz=ZoneInfo(tz))
    if _DAY_KEYS[local.weekday()] not in wh.days:
        return True
    now = local.strftime("%H:%M")
    return not (wh.open <= now < wh.close)


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

            if (
                self.site is not None
                and self.site.working_hours is not None
                and st.entered_emitted
                and not st.after_hours_emitted
                and is_outside_hours(ts, self.site.timezone, self.site.working_hours)
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
