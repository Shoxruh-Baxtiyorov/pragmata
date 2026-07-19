from __future__ import annotations

import json
import logging
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING, Any, Protocol

from pragmata.media import MediaStore, annotate, annotate_many

if TYPE_CHECKING:
    import numpy as np

    from pragmata.config import SiteConfig
    from pragmata.perception.tracker import TrackState
    from pragmata.rules.engine import RuleEvent

log = logging.getLogger("pragmata.events")


def render_event_image(ev: RuleEvent) -> np.ndarray | None:
    """Единый рендер доказательства для БД и Telegram: кадр момента + все люди."""
    st = ev.track
    if st is None:
        # событие без трека (напр. weapon_detected из отдельного воркера) — сам кадр
        return ev.frame
    label = f"{ev.type}" + (f" @{ev.zone}" if ev.zone else "")
    if ev.frame is not None:
        return annotate_many(ev.frame, (st.bbox, label), ev.others)
    if st.best_frame is not None:
        return annotate(st.best_frame, st.best_bbox, label)
    return None


def _dt(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=UTC)


class EventSink(Protocol):
    def emit_event(self, ev: RuleEvent) -> None: ...
    def emit_track_end(self, st: TrackState) -> None: ...


class ConsoleSink:
    def emit_event(self, ev: RuleEvent) -> None:
        log.info(
            "EVENT %-15s sev=%-7s cam=%s zone=%s meta=%s",
            ev.type,
            ev.severity,
            ev.camera_id,
            ev.zone or "-",
            ev.meta,
        )

    def emit_track_end(self, st: TrackState) -> None:
        log.debug(
            "track end cam=%s id=%s life=%.1fs frames=%d",
            st.camera_id,
            st.track_id,
            st.lifetime,
            st.frames,
        )


class JsonlSink:
    """События в JSONL + кропы на диск. Без БД: golden-прогоны и дебаг."""

    def __init__(self, path: Path, media: MediaStore):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.media = media
        self._lock = threading.Lock()

    def _write(self, record: dict[str, Any]) -> None:
        with self._lock, self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def emit_event(self, ev: RuleEvent) -> None:
        frame_path, face_path = _save_evidence(self.media, ev)
        self._write(
            {
                "kind": "event",
                "id": str(ev.id),
                "type": ev.type,
                "severity": ev.severity,
                "camera_id": ev.camera_id,
                "zone": ev.zone,
                "t_start": ev.t_start,
                "t_end": ev.t_end,
                "frame_path": frame_path,
                "face_path": face_path,
                "meta": ev.meta,
            }
        )

    def emit_track_end(self, st: TrackState) -> None:
        self._write(
            {
                "kind": "track",
                "camera_id": st.camera_id,
                "track_id": st.track_id,
                "started": st.first_ts,
                "ended": st.last_ts,
                "frames": st.frames,
            }
        )


class DbSink:
    """Postgres: события + завершённые треки; кропы через MediaStore."""

    def __init__(self, site_cfg: SiteConfig, media: MediaStore):
        from pragmata.db.session import make_session_factory  # ленивый: engine только при db-синке

        self._session_factory = make_session_factory()
        self.media = media
        self._ensure_site(site_cfg)

    def _ensure_site(self, cfg: SiteConfig) -> None:
        # только сам ряд site (для FK событий). Камеры/зоны — через
        # seed_config_from_yaml (однократно) + UI; апсерт из YAML тут затирал бы правки.
        from pragmata.db.models import Site

        with self._session_factory() as s:
            if s.get(Site, 1) is None:
                s.add(Site(id=1, name=cfg.site.name, timezone=cfg.site.timezone))
                s.commit()

    def emit_event(self, ev: RuleEvent) -> None:
        from pragmata.db.models import Event

        frame_path, face_path = _save_evidence(self.media, ev)
        with self._session_factory() as s:
            s.add(
                Event(
                    id=ev.id,
                    site_id=1,
                    camera_id=ev.camera_id,
                    type=ev.type,
                    severity=ev.severity,
                    zone=ev.zone,
                    t_start=_dt(ev.t_start),
                    t_end=_dt(ev.t_end),
                    duration_s=round(ev.t_end - ev.t_start, 2),
                    frame_path=frame_path,
                    face_path=face_path,
                    meta=ev.meta,
                )
            )
            s.commit()

    def emit_track_end(self, st: TrackState) -> None:
        from pragmata.db.models import Track

        best_path = None
        face_path = None
        if st.best_frame is not None:
            best_path = self.media.save_jpeg(
                annotate(st.best_frame, st.best_bbox, f"track {st.track_id}"),
                st.camera_id,
                "track",
                st.last_ts,
            )
        if st.face_crop is not None:
            face_path = self.media.save_jpeg(st.face_crop, st.camera_id, "face", st.last_ts)
        with self._session_factory() as s:
            s.add(
                Track(
                    camera_id=st.camera_id,
                    track_id=st.track_id,
                    started_at=_dt(st.first_ts),
                    ended_at=_dt(st.last_ts),
                    frames=st.frames,
                    best_frame_path=best_path,
                    face_crop_path=face_path,
                    clip_emb=st.clip_emb,
                    face_emb=st.face_emb,
                    person_id=uuid.UUID(st.person_id) if st.person_id else None,
                    meta={"best_bbox": list(st.best_bbox)},
                )
            )
            s.commit()


class MultiSink:
    def __init__(self, sinks: list[EventSink]):
        self.sinks = sinks

    def emit_event(self, ev: RuleEvent) -> None:
        for s in self.sinks:
            s.emit_event(ev)

    def emit_track_end(self, st: TrackState) -> None:
        for s in self.sinks:
            s.emit_track_end(st)


def _save_evidence(media: MediaStore, ev: RuleEvent) -> tuple[str | None, str | None]:
    frame_path = None
    face_path = None
    img = render_event_image(ev)
    if img is not None:
        frame_path = media.save_jpeg(img, ev.camera_id, "event", ev.t_end)
    st = ev.track
    if st is not None and st.face_crop is not None:
        face_path = media.save_jpeg(st.face_crop, ev.camera_id, "face", ev.t_end)
    return frame_path, face_path
