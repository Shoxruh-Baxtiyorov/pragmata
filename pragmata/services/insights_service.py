"""Сводки для дашборда: overview (главная), почасовая активность, здоровье, таймлайн."""

from __future__ import annotations

import time
import uuid  # noqa: TC003 — uuid.UUID в сигнатуре, вызываемой из FastAPI-роута
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

if TYPE_CHECKING:
    from sqlalchemy.sql.elements import ColumnElement

from pragmata.api.deps import camera_names, data_root, require_site, session_factory, site_config
from pragmata.api.schemas import (
    HourBucket,
    OverviewOut,
    PersonAppearance,
    SystemCamera,
    SystemOut,
)
from pragmata.config import get_settings

ALERT_TYPES = ("zone_intrusion", "after_hours_presence", "camera_offline")
ONLINE_STALE_S = 15.0


def _tz() -> ZoneInfo:
    cfg = site_config()
    return ZoneInfo(cfg.site.timezone if cfg else "Asia/Tashkent")


def _cameras_online(scope: int | None = None) -> tuple[int, int]:
    """(онлайн, всего) камер ОРГАНИЗАЦИИ. Считаем из БД со скоупом — иначе клиент
    видел бы чужие камеры (мультиаренда). Всего = включённые, не удалённые."""
    from sqlalchemy import select

    from pragmata.db.models import Camera

    q = select(Camera.id).where(Camera.deleted.is_(False), Camera.enabled.is_(True))
    if scope is not None:
        q = q.where(Camera.site_id == scope)
    with session_factory()() as s:
        ids = list(s.execute(q).scalars().all())
    live = data_root() / "live"
    now = time.time()
    online = sum(
        1
        for cid in ids
        if (live / f"{cid}.jpg").exists()
        and now - (live / f"{cid}.jpg").stat().st_mtime < ONLINE_STALE_S
    )
    return online, len(ids)


def _site(scope: int | None) -> ColumnElement[bool]:
    """Условие принадлежности организации; без скоупа — всегда истинно."""
    from sqlalchemy import true

    from pragmata.db.models import Event

    return true() if scope is None else Event.site_id == scope


def overview(scope: int | None = None) -> OverviewOut:
    from pragmata.db.models import Event, Feedback
    from pragmata.services.events_service import _event_out

    tz = _tz()
    since = datetime.now(UTC) - timedelta(hours=24)
    names = camera_names()
    online, total = _cameras_online(scope)

    with session_factory()() as s:
        by_type = {
            r[0]: r[1]
            for r in s.execute(
                select(Event.type, func.count())
                .where(Event.t_start >= since, Event.source == "live", _site(scope))
                .group_by(Event.type)
            ).all()
        }
        fp = s.execute(
            select(func.count())
            .select_from(Feedback)
            .where(Feedback.created_at >= since, Feedback.verdict == "false_positive")
        ).scalar_one()
        recent = (
            s.execute(
                select(Event)
                .where(
                    Event.t_start >= since,
                    Event.severity == "alert",
                    Event.source == "live",
                    _site(scope),
                )
                .order_by(Event.t_start.desc())
                .limit(6)
            )
            .scalars()
            .all()
        )
        # почасовые бакеты за 24ч
        rows = s.execute(
            select(Event.t_start, Event.severity).where(
                Event.t_start >= since, Event.source == "live", _site(scope)
            )
        ).all()

    buckets: dict[int, dict[str, int]] = {}
    for t_start, severity in rows:
        h = t_start.astimezone(tz).hour
        b = buckets.setdefault(h, {"events": 0, "alerts": 0})
        b["events"] += 1
        if severity == "alert":
            b["alerts"] += 1
    now_h = datetime.now(tz).hour
    hourly = [
        HourBucket(
            hour=f"{(now_h - 23 + i) % 24:02d}:00",
            events=buckets.get((now_h - 23 + i) % 24, {}).get("events", 0),
            alerts=buckets.get((now_h - 23 + i) % 24, {}).get("alerts", 0),
        )
        for i in range(24)
    ]
    return OverviewOut(
        visitors_today=by_type.get("person_entered", 0),
        alerts_today=sum(n for t, n in by_type.items() if t in ALERT_TYPES),
        cameras_online=online,
        cameras_total=total,
        false_positives_today=fp,
        hourly=hourly,
        recent_alerts=[_event_out(e, names) for e in recent],
    )


