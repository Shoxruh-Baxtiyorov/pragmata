"""Турникеты/СКУД — CRUD, ручное открытие, приём событий доступа.

Все эндпоинты гейтятся фичей подписки ``turnstile``: нет в тарифе → 403.
Тенант-изоляция — через ``current_scope`` (клиент видит только свою площадку).
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах FastAPI-роутов

from fastapi import APIRouter, Depends, HTTPException

from pragmata.analytics.entitlements import resolve
from pragmata.api.schemas import AccessEventIn, TurnstileIn, TurnstileOut, TurnstilePatch
from pragmata.api.security import current_scope
from pragmata.services import turnstile_service as svc

router = APIRouter(prefix="/api/v1/turnstiles", tags=["turnstiles"])


def require_turnstile(scope: int | None = Depends(current_scope)) -> int | None:
    """Фича 'turnstile' должна быть открыта тарифом площадки (админ — всегда)."""
    if "turnstile" not in resolve(scope).features:
        raise HTTPException(403, "турникеты недоступны в вашем тарифе")
    return scope


@router.get("", response_model=list[TurnstileOut])
def list_(scope: int | None = Depends(require_turnstile)) -> list[dict[str, object]]:
    return svc.list_turnstiles(scope)


@router.post("", response_model=TurnstileOut)
def create(
    payload: TurnstileIn, scope: int | None = Depends(require_turnstile)
) -> dict[str, object]:
    return svc.create_turnstile(payload, scope)


@router.patch("/{tid}", response_model=TurnstileOut)
def patch(
    tid: uuid.UUID, payload: TurnstilePatch, scope: int | None = Depends(require_turnstile)
) -> dict[str, object]:
    return svc.patch_turnstile(tid, payload, scope)


@router.delete("/{tid}")
def delete(tid: uuid.UUID, scope: int | None = Depends(require_turnstile)) -> dict[str, bool]:
    svc.delete_turnstile(tid, scope)
    return {"ok": True}


@router.post("/{tid}/open")
def open_(tid: uuid.UUID, scope: int | None = Depends(require_turnstile)) -> dict[str, object]:
    """Ручное открытие оператором (actuation по команде)."""
    return svc.open_turnstile(tid, scope, reason="manual")


@router.post("/{tid}/access")
def access(
    tid: uuid.UUID, payload: AccessEventIn, scope: int | None = Depends(require_turnstile)
) -> dict[str, object]:
    """Приём события доступа от турникета/интегратора (webhook) → в общую ленту."""
    return svc.ingest_access(tid, payload, scope)
