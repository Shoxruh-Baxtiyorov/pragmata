"""Каталог модулей видеоаналитики.

Отдаёт весь реестр (analytics.registry) — фронт рисует по нему страницу «Модули
аналитики»: карточки по категориям с тумблером и параметрами. Конфиг конкретной
камеры/зоны живёт в cameras-роутере (Camera.analytics / Zone.rules).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from pragmata.analytics import catalog
from pragmata.analytics.entitlements import resolve
from pragmata.api.security import current_scope

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/modules", response_model=dict)
def modules(scope: int | None = Depends(current_scope)) -> dict[str, object]:
    """Каталог модулей аналитики. Каждый модуль помечен флагом ``entitled`` по
    тарифу площадки: закрытые фронт рисует заблокированными."""
    return catalog(resolve(scope).modules)
