"""Fail-closed поведение шифрования + round-trip (в тестах APP_ENV=test → dev-ключ)."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("APP_ENV", "test")

from pragmata.core.encryption import decrypt_str, encrypt_str  # noqa: E402
from pragmata.core.redact import redact_url  # noqa: E402


def test_roundtrip() -> None:
    url = "rtsp://admin:S3cret!@192.168.1.64:554/Streaming/Channels/101"
    token = encrypt_str(url)
    assert token != url
    assert token.startswith("gAAAA")  # маркер Fernet — в базе лежит ciphertext
    assert decrypt_str(token) == url


def test_decrypt_garbage_raises() -> None:
    with pytest.raises(ValueError):
        decrypt_str("rtsp://plaintext-left-in-db")


def test_redact_url_masks_password() -> None:
    assert (
        redact_url("rtsp://admin:S3cret!@10.0.0.5:554/ch1") == "rtsp://admin:***@10.0.0.5:554/ch1"
    )


def test_redact_url_no_creds_untouched() -> None:
    assert redact_url("rtsp://10.0.0.5:554/ch1") == "rtsp://10.0.0.5:554/ch1"
    assert redact_url("http://192.168.1.50:8080/video") == "http://192.168.1.50:8080/video"
