"""Авторизация: логин юзера (username+argon2), опционально TOTP второй фактор."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from soqchi.api.schemas import LoginRequest, TokenResponse
from soqchi.api.security import Principal, create_token, current_principal, ensure_configured
from soqchi.core.rate_limit import LoginThrottle
from soqchi.services import user_service

router = APIRouter(prefix="/api/v1", tags=["auth"])
_throttle = LoginThrottle()


@router.post("/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request) -> TokenResponse:
    ensure_configured()  # fail-closed: без SECRET_KEY вход выключен (503)
    ip = request.client.host if request.client else "unknown"
    locked = _throttle.locked_for(ip)
    if locked > 0:
        raise HTTPException(429, f"слишком много попыток, подождите {int(locked)} с")

    username = (payload.username or "").strip()
    if not username:
        raise HTTPException(401, "неверный логин или пароль")
    try:
        user = user_service.authenticate(username, payload.password)
    except HTTPException:
        _throttle.record_failure(ip)
        raise
    # 2FA: пароль верный, но нужен TOTP-код второго фактора.
    # IP-троттлинг здесь НЕ сбрасываем: сброс позволял обнулять счётчик
    # между попытками подбора кода (аудит: brute-force второго фактора).
    if user.totp_enabled:
        if not payload.code:
            return TokenResponse(access_token="", mfa_required=True, role="", username="")
        from soqchi.core import totp

        if not totp.verify_once(user.totp_secret or "", payload.code, str(user.id)):
            _throttle.record_failure(ip)
            user_service.record_totp_failure(user.id)
            raise HTTPException(401, "неверный код")
    _throttle.reset(ip)
    user_service.mark_login(user.id)
    return TokenResponse(
        access_token=create_token(str(user.id), user.role, user.username),
        role=user.role,
        username=user.username,
    )


@router.get("/me")
def me(p: Principal = Depends(current_principal)) -> dict[str, str]:
    return {"sub": p.sub, "username": p.username, "role": p.role}