def system_status(scope: int | None = None) -> SystemOut:
    from pragmata.db.models import Camera, Event, Site

    cfg = require_site()
    settings = get_settings()
    since = datetime.now(UTC) - timedelta(hours=24)
    live = data_root() / "live"
    now = time.time()

    with session_factory()() as s:
        total = s.execute(
            select(func.count()).select_from(Event).where(Event.source == "live", _site(scope))
        ).scalar_one()
        last_by_cam = {
            r[0]: r[1]
            for r in s.execute(
                select(Event.camera_id, func.max(Event.t_start))
                .where(Event.source == "live", _site(scope))
                .group_by(Event.camera_id)
            ).all()
        }
        cnt_by_cam = {
            r[0]: r[1]
            for r in s.execute(
                select(Event.camera_id, func.count())
                .where(Event.t_start >= since, Event.source == "live", _site(scope))
                .group_by(Event.camera_id)
            ).all()
        }
        # камеры и объект — из БД со СКОУПОМ (иначе клиент видит чужие камеры/объект)
        cam_q = select(Camera.id, Camera.name).where(
            Camera.deleted.is_(False), Camera.enabled.is_(True)
        )
        if scope is not None:
            cam_q = cam_q.where(Camera.site_id == scope)
        cam_rows = s.execute(cam_q).all()
        site_row = s.get(Site, scope) if scope is not None else s.get(Site, 1)

    cams = []
    for cid, cname in cam_rows:
        snap = live / f"{cid}.jpg"
        online = snap.exists() and now - snap.stat().st_mtime < ONLINE_STALE_S
        cams.append(
            SystemCamera(
                id=cid,
                name=cname,
                online=online,
                last_event=last_by_cam.get(cid),
                events_24h=cnt_by_cam.get(cid, 0),
            )
        )
    return SystemOut(
        site_name=site_row.name if site_row else cfg.site.name,
        timezone=site_row.timezone if site_row else cfg.site.timezone,
        cameras=cams,
        yolo_model=settings.yolo_model,
        agent_enabled=bool(settings.llm_api_key),
        vlm_enabled=bool(settings.llm_api_key and settings.vlm_model),
        face_recognition=bool(settings.face_recognition),
        weapon_detection=bool(settings.weapon_detection and settings.llm_api_key),
        vehicle_detection=bool(settings.vehicle_detection),
        offline_mode="127.0.0.1" in settings.llm_base_url or "localhost" in settings.llm_base_url,
        media_dir=str(settings.media_dir),
        events_total=total,
    )


def person_timeline(track_id: uuid.UUID, hours: int = 24) -> list[PersonAppearance]:
    """Появления того же анонимного человека (по CLIP-сходству кропа трека)."""
    from pragmata.db.models import Event, Track
    from pragmata.investigation import CANDIDATE_POOL

    names = camera_names()
    since = datetime.now(UTC) - timedelta(hours=hours)
    with session_factory()() as s:
        base = s.get(Track, track_id)
        if base is None or base.clip_emb is None:
            return []
        similar = (
            s.execute(
                select(Track)
                .where(Track.clip_emb.is_not(None), Track.started_at >= since)
                .order_by(Track.clip_emb.cosine_distance(list(base.clip_emb)))
                .limit(CANDIDATE_POOL)
            )
            .scalars()
            .all()
        )
        out: list[PersonAppearance] = []
        for tr in similar:
            ev = s.execute(
                select(Event)
                .where(Event.camera_id == tr.camera_id, Event.t_start >= tr.started_at)
                .order_by(Event.t_start)
                .limit(1)
            ).scalar_one_or_none()
            out.append(
                PersonAppearance(
                    time=tr.started_at,
                    camera=names.get(tr.camera_id, tr.camera_id),
                    type=ev.type if ev else "seen",
                    photo_url=f"/api/v1/tracks/{tr.id}/photo" if tr.best_frame_path else None,
                )
            )
        out.sort(key=lambda a: a.time)
        return out
