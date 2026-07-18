"""Конфиг объекта из БД: та же модель SiteConfig, что из YAML — rules-движок не меняется.

Сидинг из YAML при первом старте (миграция статики → БД), затем БД = источник истины.
config_version bump'ается при любой правке → пайплайн ловит и перезагружается.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from soqchi.config import (
    CameraConfig,
    ClipConfig,
    GlobalRules,
    MotionConfig,
    SiteConfig,
    SiteInfo,
    WorkingHours,
    ZoneConfig,
    ZoneRules,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker


def _camera_from_row(cam: object, zones: list[object]) -> CameraConfig:
    return CameraConfig(
        id=cam.id,  # type: ignore[attr-defined]
        name=cam.name,  # type: ignore[attr-defined]
        url=cam.url,  # type: ignore[attr-defined]
        process_fps=cam.process_fps,  # type: ignore[attr-defined]
        detect_conf=cam.detect_conf,  # type: ignore[attr-defined]
        detect_imgsz=cam.detect_imgsz,  # type: ignore[attr-defined]
        motion=MotionConfig(**(cam.motion or {})),  # type: ignore[attr-defined]
        clips=ClipConfig(**(cam.clips or {})),  # type: ignore[attr-defined]
        zones=[
            ZoneConfig(
                name=z.name,  # type: ignore[attr-defined]
                type=z.type,  # type: ignore[attr-defined]
                polygon=[(p[0], p[1]) for p in z.polygon],  # type: ignore[attr-defined]
                rules=ZoneRules(**(z.rules or {})),  # type: ignore[attr-defined]
            )
            for z in zones
        ],
    )


def load_config_from_db(session_factory: sessionmaker[Session]) -> SiteConfig:
    from soqchi.db.models import Camera, Site, Zone

    with session_factory() as s:
        site = s.get(Site, 1)
        if site is None:
            raise RuntimeError("site row missing — запусти seed_config_from_yaml")
        cams = s.execute(select(Camera).where(Camera.enabled).order_by(Camera.id)).scalars().all()
        zones_by_cam: dict[str, list[object]] = {}
        for z in s.execute(select(Zone).order_by(Zone.name)).scalars().all():
            zones_by_cam.setdefault(z.camera_id, []).append(z)
        wh = WorkingHours(**site.working_hours) if site.working_hours else None
        return SiteConfig(
            site=SiteInfo(
                name=site.name,
                timezone=site.timezone,
                working_hours=wh,
                digest_time=site.digest_time,
            ),
            rules=GlobalRules(),
            cameras=[_camera_from_row(c, zones_by_cam.get(c.id, [])) for c in cams],
        )


def config_version(session_factory: sessionmaker[Session]) -> int:
    from soqchi.db.models import ConfigVersion

    with session_factory() as s:
        cv = s.get(ConfigVersion, 1)
        return cv.version if cv else 1


def bump_config_version(session_factory: sessionmaker[Session]) -> int:
    from sqlalchemy import func, update

    from soqchi.db.models import ConfigVersion

    with session_factory() as s:
        s.execute(
            update(ConfigVersion)
            .where(ConfigVersion.id == 1)
            .values(version=ConfigVersion.version + 1, updated_at=func.now())
        )
        s.commit()
        cv = s.get(ConfigVersion, 1)
        return cv.version if cv else 1


def seed_config_from_yaml(session_factory: sessionmaker[Session], cfg: SiteConfig) -> None:
    """Однократно переносит YAML-конфиг в пустую БД (site + камеры + зоны)."""
    from soqchi.db.models import Camera, ConfigVersion, Site, Zone

    with session_factory() as s:
        site = s.get(Site, 1)
        if site is None:
            s.add(
                Site(
                    id=1,
                    name=cfg.site.name,
                    timezone=cfg.site.timezone,
                    working_hours=cfg.site.working_hours.model_dump()
                    if cfg.site.working_hours
                    else None,
                    digest_time=cfg.site.digest_time,
                )
            )
        if s.get(ConfigVersion, 1) is None:
            s.add(ConfigVersion(id=1, version=1))
        has_cameras = s.execute(select(Camera.id).limit(1)).first() is not None
        if not has_cameras:
            for cam in cfg.cameras:
                s.add(
                    Camera(
                        id=cam.id,
                        site_id=1,
                        name=cam.name,
                        url=cam.url,
                        enabled=True,
                        process_fps=cam.process_fps,
                        detect_conf=cam.detect_conf,
                        detect_imgsz=cam.detect_imgsz,
                        motion=cam.motion.model_dump(),
                        clips=cam.clips.model_dump(),
                    )
                )
                for z in cam.zones:
                    s.add(
                        Zone(
                            camera_id=cam.id,
                            name=z.name,
                            type=z.type,
                            polygon=[[p[0], p[1]] for p in z.polygon],
                            rules=z.rules.model_dump(exclude_none=True),
                        )
                    )
        s.commit()
