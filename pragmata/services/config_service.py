"""CRUD камер и зон из UI. Каждая правка bump'ает config_version → пайплайн перезагружается."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from typing import TYPE_CHECKING

from fastapi import HTTPException

from pragmata.api.deps import session_factory
from pragmata.db.config_store import bump_config_version

if TYPE_CHECKING:
    from pragmata.api.schemas import (
        CameraIn,
        CameraPatch,
        ModuleConfigIn,
        OrgHoursPatch,
        SiteSettingsPatch,
        ZoneIn,
    )


def _bump() -> None:
    bump_config_version(session_factory())


def _require_module_entitled(module_key: str, enabling: bool, scope: int | None) -> None:
    """Клиент не может ВКЛЮЧИТЬ модуль, которого нет в его тарифе (выключать — можно).

    Платформенный админ (scope=None) не ограничен. Выключение разрешаем всегда,
    чтобы можно было убрать модуль после смены тарифа.
    """
    if scope is None or not enabling:
        return
    from pragmata.analytics.entitlements import resolve

    if module_key not in resolve(scope).modules:
        raise HTTPException(403, "модуль недоступен в вашем тарифе")


def create_camera(payload: CameraIn, site_id: int = 1) -> None:
    from pragmata.db.models import Camera

    with session_factory()() as s:
        if s.get(Camera, payload.id) is not None:
            raise HTTPException(409, f"камера '{payload.id}' уже есть")
        s.add(
            Camera(
                id=payload.id,
                site_id=site_id,
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
            # есть история → прячем камеру (deleted), не снося события (FK cascade).
            # Из всех списков она исчезнет, но статистика прошлого сохранится.
            cam.deleted = True
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


def delete_zone(zone_id: uuid.UUID, scope: int | None = None) -> None:
    """Зона наследует арендатора от камеры — чужую не отдаём и не удаляем."""
    from pragmata.db.models import Camera, Zone

    with session_factory()() as s:
        z = s.get(Zone, zone_id)
        if z is None:
            raise HTTPException(404, "нет такой зоны")
        if scope is not None:
            cam = s.get(Camera, z.camera_id)
            if cam is None or cam.site_id != scope:
                raise HTTPException(404, "нет такой зоны")
        s.delete(z)
        s.commit()
    _bump()


# --- модули аналитики (включение/настройка per-камера/зона) ------------------


def set_camera_module(
    camera_id: str, module_key: str, payload: ModuleConfigIn, scope: int | None = None
) -> None:
    """Записать конфиг камеро-ориентированного модуля в Camera.analytics."""
    from pragmata.analytics import module_by_key
    from pragmata.db.models import Camera

    m = module_by_key(module_key)
    if m is None or m.scope != "camera":
        raise HTTPException(404, "нет такого модуля камеры")
    _require_module_entitled(module_key, payload.enabled, scope)
    with session_factory()() as s:
        cam = s.get(Camera, camera_id)
        if cam is None or (scope is not None and cam.site_id != scope):
            raise HTTPException(404, "нет такой камеры")
        cam.analytics = {
            **(cam.analytics or {}),
            module_key: {"enabled": payload.enabled, **payload.params},
        }
        s.commit()
    _bump()


def set_zone_module(
    zone_id: uuid.UUID, module_key: str, payload: ModuleConfigIn, scope: int | None = None
) -> None:
    """Записать конфиг зон-ориентированного модуля в Zone.rules."""
    from pragmata.analytics import module_by_key
    from pragmata.db.models import Camera, Zone

    m = module_by_key(module_key)
    if m is None or m.scope != "zone":
        raise HTTPException(404, "нет такого модуля зоны")
    _require_module_entitled(module_key, payload.enabled, scope)
    with session_factory()() as s:
        z = s.get(Zone, zone_id)
        if z is None:
            raise HTTPException(404, "нет такой зоны")
        if scope is not None:
            cam = s.get(Camera, z.camera_id)
            if cam is None or cam.site_id != scope:
                raise HTTPException(404, "нет такой зоны")
        z.rules = {**(z.rules or {}), module_key: {"enabled": payload.enabled, **payload.params}}
        s.commit()
    _bump()


# --- настройки объекта (бэкофис): имя, tz, рабочие часы, время дайджеста -------


def get_site_settings() -> dict[str, object]:
    from pragmata.db.models import Site

    with session_factory()() as s:
        site = s.get(Site, 1)
        if site is None:
            raise HTTPException(404, "объект не сконфигурирован")
        return {
            "name": site.name,
            "timezone": site.timezone,
            "working_hours": site.working_hours,
            "digest_time": site.digest_time,
            "tariff": site.tariff,
            "retention_info_days": site.retention_info_days,
            "retention_alert_days": site.retention_alert_days,
            "media_quota_gb": site.media_quota_gb,
        }


def patch_site_settings(patch: SiteSettingsPatch) -> dict[str, object]:
    """Частичное обновление настроек объекта. Любая правка bump'ает конфиг."""
    from pragmata.db.models import Site

    with session_factory()() as s:
        site = s.get(Site, 1)
        if site is None:
            raise HTTPException(404, "объект не сконфигурирован")
        if patch.name is not None:
            site.name = patch.name
        if patch.timezone is not None:
            site.timezone = patch.timezone
        if patch.digest_time is not None:
            site.digest_time = patch.digest_time
        if patch.tariff is not None:
            site.tariff = patch.tariff
        # сроки не могут быть нулевыми: 0 дней = немедленное удаление улик
        if patch.retention_info_days is not None:
            site.retention_info_days = max(1, patch.retention_info_days)
        if patch.retention_alert_days is not None:
            site.retention_alert_days = max(1, patch.retention_alert_days)
        if patch.media_quota_gb is not None:
            site.media_quota_gb = max(0, patch.media_quota_gb)
        # working_hours: {} или null → отключить after_hours; иначе {days, open, close}
        if patch.working_hours is not None:
            site.working_hours = patch.working_hours or None
        s.commit()
    _bump()
    return get_site_settings()


# --- рабочие часы организации: правит АДМИН СВОЕЙ организации (scoped) ---------
# Отдельно от бэкофисного get/patch_site_settings (тот всегда Site 1, платформа).


def _validate_working_hours(wh: dict[str, object]) -> None:
    """Расписание должно строиться в WorkingHours, иначе пайплайн упадёт на загрузке."""
    from pydantic import ValidationError

    from pragmata.config import WorkingHours

    try:
        WorkingHours(**wh)
    except (ValidationError, TypeError) as err:
        raise HTTPException(422, f"неверное расписание: {err}") from err


def get_org_settings(scope: int | None) -> dict[str, object]:
    from pragmata.db.models import Site

    site_id = scope if scope is not None else 1
    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            raise HTTPException(404, "организация не найдена")
        return {"timezone": site.timezone, "working_hours": site.working_hours}


def patch_org_settings(scope: int | None, patch: OrgHoursPatch) -> dict[str, object]:
    """Часы своей организации. Влияет на after_hours всех камер (если камера не
    задала своё расписание). bump конфига → пайплайн подхватит на hot-reload."""
    from pragmata.db.models import Site

    site_id = scope if scope is not None else 1
    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            raise HTTPException(404, "организация не найдена")
        if patch.timezone is not None:
            site.timezone = patch.timezone
        if patch.working_hours is not None:
            if patch.working_hours:  # непустой → валидируем; {} → выключить after_hours
                _validate_working_hours(patch.working_hours)
            site.working_hours = patch.working_hours or None
        s.commit()
    _bump()
    return get_org_settings(scope)
