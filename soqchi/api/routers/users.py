"""Управление пользователями — только для admin (задел под бэкофис).

Обычный юзер может сменить лишь свой пароль (/me/password). Всё остальное
(создать/список/роль/деактивация/сброс пароля) — под require_admin.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, HTTPException

from soqchi.api.schemas import OkOut, PasswordChange, UserCreate, UserOut, UserPatch
from soqchi.api.security import BOOTSTRAP_SUB, Principal, current_principal, require_admin
from soqchi.services import user_service as svc

router = APIRouter(prefix="/api/v1", tags=["users"])


@router.get("/users", response_model=list[UserOut])
def list_users(_: Principal = Depends(require_admin)) -> list[UserOut]:
    return svc.list_users()


@router.post("/users", response_model=dict)
def create_user(payload: UserCreate, _: Principal = Depends(require_admin)) -> dict[str, str]:
    return {"id": str(svc.create_user(payload))}


@router.patch("/users/{user_id}", response_model=OkOut)
def patch_user(
    user_id: uuid.UUID, payload: UserPatch, _: Principal = Depends(require_admin)
) -> OkOut:
    svc.patch_user(user_id, payload)
    return OkOut()


@router.post("/users/{user_id}/password", response_model=OkOut)
def reset_password(
    user_id: uuid.UUID, payload: PasswordChange, _: Principal = Depends(require_admin)
) -> OkOut:
    svc.change_password(user_id, payload.new_password)
    return OkOut()


@router.post("/me/password", response_model=OkOut)
def change_own_password(
    payload: PasswordChange, p: Principal = Depends(current_principal)
) -> OkOut:
    if p.sub == BOOTSTRAP_SUB:
        raise HTTPException(400, "пароль break-glass admin меняется в .env (ADMIN_PASSWORD)")
    svc.change_password(uuid.UUID(p.sub), payload.new_password)
    return OkOut()
