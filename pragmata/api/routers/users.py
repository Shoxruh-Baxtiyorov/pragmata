"""Управление пользователями — только для admin (задел под бэкофис).

Обычный юзер может сменить лишь свой пароль (/me/password). Всё остальное
(создать/список/роль/деактивация/сброс пароля) — под require_admin.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends

from pragmata.api.schemas import (
    OkOut,
    PasswordChange,
    TotpCode,
    TotpSetupOut,
    TotpStatus,
    UserCreate,
    UserOut,
    UserPatch,
)
from pragmata.api.security import Principal, current_principal, require_admin
from pragmata.services import user_service as svc


def _self_id(p: Principal) -> uuid.UUID:
    return uuid.UUID(p.sub)

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
    svc.change_password(_self_id(p), payload.new_password)
    return OkOut()


# --- TOTP-2FA (self-service, любой аутентифицированный реальный юзер) --------


@router.get("/me/2fa", response_model=TotpStatus)
def totp_status(p: Principal = Depends(current_principal)) -> TotpStatus:
    return TotpStatus(enabled=svc.totp_status(_self_id(p)))


@router.post("/me/2fa/setup", response_model=TotpSetupOut)
def totp_setup(p: Principal = Depends(current_principal)) -> TotpSetupOut:
    secret, uri, qr = svc.setup_totp(_self_id(p))
    return TotpSetupOut(secret=secret, otpauth_uri=uri, qr_svg=qr)


@router.post("/me/2fa/enable", response_model=OkOut)
def totp_enable(payload: TotpCode, p: Principal = Depends(current_principal)) -> OkOut:
    svc.enable_totp(_self_id(p), payload.code)
    return OkOut()


@router.post("/me/2fa/disable", response_model=OkOut)
def totp_disable(payload: TotpCode, p: Principal = Depends(current_principal)) -> OkOut:
    svc.disable_totp(_self_id(p), payload.code)
    return OkOut()
