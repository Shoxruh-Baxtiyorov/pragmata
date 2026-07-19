"""TOTP (Google Authenticator и совместимые) — второй фактор поверх пароля.

Секрет base32 хранится в users.totp_secret (Fernet-шифрованный столбец). QR
рендерим сервером (segno → SVG data-URI), чтобы фронту не тащить QR-библиотеку.
"""

from __future__ import annotations

import base64
import io

import pyotp
import segno

ISSUER = "Pragmata AI"
# ±1 окно (±30с) — терпимо к рассинхрону часов телефона, не шире (защита от подбора)
VALID_WINDOW = 1


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, username: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=username, issuer_name=ISSUER)


def qr_svg_data_uri(uri: str) -> str:
    out = io.BytesIO()
    segno.make(uri, error="m").save(out, kind="svg", scale=4, border=2)
    b64 = base64.b64encode(out.getvalue()).decode()
    return f"data:image/svg+xml;base64,{b64}"


def verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip().replace(" ", ""), valid_window=VALID_WINDOW)


# ponytail: in-memory анти-replay, однопроцессный API; при мультипроцессе — в БД
_last_used: dict[str, str] = {}


def verify_once(secret: str, code: str, key: str) -> bool:
    """verify + защита от повтора: один и тот же код дважды не проходит."""
    c = code.strip().replace(" ", "")
    if not verify(secret, c):
        return False
    if _last_used.get(key) == c:
        return False
    _last_used[key] = c
    return True
