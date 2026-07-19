"""argon2id-хеширование паролей: roundtrip, мисматч, признак перехеша."""

from __future__ import annotations

from soqchi.core.passwords import hash_password, needs_rehash, verify_password


def test_hash_verify_roundtrip() -> None:
    h = hash_password("Guard12345")
    assert h != "Guard12345"  # не plaintext
    assert h.startswith("$argon2id$")
    assert verify_password(h, "Guard12345") is True


def test_verify_rejects_wrong_password() -> None:
    h = hash_password("Guard12345")
    assert verify_password(h, "guard12345") is False
    assert verify_password(h, "") is False


def test_verify_handles_garbage_hash() -> None:
    assert verify_password("not-a-hash", "whatever") is False


def test_needs_rehash_false_for_fresh_hash() -> None:
    assert needs_rehash(hash_password("Guard12345")) is False
    assert needs_rehash("not-a-hash") is True
