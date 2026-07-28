"""Настройки организации для её АДМИНА (не платформенный бэкофис).

Пока — рабочий календарь: дефолт after_hours для всех камер организации.
Скоуп по current_scope, поэтому админ правит ТОЛЬКО свою организацию.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from pragmata.api.schemas import OrgHoursOut, OrgHoursPatch
from pragmata.api.security import Principal, current_scope, require_admin
from pragmata.services import config_service as cfgsvc

router = APIRouter(prefix="/api/v1", tags=["settings"])


@router.get("/settings", response_model=OrgHoursOut)
def get_org_settings(
    scope: int | None = Depends(current_scope),
    _p: Principal = Depends(require_admin),
) -> OrgHoursOut:
    return OrgHoursOut(**cfgsvc.get_org_settings(scope))


@router.patch("/settings", response_model=OrgHoursOut)
def patch_org_settings(
    payload: OrgHoursPatch,
    scope: int | None = Depends(current_scope),
    _p: Principal = Depends(require_admin),
) -> OrgHoursOut:
    return OrgHoursOut(**cfgsvc.patch_org_settings(scope, payload))
