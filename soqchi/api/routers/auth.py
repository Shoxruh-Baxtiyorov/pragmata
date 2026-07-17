"""Авторизация: логин с brute-force lockout + проверка токена."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request

from soqchi.api.schemas import LoginRequest, TokenResponse
from soqchi.api.security import create_token, require_auth
from soqchi.config import get_settings
from soqchi.core.rate_limit import LoginThrottle

router = APIRouter(prefix="/api/v1", tags=["auth"])
_throttle = LoginThrottle()


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    admin_password = get_settings().admin_password
    if not admin_password:
        raise HTTPException(503, "ADMIN_PASSWORD не задан в .env — вход выключен")

    ip = request.client.host if request.client else "unknown"
    locked = _throttle.locked_for(ip)
    if locked > 0:
        raise HTTPException(429, f"слишком много попыток, подождите {int(locked)} с")

    if not secrets.compare_digest(payload.password, admin_password):
        _throttle.record_failure(ip)
        raise HTTPException(401, "неверный пароль")

    _throttle.reset(ip)
    return TokenResponse(access_token=create_token())


@router.get("/me")
def me(sub: str = Depends(require_auth)) -> dict[str, str]:
    return {"sub": sub}
