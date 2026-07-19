"""Хеширование паролей — argon2id (стандарт iqbola-backend).

Единая точка: сервисы не трогают argon2 напрямую. verify возвращает и флаг
«нужно перехешировать» (параметры устарели) — чтобы молча апгрейдить хеши.
"""

from __future__ import annotations

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

# дефолты argon2-cffi разумны (m=64MiB, t=3, p=4); держим один инстанс на процесс
_ph = PasswordHasher()


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(hashed: str, plain: str) -> bool:
    try:
        _ph.verify(hashed, plain)
    except (VerifyMismatchError, InvalidHashError):
        return False
    return True


def needs_rehash(hashed: str) -> bool:
    try:
        return _ph.check_needs_rehash(hashed)
    except InvalidHashError:
        return True
