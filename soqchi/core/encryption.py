"""Шифрование чувствительных полей на уровне колонок (паттерн iqbola-backend).

``EncryptedString`` — SQLAlchemy ``TypeDecorator``: Fernet (AES-128-CBC +
HMAC-SHA256) на запись, расшифровка на чтение. Ciphertext ~100+ байт —
колонку держим TEXT.

Ключ — ``ENCRYPTION_KEY`` (base64-urlsafe, 32 байта). В ``APP_ENV=test``
(или ``TESTING=1``) падаем на детерминированный dev-ключ, чтобы тесты шли
без конфигурации. В любом другом окружении отсутствие ключа — громкая
ошибка при первом использовании: тихо отключившееся шифрование хуже падения.

Потеря ENCRYPTION_KEY = потеря всех зашифрованных значений (см. инцидент
Iqbola 2026-07) — бэкапить как любой секрет.
"""

from __future__ import annotations

import base64
import os
from functools import lru_cache
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import String, TypeDecorator


def _is_test_env() -> bool:
    return os.environ.get("APP_ENV") == "test" or os.environ.get("TESTING") == "1"


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    from soqchi.config import get_settings

    key = (get_settings().encryption_key or "").strip()
    if not key:
        if _is_test_env():
            key = base64.urlsafe_b64encode(b"\x00" * 32).decode()
        else:
            raise RuntimeError(
                "ENCRYPTION_KEY is unset. Generate one with "
                '`uv run python -c "from cryptography.fernet import Fernet; '
                'print(Fernet.generate_key().decode())"` and put it in .env.'
            )
    return Fernet(key.encode("utf-8"))


def encrypt_str(value: str) -> str:
    return _fernet().encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_str(value: str) -> str:
    try:
        return _fernet().decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken as err:
        raise ValueError("Could not decrypt value (wrong key or corrupted data)") from err


class EncryptedString(TypeDecorator[str]):
    """Прозрачное шифрование строковой колонки (bind → ciphertext, result → plaintext)."""

    impl = String
    cache_ok = True

    def __init__(self, length: int = 512, **kwargs: Any) -> None:
        super().__init__(length=length, **kwargs)

    def process_bind_param(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            value = str(value)
        return encrypt_str(value)

    def process_result_value(self, value: Any, dialect: Any) -> str | None:
        if value is None:
            return None
        text = str(value)
        if text == "":
            return ""
        return decrypt_str(text)
