"""Бизнес-логика событий/камер/медиа — вне роутеров (слой services/ как в iqbola).

Роутеры остаются тонкими: валидация входа + вызов сервиса + сериализация.
"""

from __future__ import annotations

import time
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from sqlalchemy import func, select

from pragmata.api.deps import camera_names, data_root, safe_file, session_factory
from pragmata.api.schemas import CameraOut, EventOut, EventsPage, ZoneOut
from pragmata.config import get_settings

if TYPE_CHECKING:
    from fastapi.responses import FileResponse

ONLINE_STALE_S = 15.0  # снапшот старше — камера офлайн


def list_cameras(include_disabled: bool = False) -> list[CameraOut]:
    """Камеры + зоны прямо из БД (с id зон и enabled — для UI-управления)."""
    from sqlalchemy import select

    from pragmata.db.models import Camera, Zone

    live_dir = data_root() / "live"
    now = time.time()
    out: list[CameraOut] = []
    with session_factory()() as s:
        q = select(Camera).order_by(Camera.id)
        if not include_disabled:
            q = q.where(Camera.enabled)
        cams = s.execute(q).scalars().all()
        zones_by_cam: dict[str, list[Any]] = {}
        for z in s.execute(select(Zone).order_by(Zone.name)).scalars().all():
            zones_by_cam.setdefault(z.camera_id, []).append(z)
        for cam in cams:
            snap = live_dir / f"{cam.id}.jpg"
            online = snap.exists() and (now - snap.stat().st_mtime) < ONLINE_STALE_S
            out.append(
                CameraOut(
                    id=cam.id,
                    name=cam.name,
                    online=online,
                    enabled=cam.enabled,
                    snapshot_url=f"/api/v1/cameras/{cam.id}/snapshot" if snap.exists() else None,
                    zones=[
                        ZoneOut(
                            id=z.id,
                            name=z.name,
                            type=z.type,
                            polygon=[(p[0], p[1]) for p in z.polygon],
                            rules=z.rules or {},
                        )
                        for z in zones_by_cam.get(cam.id, [])
                    ],
                )
            )
    return out


def snapshot_file(camera_id: str) -> FileResponse:
    from fastapi.responses import FileResponse

    path = safe_file(data_root() / "live", f"{camera_id}.jpg")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


def _event_out(ev: Any, names: dict[str, str]) -> EventOut:
    return EventOut(
        id=ev.id,
        camera_id=ev.camera_id,
        camera=names.get(ev.camera_id, ev.camera_id),
        type=ev.type,
        severity=ev.severity,
        zone=ev.zone,
        t_start=ev.t_start,
        t_end=ev.t_end,
        duration_s=ev.duration_s,
        description=ev.description,
        people_in_zone=ev.meta.get("people_in_zone"),
        photo_url=f"/api/v1/events/{ev.id}/photo" if ev.frame_path else None,
        face_url=f"/api/v1/events/{ev.id}/face" if ev.face_path else None,
        clip_url=f"/api/v1/events/{ev.id}/clip" if ev.clip_path else None,
    )


def list_events(
    hours: float,
    camera_id: str | None,
    type_: str | None,
    severity: str | None,
    zone: str | None,
    limit: int,
    offset: int,
) -> EventsPage:
    from pragmata.db.models import Event

    since = datetime.now(UTC) - timedelta(hours=hours)
    q = select(Event).where(Event.t_start >= since)
    if camera_id:
        q = q.where(Event.camera_id == camera_id)
    if type_:
        q = q.where(Event.type == type_)
    if severity:
        q = q.where(Event.severity == severity)
    if zone:
        q = q.where(Event.zone == zone)
    names = camera_names()
    with session_factory()() as s:
        total = s.execute(select(func.count()).select_from(q.subquery())).scalar_one()
        rows = (
            s.execute(q.order_by(Event.t_start.desc()).limit(limit).offset(offset)).scalars().all()
        )
        return EventsPage(total=total, items=[_event_out(ev, names) for ev in rows])


def event_media(event_id: uuid.UUID, kind: str) -> FileResponse:
    from fastapi import HTTPException
    from fastapi.responses import FileResponse

    from pragmata.db.models import Event

    with session_factory()() as s:
        ev = s.get(Event, event_id)
    if ev is None:
        raise HTTPException(404, "нет такого события")
    if kind == "clip":
        path, root, media_type = ev.clip_path, data_root() / "clips", "video/mp4"
    else:
        path = ev.frame_path if kind == "photo" else ev.face_path
        root, media_type = get_settings().media_dir, "image/jpeg"
    if not path:
        raise HTTPException(404, f"у события нет {kind}")
    return FileResponse(safe_file(root, path), media_type=media_type)


def save_feedback(event_id: uuid.UUID, verdict: str) -> None:
    from pragmata.db.queries import save_feedback as _save

    _save(session_factory(), event_id, chat_id=0, verdict=verdict)  # chat_id=0 = web


def track_photo(track_id: uuid.UUID) -> FileResponse:
    from fastapi import HTTPException
    from fastapi.responses import FileResponse

    from pragmata.db.models import Track

    with session_factory()() as s:
        t = s.get(Track, track_id)
    if t is None or not t.best_frame_path:
        raise HTTPException(404, "нет фото трека")
    return FileResponse(
        safe_file(get_settings().media_dir, t.best_frame_path), media_type="image/jpeg"
    )
