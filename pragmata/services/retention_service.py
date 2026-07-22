"""Ретенция медиа: диск не бесконечен, а 73% кадров — рутина.

Замеры на живом стенде: ≈1 ГБ на камеру в сутки (кадр ~76 КБ, ~600 событий на
камеру в час). Десять камер съедают 300 ГБ в месяц — без уборки объект встаёт.

Правила (решение владельца продукта):
- срок зависит от важности: info тает быстро, warning/alert живут долго;
- глубина задаётся ТАРИФОМ организации (basic 7/90, pro настраивается);
- удаляются ТОЛЬКО файлы, строка события остаётся — история статистики за год
  весит байты, а кадры гигабайты; в UI будет «кадр удалён по сроку хранения»;
- квота по объёму (media_quota_gb) — аварийный тормоз поверх сроков.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import or_, select

from pragmata.api.deps import session_factory
from pragmata.config import get_settings

if TYPE_CHECKING:
    from pathlib import Path

    from sqlalchemy.orm import Session

log = logging.getLogger("pragmata.retention")

# сколько строк подчищаем за один заход: длинная транзакция блокировала бы БД
BATCH = 500
MEDIA_FIELDS = ("frame_path", "face_path", "clip_path")


def _unlink(root: Path, rel: str | None) -> int:
    """Удалить файл, вернув освобождённые байты. Отсутствующий файл — не ошибка."""
    if not rel:
        return 0
    path = root / rel
    try:
        size = path.stat().st_size
        path.unlink()
    except (OSError, ValueError):
        return 0
    return size


def _strip_media(s: Session, root: Path, events: list[object]) -> tuple[int, int]:
    """Снести файлы событий и обнулить ссылки. → (сколько строк, сколько байт)."""
    freed = 0
    for ev in events:
        for field in MEDIA_FIELDS:
            freed += _unlink(root, getattr(ev, field, None))
            setattr(ev, field, None)
    s.flush()
    return len(events), freed


def cleanup_site(site_id: int, now: datetime | None = None) -> dict[str, int]:
    """Прибрать медиа одной организации по её тарифу. → статистика уборки."""
    from pragmata.db.models import Event, Site

    now = now or datetime.now(UTC)
    root = get_settings().media_dir
    cleaned = freed = 0

    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            return {"events": 0, "freed_bytes": 0}

        info_before = now - timedelta(days=site.retention_info_days)
        alert_before = now - timedelta(days=site.retention_alert_days)

        # у каждой важности свой порог: улики переживают рутину
        expired = or_(
            (Event.severity == "info") & (Event.t_start < info_before),
            (Event.severity != "info") & (Event.t_start < alert_before),
        )
        has_media = or_(*(getattr(Event, f).is_not(None) for f in MEDIA_FIELDS))

        while True:
            batch = list(
                s.execute(
                    select(Event)
                    .where(Event.site_id == site_id, expired, has_media)
                    .order_by(Event.t_start)
                    .limit(BATCH)
                )
                .scalars()
                .all()
            )
            if not batch:
                break
            n, b = _strip_media(s, root, batch)
            cleaned += n
            freed += b
            s.commit()

        site.media_cleaned_at = now
        s.commit()

    if cleaned:
        log.info("ретенция site=%s: очищено %d событий, освобождено %.1f МБ",
                 site_id, cleaned, freed / 1024 / 1024)
    return {"events": cleaned, "freed_bytes": freed}


def enforce_quota(site_id: int) -> dict[str, int]:
    """Аварийный тормоз: если объём выше квоты — сносим самое старое сверх сроков.

    Работает поверх сроков: сначала уходит рутина, и только если этого мало —
    старые улики. Иначе диск кончится раньше, чем наступит срок хранения.
    """
    from pragmata.db.models import Event, Site

    root = get_settings().media_dir
    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None or site.media_quota_gb <= 0:
            return {"events": 0, "freed_bytes": 0}
        limit = site.media_quota_gb * 1024**3

    used = sum(f.stat().st_size for f in root.rglob("*") if f.is_file())
    if used <= limit:
        return {"events": 0, "freed_bytes": 0}

    need = used - limit
    cleaned = freed = 0
    has_media = or_(*(getattr(Event, f).is_not(None) for f in MEDIA_FIELDS))
    with session_factory()() as s:
        while freed < need:
            batch = list(
                s.execute(
                    select(Event)
                    .where(Event.site_id == site_id, has_media)
                    # рутина первой, и внутри — самое старое
                    .order_by((Event.severity != "info"), Event.t_start)
                    .limit(BATCH)
                )
                .scalars()
                .all()
            )
            if not batch:
                break
            n, b = _strip_media(s, root, batch)
            cleaned += n
            freed += b
            s.commit()
    log.warning("квота site=%s превышена: снесено %d событий (%.1f МБ)",
                site_id, cleaned, freed / 1024 / 1024)
    return {"events": cleaned, "freed_bytes": freed}


def referenced_paths() -> set[str]:
    """Все файлы, на которые ссылается БД. Остальное на диске — сироты."""
    from pragmata.db.models import Event, Person, PersonPhoto, Track

    cols = (
        Event.frame_path,
        Event.face_path,
        Event.clip_path,
        Track.best_frame_path,
        Person.ref_photo_path,
        PersonPhoto.path,
    )
    refs: set[str] = set()
    with session_factory()() as s:
        for col in cols:
            refs.update(
                p for p in s.execute(select(col).where(col.is_not(None))).scalars().all() if p
            )
    return refs


def sweep_orphans(grace_hours: int = 24) -> dict[str, int]:
    """Снести файлы, на которые не ссылается никто.

    Главный пожиратель диска — не просроченные события, а именно сироты: кадры
    пишутся на каждый трек, а событием становится меньшая часть. На живом стенде
    из 37928 файлов в БД числились 5402 — 86% объёма были мусором.

    grace_hours защищает файлы, которые прямо сейчас пишет пайплайн: они ещё не
    успели попасть в БД, и снести их означало бы гонку.
    """
    root = get_settings().media_dir
    if not root.exists():
        return {"files": 0, "freed_bytes": 0}

    refs = referenced_paths()
    cutoff = datetime.now(UTC).timestamp() - grace_hours * 3600
    files = freed = 0
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = str(path.relative_to(root))
        if rel in refs:
            continue
        try:
            st = path.stat()
            if st.st_mtime > cutoff:  # свежий — возможно, ещё не записан в БД
                continue
            path.unlink()
        except OSError:
            continue
        files += 1
        freed += st.st_size

    if files:
        log.info("сироты: снесено %d файлов, освобождено %.1f МБ", files, freed / 1024 / 1024)
    return {"files": files, "freed_bytes": freed}


def cleanup_all(now: datetime | None = None) -> dict[str, int]:
    """Пройтись по всем организациям: сроки, затем квота."""
    from pragmata.db.models import Site

    total = {"events": 0, "freed_bytes": 0, "orphans": 0}
    with session_factory()() as s:
        site_ids = list(s.execute(select(Site.id)).scalars().all())
    for sid in site_ids:
        for res in (cleanup_site(sid, now), enforce_quota(sid)):
            total["events"] += res["events"]
            total["freed_bytes"] += res["freed_bytes"]
    # сироты не принадлежат организации (файл уже ничей) — метём один раз в конце
    orphans = sweep_orphans()
    total["orphans"] = orphans["files"]
    total["freed_bytes"] += orphans["freed_bytes"]
    return total
