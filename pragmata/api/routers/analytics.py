"""Каталог модулей видеоаналитики.

Отдаёт весь реестр (analytics.registry) — фронт рисует по нему страницу «Модули
аналитики»: карточки по категориям с тумблером и параметрами. Конфиг конкретной
камеры/зоны живёт в cameras-роутере (Camera.analytics / Zone.rules).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from pragmata.analytics import catalog
from pragmata.api.security import Principal, current_principal

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/modules", response_model=dict)
def modules(_: Principal = Depends(current_principal)) -> dict[str, object]:
    """Все функции аналитики, которые клиент может включить и настроить."""
    return catalog()
