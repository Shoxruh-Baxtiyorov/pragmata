"""Shared-зависимости и хелперы роутеров (паттерн app/dependencies.py в iqbola)."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException

from soqchi.config import get_settings, load_site_config

if TYPE_CHECKING:
    from soqchi.config import SiteConfig


@lru_cache(maxsize=1)
def session_factory() -> Any:
    from soqchi.db.session import make_session_factory

    return make_session_factory()


@lru_cache(maxsize=1)
def site_config() -> SiteConfig | None:
    path = get_settings().site_config
    return load_site_config(path) if Path(path).exists() else None


def require_site() -> SiteConfig:
    cfg = site_config()
    if cfg is None:
        raise HTTPException(503, "SITE_CONFIG не найден — API не знает камеры/зоны")
    return cfg


def data_root() -> Path:
    return get_settings().media_dir.parent


def camera_names() -> dict[str, str]:
    cfg = site_config()
    if cfg is not None:
        return {c.id: c.name for c in cfg.cameras}
    from sqlalchemy import select

    from soqchi.db.models import Camera

    with session_factory()() as s:
        return {c.id: c.name for c in s.execute(select(Camera)).scalars().all()}


def safe_file(root: Path, rel_or_abs: str) -> Path:
    """Файлы только из-под доверенного корня (анти-traversal)."""
    root = root.resolve()
    p = Path(rel_or_abs)
    full = (p if p.is_absolute() else root / p).resolve()
    if full != root and not str(full).startswith(str(root) + "/"):
        raise HTTPException(404, "нет такого файла")
    if not full.exists():
        raise HTTPException(404, "нет такого файла")
    return full
