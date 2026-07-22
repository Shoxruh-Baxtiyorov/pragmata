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

from pragmata.config import get_settings

ALGO = "HS256"
TTL_HOURS = 12

_bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    sub: str
    role: str
    username: str
    site_id: int | None = None  # организация клиента; None у платформенного админа

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def scope(self) -> int | None:
        """Организация, которой ограничен запрос. None = видно всё (платформа).

        Клиент без организации не должен видеть ЧУЖОЕ, поэтому ему отдаём
        заведомо несуществующий site (-1), а не None: иначе баг в данных
        превратился бы в утечку между арендаторами.
        """
        if self.is_admin:
            return None
        return self.site_id if self.site_id is not None else -1


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
    from pragmata.api.deps import session_factory
    from pragmata.db.models import User

    try:
        uid = uuid.UUID(sub)
    except ValueError as err:
        raise HTTPException(401, "токен невалиден") from err
    with session_factory()() as s:
        user = s.get(User, uid)
    if user is None or not user.is_active:
        raise HTTPException(401, "аккаунт отключён")
    return Principal(sub=sub, role=user.role, username=user.username, site_id=user.site_id)


def peek_token(header: str | None) -> tuple[str | None, str]:
    """(sub, username) из Bearer-заголовка БЕЗ похода в БД и без исключений.

    Для аудита: middleware не должен ронять запрос и не может позволить себе
    запрос к БД на каждый вызов. Невалидный/отсутствующий токен → anonymous.
    """
    if not header or not header.lower().startswith("bearer "):
        return None, "anonymous"
    try:
        payload = jwt.decode(header[7:].strip(), get_settings().secret_key, algorithms=[ALGO])
    except (jwt.PyJWTError, ValueError):
        return None, "anonymous"
    sub = str(payload.get("sub") or "") or None
    return sub, str(payload.get("username") or "anonymous")


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


def current_scope(p: Principal = Depends(current_principal)) -> int | None:
    """Организация, которой ограничен запрос. None = платформа, видно всё."""
    return p.scope


def own_camera_or_404(camera_id: str, scope: int | None) -> None:
    """Камера чужой организации должна выглядеть как несуществующая.

    404, а не 403: 403 подтвердил бы, что такая камера есть — это утечка
    самого факта. Платформенный админ (scope=None) проходит всегда.
    """
    from pragmata.api.deps import session_factory
    from pragmata.db.models import Camera

    with session_factory()() as s:
        cam = s.get(Camera, camera_id)
    if cam is None or (scope is not None and cam.site_id != scope):
        raise HTTPException(404, "нет такой камеры")


def require_backoffice(p: Principal = Depends(current_principal)) -> Principal:
    """Гейт бэкофиса (по логике Iqbola): роли admin МАЛО — юзер должен быть в
    отдельном allowlist BACKOFFICE_USERS. Пустой allowlist = бэкофис закрыт для
    всех (secure default: доступ выдаётся явно, а не по умолчанию всем админам).
    """
    if not p.is_admin:
        raise HTTPException(403, "нужны права администратора")
    allow = get_settings().backoffice_usernames
    if p.username.lower() not in allow:
        raise HTTPException(403, "доступ к бэкофису не выдан (нет в BACKOFFICE_USERS)")
    return p
