"""TOTP-2FA: генерация секрета, проверка кода, provisioning URI, QR."""

from __future__ import annotations

import pyotp

from pragmata.core import totp


def test_new_secret_is_base32() -> None:
    s = totp.new_secret()
    assert len(s) >= 16
    # base32-алфавит
    assert set(s) <= set("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567")


def test_verify_accepts_current_code() -> None:
    secret = totp.new_secret()
    code = pyotp.TOTP(secret).now()
    assert totp.verify(secret, code) is True
    assert totp.verify(secret, code.replace("", " ").strip()) is True  # пробелы терпим


def test_verify_rejects_wrong_and_empty() -> None:
    secret = totp.new_secret()
    assert totp.verify(secret, "000000") is False
    assert totp.verify(secret, "") is False
    assert totp.verify("", "123456") is False


def test_provisioning_uri_and_qr() -> None:
    secret = totp.new_secret()
    uri = totp.provisioning_uri(secret, "guard1")
    assert uri.startswith("otpauth://totp/")
    assert "Pragmata%20AI" in uri or "Pragmata+AI" in uri or "Pragmata AI" in uri
    qr = totp.qr_svg_data_uri(uri)
    assert qr.startswith("data:image/svg+xml;base64,")
