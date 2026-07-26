"""Бэкофис — единая админ-панель под жёстким гейтом require_backoffice.

По логике Iqbola: доступ сюда — не просто роль admin, а отдельный allowlist
BACKOFFICE_USERS (см. security.require_backoffice). Гейт висит на всём роутере
(dependencies=[...]) — ни один эндпоинт нельзя случайно открыть без него.

Здесь живут НОВЫЕ админ-операции: обзор объекта, настройки, восстановление
доступа (сброс 2FA / снятие локаута). CRUD камер/людей/юзеров остаётся в своих
роутерах, но их write-операции переведены на тот же require_backoffice.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from pragmata.api.deps import session_factory
from pragmata.api.schemas import (
    AuditEntryOut,
    BackofficeOverview,
    OkOut,
    PlanIn,
    SiteCreate,
    SitePatch,
    SiteSettingsOut,
    SiteSettingsPatch,
)
from pragmata.api.security import require_backoffice
from pragmata.config import get_settings
from pragmata.services import config_service as cfgsvc
from pragmata.services import user_service

router = APIRouter(
    prefix="/api/v1/backoffice",
    tags=["backoffice"],
    dependencies=[Depends(require_backoffice)],  # гейт на весь роутер, не по эндпоинтам
)


@router.get("/overview", response_model=BackofficeOverview)
def overview() -> BackofficeOverview:
    from pragmata.db.models import Camera, Event, Person, Site, User

    now = datetime.now(UTC)
    with session_factory()() as s:
        site = s.get(Site, 1)
        tz = ZoneInfo(site.timezone if site else "Asia/Tashkent")
        midnight = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
        day_start = midnight.astimezone(UTC)

        def n(stmt: object) -> int:
            return int(s.execute(stmt).scalar_one())

        cnt = func.count()
        settings = get_settings()
        return BackofficeOverview(
            users_total=n(select(cnt).select_from(User)),
            users_active=n(select(cnt).select_from(User).where(User.is_active.is_(True))),
            admins=n(select(cnt).select_from(User).where(User.role == "admin")),
            users_with_2fa=n(select(cnt).select_from(User).where(User.totp_enabled.is_(True))),
            users_locked=n(select(cnt).select_from(User).where(User.locked_until > now)),
            cameras_total=n(select(cnt).select_from(Camera)),
            cameras_enabled=n(select(cnt).select_from(Camera).where(Camera.enabled.is_(True))),
            persons_total=n(select(cnt).select_from(Person)),
            events_today=n(
                select(cnt)
                .select_from(Event)
                .where(Event.source == "live", Event.t_start >= day_start)
            ),
            llm_model=settings.llm_model,
            llm_enabled=bool(settings.llm_api_key),
        )


@router.get("/sites", response_model=list[dict[str, object]])
def sites() -> list[dict[str, object]]:
    """Организации-клиенты — для переключателя: владелец смотрит их по одному."""
    from pragmata.db.models import Camera, Site

    with session_factory()() as s:
        cams = dict(
            s.execute(select(Camera.site_id, func.count()).group_by(Camera.site_id)).all()
        )
        return [
            {"id": row.id, "name": row.name, "tariff": row.tariff, "cameras": cams.get(row.id, 0)}
            for row in s.execute(select(Site).order_by(Site.id)).scalars().all()
        ]


# --- CRUD организаций ---------------------------------------------------------


@router.post("/sites", response_model=dict[str, int])
def create_site(payload: SiteCreate) -> dict[str, int]:
    from pragmata.services import tenant_service as tsvc

    return {"id": tsvc.create_site(payload)}


@router.patch("/sites/{site_id}", response_model=OkOut)
def patch_site(site_id: int, payload: SitePatch) -> OkOut:
    from pragmata.services import tenant_service as tsvc

    tsvc.patch_site(site_id, payload)
    return OkOut()


@router.delete("/sites/{site_id}", response_model=OkOut)
def delete_site(site_id: int) -> OkOut:
    from pragmata.services import tenant_service as tsvc

    tsvc.delete_site(site_id)
    return OkOut()


# --- CRUD тарифов (каталог планов) -------------------------------------------


@router.get("/plans", response_model=list[dict[str, object]])
def list_plans() -> list[dict[str, object]]:
    from pragmata.services import tenant_service as tsvc

    return tsvc.list_plans()


@router.post("/plans/{key}", response_model=dict[str, object])
def create_plan(key: str, payload: PlanIn) -> dict[str, object]:
    from pragmata.services import tenant_service as tsvc

    return tsvc.upsert_plan(key, payload, create=True)


@router.patch("/plans/{key}", response_model=dict[str, object])
def patch_plan(key: str, payload: PlanIn) -> dict[str, object]:
    from pragmata.services import tenant_service as tsvc

    return tsvc.upsert_plan(key, payload, create=False)


@router.delete("/plans/{key}", response_model=OkOut)
def delete_plan(key: str) -> OkOut:
    from pragmata.services import tenant_service as tsvc

    tsvc.delete_plan(key)
    return OkOut()


# --- настройки объекта ------------------------------------------------------


@router.get("/settings", response_model=SiteSettingsOut)
def get_settings_ep() -> SiteSettingsOut:
    return SiteSettingsOut(**cfgsvc.get_site_settings())


@router.patch("/settings", response_model=SiteSettingsOut)
def patch_settings_ep(payload: SiteSettingsPatch) -> SiteSettingsOut:
    return SiteSettingsOut(**cfgsvc.patch_site_settings(payload))


# --- ретенция медиа ---------------------------------------------------------


@router.post("/retention/run", response_model=dict)
def run_retention(site_id: int | None = None) -> dict[str, object]:
    """Прибрать медиа сейчас, не дожидаясь ночного прохода.

    Кадры удаляются, строки событий остаются — история статистики не рвётся.
    """
    from pragmata.services import retention_service as rsvc

    res = rsvc.cleanup_all() if site_id is None else rsvc.cleanup_site(site_id)
    return {
        "events": res["events"],
        "freed_mb": round(res["freed_bytes"] / 1024 / 1024, 1),
        "orphans": res.get("orphans", 0),
        "note": "кадры удалены, события сохранены",
    }


# --- журнал действий --------------------------------------------------------


@router.get("/audit", response_model=list[AuditEntryOut])
def audit(
    limit: int = Query(100, ge=1, le=500),
    actor: str | None = None,
    only_writes: bool = False,
) -> list[AuditEntryOut]:
    """Последние действия: кто, что, когда, откуда, с каким итогом."""
    from pragmata.db.models import AuditLog

    q = select(AuditLog).order_by(AuditLog.ts.desc()).limit(limit)
    if actor:
        q = q.where(AuditLog.actor == actor)
    if only_writes:
        q = q.where(AuditLog.method != "GET")
    with session_factory()() as s:
        rows = s.execute(q).scalars().all()
    return [
        AuditEntryOut(
            id=r.id,
            ts=r.ts,
            actor=r.actor,
            method=r.method,
            path=r.path,
            status_code=r.status_code,
            ip=r.ip,
        )
        for r in rows
    ]


# --- восстановление доступа пользователей -----------------------------------


@router.post("/users/{user_id}/2fa/reset", response_model=OkOut)
def reset_user_2fa(user_id: uuid.UUID) -> OkOut:
    """Снять 2FA юзеру без кода — когда он потерял аутентификатор."""
    user_service.admin_reset_totp(user_id)
    return OkOut()


@router.post("/users/{user_id}/unlock", response_model=OkOut)
def unlock_user_ep(user_id: uuid.UUID) -> OkOut:
    """Снять brute-force локаут (обнулить попытки и locked_until)."""
    user_service.unlock_user(user_id)
    return OkOut()
