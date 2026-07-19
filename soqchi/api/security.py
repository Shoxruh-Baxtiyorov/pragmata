"""JWT-аутентификация Dashboard API: пользователи (login+argon2) + break-glass admin.

HS256, fail-closed без ключей. Токен несёт sub (id юзера или "admin"), role,
username. current_principal на каждый запрос проверяет, что реальный юзер не
деактивирован (мгновенная блокировка без ожидания истечения токена).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from soqchi.config import get_settings

ALGO = "HS256"
TTL_HOURS = 12
BOOTSTRAP_SUB = "admin"  # вход по ADMIN_PASSWORD (break-glass, без строки в users)

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    sub: str
    role: str
    username: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def _secret() -> str:
    secret = get_settings().secret_key
    if not secret:
        # тихо работающая без ключа авторизация хуже громкого отказа
        raise HTTPException(503, "SECRET_KEY не задан в .env — API-авторизация выключена")
    return secret


def create_token(sub: str, role: str, username: str) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": sub,
            "role": role,
            "username": username,
            "iat": now,
            "exp": now + timedelta(hours=TTL_HOURS),
        },
        _secret(),
        algorithm=ALGO,
    )


def _assert_active(sub: str) -> None:
    """Реальный юзер деактивирован/удалён → мгновенный отказ, не ждём exp токена."""
    from soqchi.api.deps import session_factory
    from soqchi.db.models import User

    try:
        uid = uuid.UUID(sub)
    except ValueError as err:
        raise HTTPException(401, "токен невалиден") from err
    with session_factory()() as s:
        user = s.get(User, uid)
    if user is None or not user.is_active:
        raise HTTPException(401, "аккаунт отключён")


def current_principal(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> Principal:
    secret = _secret()
    if cred is None:
        raise HTTPException(401, "нужен Authorization: Bearer <token>")
    try:
        payload = jwt.decode(cred.credentials, secret, algorithms=[ALGO])
    except jwt.PyJWTError as err:
        raise HTTPException(401, "токен невалиден или истёк") from err
    sub = str(payload.get("sub", ""))
    if not sub:
        raise HTTPException(401, "токен невалиден")
    if sub != BOOTSTRAP_SUB:
        _assert_active(sub)
    return Principal(
        sub=sub,
        role=str(payload.get("role", "user")),
        username=str(payload.get("username", "")),
    )


def require_auth(p: Principal = Depends(current_principal)) -> str:
    """Любой аутентифицированный пользователь. Возвращает sub (id юзера или 'admin')."""
    return p.sub


def require_admin(p: Principal = Depends(current_principal)) -> Principal:
    if not p.is_admin:
        raise HTTPException(403, "нужны права администратора")
    return p
