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

from soqchi.api.deps import session_factory
from soqchi.core.passwords import hash_password, needs_rehash, verify_password

if TYPE_CHECKING:
    from soqchi.api.schemas import UserCreate, UserOut, UserPatch
    from soqchi.db.models import User

MAX_FAILED = 5  # столько промахов подряд → блокировка аккаунта
LOCK_MINUTES = 15
# фиктивный argon2-хеш «нет такого юзера» — verify всё равно тратит время (анти-enum)
_DUMMY_HASH = hash_password("soqchi-nonexistent-account-timing-guard")


def _now() -> datetime:
    return datetime.now(UTC)


def authenticate(username: str, password: str) -> User:
    from soqchi.db.models import User

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

        # успех: сбрасываем счётчики, обновляем хеш при устаревших параметрах
        user.failed_attempts = 0
        user.locked_until = None
        user.last_login_at = _now()
        if needs_rehash(user.password_hash):
            user.password_hash = hash_password(password)
        s.commit()
        s.refresh(user)
        s.expunge(user)
        return user


def create_user(payload: UserCreate) -> uuid.UUID:
    from soqchi.db.models import User

    uname = payload.username.strip().lower()
    if not uname:
        raise HTTPException(422, "username не может быть пустым")
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
    from soqchi.api.schemas import UserOut
    from soqchi.db.models import User

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
    from soqchi.db.models import User

    with session_factory()() as s:
        user = s.get(User, user_id)
        if user is None:
            raise HTTPException(404, "нет такого пользователя")
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
    from soqchi.db.models import User

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
    from soqchi.db.models import User

    with session_factory()() as s:
        return int(s.execute(select(func.count()).select_from(User)).scalar_one())
