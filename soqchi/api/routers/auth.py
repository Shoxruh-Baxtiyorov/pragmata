"""Авторизация: логин юзера (username+argon2) или break-glass admin по паролю."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request

from soqchi.api.schemas import LoginRequest, TokenResponse
from soqchi.api.security import BOOTSTRAP_SUB, Principal, create_token, current_principal
from soqchi.config import get_settings
from soqchi.core.rate_limit import LoginThrottle
from soqchi.services import user_service

router = APIRouter(prefix="/api/v1", tags=["auth"])
_throttle = LoginThrottle()


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    ip = request.client.host if request.client else "unknown"
    locked = _throttle.locked_for(ip)
    if locked > 0:
        raise HTTPException(429, f"слишком много попыток, подождите {int(locked)} с")

    username = (payload.username or "").strip()
    if username:
        # обычный пользователь — user_service сам ведёт per-account lockout
        try:
            user = user_service.authenticate(username, payload.password)
        except HTTPException:
            _throttle.record_failure(ip)
            raise
        _throttle.reset(ip)
        return TokenResponse(
            access_token=create_token(str(user.id), user.role, user.username),
            role=user.role,
            username=user.username,
        )

    # break-glass: пустой username → вход по ADMIN_PASSWORD (бутстрап/совместимость)
    admin_password = get_settings().admin_password
    if not admin_password:
        raise HTTPException(503, "ADMIN_PASSWORD не задан в .env — вход выключен")
    if not secrets.compare_digest(payload.password, admin_password):
        _throttle.record_failure(ip)
        raise HTTPException(401, "неверный пароль")
    _throttle.reset(ip)
    return TokenResponse(
        access_token=create_token(BOOTSTRAP_SUB, "admin", "admin"),
        role="admin",
        username="admin",
    )


@router.get("/me")
def me(p: Principal = Depends(current_principal)) -> dict[str, str]:
    return {"sub": p.sub, "username": p.username, "role": p.role}
