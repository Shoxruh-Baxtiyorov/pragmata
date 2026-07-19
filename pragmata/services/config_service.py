"""CRUD камер и зон из UI. Каждая правка bump'ает config_version → пайплайн перезагружается."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from typing import TYPE_CHECKING

from fastapi import HTTPException

from pragmata.api.deps import session_factory
from pragmata.db.config_store import bump_config_version

if TYPE_CHECKING:
    from pragmata.api.schemas import CameraIn, CameraPatch, ZoneIn


def _bump() -> None:
    bump_config_version(session_factory())


def create_camera(payload: CameraIn) -> None:
    from pragmata.db.models import Camera

    with session_factory()() as s:
        if s.get(Camera, payload.id) is not None:
            raise HTTPException(409, f"камера '{payload.id}' уже есть")
        s.add(
            Camera(
                id=payload.id,
                site_id=1,
                name=payload.name,
                url=payload.url,
                enabled=True,
                process_fps=payload.process_fps,
                detect_conf=payload.detect_conf,
                detect_imgsz=payload.detect_imgsz,
                motion={"enabled": True, "min_area_pct": 0.4, "cooldown_s": 3.0},
                clips={
                    "enabled": payload.clips_enabled,
                    "ring_minutes": 5,
                    "pre_s": 10,
                    "post_s": 20,
                },
            )
        )
        s.commit()
    _bump()


def patch_camera(camera_id: str, patch: CameraPatch) -> None:
    from pragmata.db.models import Camera

    with session_factory()() as s:
        cam = s.get(Camera, camera_id)
        if cam is None:
            raise HTTPException(404, "нет такой камеры")
        if patch.name is not None:
            cam.name = patch.name
        if patch.url is not None:
            cam.url = patch.url
        if patch.enabled is not None:
            cam.enabled = patch.enabled
        if patch.process_fps is not None:
            cam.process_fps = patch.process_fps
        if patch.detect_conf is not None:
            cam.detect_conf = patch.detect_conf
        if patch.detect_imgsz is not None:
            cam.detect_imgsz = patch.detect_imgsz
        if patch.clips_enabled is not None:
            cam.clips = {**cam.clips, "enabled": patch.clips_enabled}
        s.commit()
    _bump()


def delete_camera(camera_id: str) -> None:
    from pragmata.db.models import Camera, Event

    with session_factory()() as s:
        cam = s.get(Camera, camera_id)
        if cam is None:
            raise HTTPException(404, "нет такой камеры")
        from sqlalchemy import func, select

        has_events = s.execute(
            select(func.count()).select_from(Event).where(Event.camera_id == camera_id)
        ).scalar_one()
        if has_events:
            # у камеры есть история → мягкое удаление (disable), чтобы не рвать FK событий
            cam.enabled = False
        else:
            s.delete(cam)
        s.commit()
    _bump()


def add_zone(camera_id: str, payload: ZoneIn) -> uuid.UUID:
    from pragmata.db.models import Camera, Zone

    with session_factory()() as s:
        if s.get(Camera, camera_id) is None:
            raise HTTPException(404, "нет такой камеры")
        rules: dict[str, object] = {}
        if payload.zone_intrusion:
            rules["zone_intrusion"] = {
                "hysteresis_frames": payload.hysteresis_frames,
                "cooldown_s": payload.intrusion_cooldown_s,
            }
        if payload.loitering:
            rules["loitering"] = {"dwell_s": payload.dwell_s, "cooldown_s": payload.dwell_s * 2}
        z = Zone(
            camera_id=camera_id,
            name=payload.name,
            type=payload.type,
            polygon=[[p[0], p[1]] for p in payload.polygon],
            rules=rules,
        )
        s.add(z)
        s.commit()
        zid = z.id
    _bump()
    return zid


def delete_zone(zone_id: uuid.UUID) -> None:
    from pragmata.db.models import Zone

    with session_factory()() as s:
        z = s.get(Zone, zone_id)
        if z is None:
            raise HTTPException(404, "нет такой зоны")
        s.delete(z)
        s.commit()
    _bump()
