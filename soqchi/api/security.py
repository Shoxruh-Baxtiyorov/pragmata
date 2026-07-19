"""JWT-аутентификация Dashboard API: пользователи (login+argon2).

HS256, fail-closed без ключей. Токен несёт только sub (id юзера); role и
username на каждый запрос берутся из БД — понижение роли или деактивация
действуют мгновенно, не дожидаясь истечения токена (аудит: revocation lag).
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


def ensure_configured() -> None:
    """Явная fail-closed проверка для роутов, где токен ещё не создаётся."""
    _secret()


def _load_principal(sub: str) -> Principal:
    """role/username из БД, не из токена: понижение/блокировка действуют сразу."""
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
    return Principal(sub=sub, role=user.role, username=user.username)


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
    return _load_principal(sub)


def require_auth(p: Principal = Depends(current_principal)) -> str:
    """Любой аутентифицированный пользователь. Возвращает sub (id юзера или 'admin')."""
    return p.sub


def require_admin(p: Principal = Depends(current_principal)) -> Principal:
    if not p.is_admin:
        raise HTTPException(403, "нужны права администратора")
    return p
