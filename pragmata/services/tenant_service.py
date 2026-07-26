"""CRUD организаций (sites) и каталога тарифов (plans) для бэкофиса.

Организация — арендатор платформы. При заведении наследует глубину хранения от
своего тарифа. Тариф — редактируемый план из каталога; смена дефолтов плана
влияет на БУДУЩИЕ организации, существующим ретенцию не переписываем молча.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import func, select

from pragmata.api.deps import session_factory
from pragmata.db.config_store import bump_config_version

if TYPE_CHECKING:
    from pragmata.api.schemas import PlanIn, SiteCreate, SitePatch


# --- планы (тарифы) ---------------------------------------------------------


def list_plans() -> list[dict[str, object]]:
    from pragmata.db.models import Plan

    with session_factory()() as s:
        rows = s.execute(select(Plan).order_by(Plan.sort, Plan.key)).scalars().all()
        return [
            {
                "key": p.key,
                "name": p.name,
                "price_note": p.price_note,
                "retention_info_days": p.retention_info_days,
                "retention_alert_days": p.retention_alert_days,
                "active": p.active,
                "features": list(p.features or []),
            }
            for p in rows
        ]


def upsert_plan(key: str, patch: PlanIn, *, create: bool) -> dict[str, object]:
    from pragmata.db.models import Plan

    with session_factory()() as s:
        plan = s.get(Plan, key)
        if create:
            if plan is not None:
                raise HTTPException(409, f"тариф '{key}' уже есть")
            plan = Plan(key=key)
            s.add(plan)
        elif plan is None:
            raise HTTPException(404, "нет такого тарифа")
        if patch.name is not None:
            plan.name = patch.name
        if patch.price_note is not None:
            plan.price_note = patch.price_note
        if patch.retention_info_days is not None:
            plan.retention_info_days = max(1, patch.retention_info_days)
        if patch.retention_alert_days is not None:
            plan.retention_alert_days = max(1, patch.retention_alert_days)
        if patch.active is not None:
            plan.active = patch.active
        if patch.features is not None:
            plan.features = patch.features
        s.commit()
    return next(p for p in list_plans() if p["key"] == key)


def delete_plan(key: str) -> None:
    from pragmata.db.models import Plan, Site

    with session_factory()() as s:
        used = s.execute(
            select(func.count()).select_from(Site).where(Site.tariff == key)
        ).scalar_one()
        if used:
            raise HTTPException(409, f"тариф используют {used} организаций — смените их тариф")
        plan = s.get(Plan, key)
        if plan is None:
            raise HTTPException(404, "нет такого тарифа")
        s.delete(plan)
        s.commit()


# --- организации (sites) ----------------------------------------------------


def create_site(payload: SiteCreate) -> int:
    from pragmata.db.models import Plan, Site

    with session_factory()() as s:
        plan = s.get(Plan, payload.tariff)
        if plan is None:
            raise HTTPException(422, f"нет тарифа '{payload.tariff}'")
        site = Site(
            name=payload.name.strip(),
            timezone=payload.timezone or "Asia/Tashkent",
            tariff=payload.tariff,
            # глубину хранения наследуем от тарифа при заведении
            retention_info_days=plan.retention_info_days,
            retention_alert_days=plan.retention_alert_days,
        )
        s.add(site)
        s.commit()
        sid = site.id
    bump_config_version(session_factory())
    return sid


def patch_site(site_id: int, patch: SitePatch) -> None:
    from pragmata.db.models import Plan, Site

    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            raise HTTPException(404, "нет такой организации")
        if patch.name is not None:
            site.name = patch.name.strip()
        if patch.timezone is not None:
            site.timezone = patch.timezone
        if patch.tariff is not None:
            if s.get(Plan, patch.tariff) is None:
                raise HTTPException(422, f"нет тарифа '{patch.tariff}'")
            site.tariff = patch.tariff
        s.commit()
    bump_config_version(session_factory())


def delete_site(site_id: int) -> None:
    from pragmata.db.models import Camera, Site, User

    if site_id == 1:
        raise HTTPException(422, "нельзя удалить основную организацию")
    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            raise HTTPException(404, "нет такой организации")
        cams = s.execute(
            select(func.count()).select_from(Camera).where(Camera.site_id == site_id)
        ).scalar_one()
        users = s.execute(
            select(func.count()).select_from(User).where(User.site_id == site_id)
        ).scalar_one()
        if cams or users:
            raise HTTPException(
                409,
                f"в организации {cams} камер и {users} юзеров — сначала перенесите их",
            )
        s.delete(site)
        s.commit()
    bump_config_version(session_factory())
