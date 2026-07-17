"""JWT-аутентификация Dashboard API: один админ, HS256, fail-closed без ключей."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from soqchi.config import get_settings

ALGO = "HS256"
TTL_HOURS = 12

_bearer = HTTPBearer(auto_error=False)


def _secret() -> str:
    secret = get_settings().secret_key
    if not secret:
        # тихо работающая без ключа авторизация хуже громкого отказа
        raise HTTPException(503, "SECRET_KEY не задан в .env — API-авторизация выключена")
    return secret


def create_token() -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": "admin", "iat": now, "exp": now + timedelta(hours=TTL_HOURS)},
        _secret(),
        algorithm=ALGO,
    )


def require_auth(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    secret = _secret()
    if cred is None:
        raise HTTPException(401, "нужен Authorization: Bearer <token>")
    try:
        payload = jwt.decode(cred.credentials, secret, algorithms=[ALGO])
    except jwt.PyJWTError as err:
        raise HTTPException(401, "токен невалиден или истёк") from err
    return str(payload.get("sub", ""))
