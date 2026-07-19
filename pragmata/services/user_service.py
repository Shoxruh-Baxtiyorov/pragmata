"""Пользователи дашборда: аутентификация (per-account lockout) + админский CRUD.

Логин — по username (в нижнем регистре). Пароли — argon2id (core.passwords).
Enum-timing: на несуществующем юзере всё равно гоняем verify по фиктивному хешу,
чтобы ответ по времени не выдавал, есть логин или нет.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import func, select

from pragmata.api.deps import session_factory
from pragmata.core.passwords import hash_password, needs_rehash, verify_password

if TYPE_CHECKING:
    from pragmata.api.schemas import UserCreate, UserOut, UserPatch
    from pragmata.db.models import User

MAX_FAILED = 5  # столько промахов подряд → блокировка аккаунта
LOCK_MINUTES = 15
# фиктивный argon2-хеш «нет такого юзера» — verify всё равно тратит время (анти-enum)
_DUMMY_HASH = hash_password("pragmata-nonexistent-account-timing-guard")


def _now() -> datetime:
    return datetime.now(UTC)


def authenticate(username: str, password: str) -> User:
    from pragmata.db.models import User

    uname = username.strip().lower()
    with session_factory()() as s:
        user: User | None = s.execute(
            select(User).where(User.username == uname)
        ).scalar_one_or_none()

        if user is None:
            verify_password(_DUMMY_HASH, password)  # выравниваем тайминг
            raise HTTPException(401, "неверный логин или пароль")

        if user.locked_until is not None and user.locked_until > _now():
            wait = int((user.locked_until - _now()).total_seconds())
            raise HTTPException(429, f"аккаунт временно заблокирован, подождите {wait} с")

        if not verify_password(user.password_hash, password):
            user.failed_attempts += 1
            if user.failed_attempts >= MAX_FAILED:
                user.locked_until = _now() + timedelta(minutes=LOCK_MINUTES)
                user.failed_attempts = 0
            s.commit()
            raise HTTPException(401, "неверный логин или пароль")

        if not user.is_active:
            raise HTTPException(403, "аккаунт отключён")

        # пароль верный, но счётчики НЕ сбрасываем: при включённой 2FA неверные
        # коды копятся в failed_attempts, и сброс здесь позволял бы обнулять их
        # каждым повторным логином (аудит: brute-force кода). Полный сброс —
        # только в mark_login() после завершённого входа.
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        s.commit()
        s.refresh(user)
        s.expunge(user)
        return user


def mark_login(user_id: uuid.UUID) -> None:
    """Отметить успешный ПОЛНЫЙ вход (после 2FA, если включена) + сброс счётчиков."""
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is not None:
            user.last_login_at = _now()
            user.failed_attempts = 0
            user.locked_until = None
            s.commit()


def record_totp_failure(user_id: uuid.UUID) -> None:
    """Неверный TOTP-код бьёт по тому же per-account lockout, что и пароль."""
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            return
        user.failed_attempts += 1
        if user.failed_attempts >= MAX_FAILED:
            user.locked_until = _now() + timedelta(minutes=LOCK_MINUTES)
            user.failed_attempts = 0
        s.commit()


def create_user(payload: UserCreate) -> uuid.UUID:
    from pragmata.db.models import User

    uname = payload.username.strip().lower()
    if not uname:
        raise HTTPException(422, "username не может быть пустым")
    if len(payload.password) < 8:
        raise HTTPException(422, "пароль минимум 8 символов")
    role = payload.role if payload.role in ("user", "admin") else "user"
    with session_factory()() as s:
        exists = s.execute(select(User.id).where(User.username == uname)).first()
        if exists is not None:
            raise HTTPException(409, f"пользователь '{uname}' уже есть")
        user = User(
            username=uname,
            password_hash=hash_password(payload.password),
            role=role,
            full_name=payload.full_name,
            email=payload.email,
        )
        s.add(user)
        s.commit()
        return user.id


def list_users() -> list[UserOut]:
    from pragmata.api.schemas import UserOut
    from pragmata.db.models import User

    with session_factory()() as s:
        users = s.execute(select(User).order_by(User.created_at.desc())).scalars().all()
        return [
            UserOut(
                id=u.id,
                username=u.username,
                role=u.role,
                is_active=u.is_active,
                full_name=u.full_name,
                email=u.email,
                last_login_at=u.last_login_at,
                locked=u.locked_until is not None and u.locked_until > _now(),
            )
            for u in users
        ]


def patch_user(user_id: uuid.UUID, patch: UserPatch) -> None:
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
        demoting = patch.role is not None and patch.role != "admin"
        deactivating = patch.is_active is False
        if user.role == "admin" and (demoting or deactivating):
            others = s.execute(
                select(func.count())
                .select_from(User)
                .where(User.role == "admin", User.is_active.is_(True), User.id != user.id)
            ).scalar_one()
            if int(others) == 0:
                raise HTTPException(409, "нельзя убрать последнего администратора")
        if patch.role is not None:
            if patch.role not in ("user", "admin"):
                raise HTTPException(422, "role: user | admin")
            user.role = patch.role
        if patch.full_name is not None:
            user.full_name = patch.full_name
        if patch.is_active is not None:
            user.is_active = patch.is_active
            if patch.is_active:  # реактивация снимает блокировку
                user.failed_attempts = 0
                user.locked_until = None
        s.commit()


def change_password(user_id: uuid.UUID, new_password: str) -> None:
    from pragmata.db.models import User

    if len(new_password) < 8:
        raise HTTPException(422, "пароль минимум 8 символов")
    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
        user.password_hash = hash_password(new_password)
        user.failed_attempts = 0
        user.locked_until = None
        s.commit()


def count_users() -> int:
    from pragmata.db.models import User

    with session_factory()() as s:
        return int(s.execute(select(func.count()).select_from(User)).scalar_one())


# --- TOTP-2FA ---------------------------------------------------------------


def totp_status(user_id: uuid.UUID) -> bool:
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        return bool(user is not None and user.totp_enabled)


def setup_totp(user_id: uuid.UUID) -> tuple[str, str, str]:
    """Сгенерировать секрет (ещё НЕ активен) → (secret, otpauth_uri, qr_svg)."""
    from pragmata.core import totp
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
        if user.totp_enabled:
            raise HTTPException(409, "2FA уже включена — сначала отключите")
        secret = totp.new_secret()
        user.totp_secret = secret
        s.commit()
        uri = totp.provisioning_uri(secret, user.username)
    return secret, uri, totp.qr_svg_data_uri(uri)


def enable_totp(user_id: uuid.UUID, code: str) -> None:
    """Подтвердить код из приложения → включить 2FA."""
    from pragmata.core import totp
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
        if not user.totp_secret:
            raise HTTPException(400, "сначала /me/2fa/setup")
        if not totp.verify(user.totp_secret, code):
            raise HTTPException(401, "неверный код")
        user.totp_enabled = True
        s.commit()


def disable_totp(user_id: uuid.UUID, code: str) -> None:
    """Отключить 2FA (нужен действующий код — чтобы не снял чужой с угнанным токеном)."""
    from pragmata.core import totp
    from pragmata.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
        if not (user.totp_enabled and user.totp_secret and totp.verify(user.totp_secret, code)):
            raise HTTPException(401, "неверный код")
        user.totp_enabled = False
        user.totp_secret = None
        s.commit()
