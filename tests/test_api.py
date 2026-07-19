"""Dashboard API: аутентификация fail-closed + защита эндпоинтов (без БД).

user_service/security мокаются monkeypatch'ем — фаст-тесты не трогают Postgres.
"""

from __future__ import annotations

import os
import uuid
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("APP_ENV", "test")

_UID = uuid.uuid4()


def _fake_user(**over: Any) -> SimpleNamespace:
    base = {
        "id": _UID,
        "role": "admin",
        "username": "admin",
        "totp_enabled": False,
        "totp_secret": None,
    }
    base.update(over)
    return SimpleNamespace(**base)


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    from soqchi.config import get_settings

    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-api-tests-0123456789")
    get_settings.cache_clear()
    from soqchi.api.app import app

    yield TestClient(app)
    get_settings.cache_clear()


@pytest.fixture()
def _throttle_clean() -> Any:
    from soqchi.api.routers.auth import _throttle

    _throttle.reset("testclient")  # TestClient использует host "testclient"
    yield _throttle
    _throttle.reset("testclient")


def _patch_auth_ok(monkeypatch: pytest.MonkeyPatch, user: SimpleNamespace) -> None:
    from soqchi.api import security
    from soqchi.services import user_service

    monkeypatch.setattr(user_service, "authenticate", lambda u, p: user)
    monkeypatch.setattr(user_service, "mark_login", lambda uid: None)
    monkeypatch.setattr(
        security,
        "_load_principal",
        lambda sub: security.Principal(sub=sub, role=user.role, username=user.username),
    )


def test_login_wrong_password(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, _throttle_clean: Any
) -> None:
    from soqchi.services import user_service

    def _deny(u: str, p: str) -> SimpleNamespace:
        raise HTTPException(401, "неверный логин или пароль")

    monkeypatch.setattr(user_service, "authenticate", _deny)
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "nope"})
    assert r.status_code == 401


def test_login_empty_username_rejected(client: TestClient, _throttle_clean: Any) -> None:
    # break-glass входа по одному паролю больше нет
    assert client.post("/api/v1/auth/login", json={"password": "whatever"}).status_code == 401


def test_login_lockout_after_5_failures(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, _throttle_clean: Any
) -> None:
    from soqchi.services import user_service

    def _deny(u: str, p: str) -> SimpleNamespace:
        raise HTTPException(401, "неверный логин или пароль")

    monkeypatch.setattr(user_service, "authenticate", _deny)
    for _ in range(5):
        r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "x"})
        assert r.status_code == 401
    # 6-я попытка — блок по IP ещё до проверки пароля
    r = client.post("/api/v1/auth/login", json={"username": "admin", "password": "x"})
    assert r.status_code == 429


def test_login_and_me(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, _throttle_clean: Any
) -> None:
    _patch_auth_ok(monkeypatch, _fake_user())
    body = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "correct-horse"}
    ).json()
    assert body["role"] == "admin" and body["username"] == "admin"
    r = client.get("/api/v1/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert r.status_code == 200
    assert r.json()["sub"] == str(_UID) and r.json()["role"] == "admin"


def test_mfa_required_step_keeps_throttle(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, _throttle_clean: Any
) -> None:
    """Пароль верный + 2FA включена, кода нет → mfa_required, токен пустой,
    накопленные IP-фейлы НЕ сбрасываются (аудит: brute-force кода)."""
    _patch_auth_ok(monkeypatch, _fake_user(totp_enabled=True, totp_secret="S"))
    _throttle_clean.record_failure("testclient")
    _throttle_clean.record_failure("testclient")
    body = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "ok"}
    ).json()
    assert body["mfa_required"] is True and body["access_token"] == ""
    # счётчик не обнулился: ещё 3 фейла → блок (5 всего)
    for _ in range(3):
        _throttle_clean.record_failure("testclient")
    assert _throttle_clean.locked_for("testclient") > 0


def test_totp_wrong_code_hits_account_lockout(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, _throttle_clean: Any
) -> None:
    from soqchi.core import totp
    from soqchi.services import user_service

    _patch_auth_ok(monkeypatch, _fake_user(totp_enabled=True, totp_secret="S"))
    monkeypatch.setattr(totp, "verify_once", lambda s, c, k: False)
    hits: list[uuid.UUID] = []
    monkeypatch.setattr(user_service, "record_totp_failure", hits.append)
    r = client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": "ok", "code": "000000"}
    )
    assert r.status_code == 401
    assert hits == [_UID]  # неверный код бьёт по per-account lockout


def test_security_headers_present(client: TestClient) -> None:
    r = client.get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_users_endpoint_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/users").status_code == 401


def test_protected_without_token(client: TestClient) -> None:
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/events").status_code == 401


def test_garbage_token_rejected(client: TestClient) -> None:
    r = client.get("/api/v1/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_login_fail_closed_without_config(monkeypatch: pytest.MonkeyPatch) -> None:
    from soqchi.config import get_settings

    # .env юзера может задавать значения — форсим пустые
    monkeypatch.setenv("SECRET_KEY", "")
    get_settings.cache_clear()
    from soqchi.api.app import app

    c = TestClient(app)
    r = c.post("/api/v1/auth/login", json={"username": "admin", "password": "x"})
    assert r.status_code == 503
    assert c.get("/api/v1/me", headers={"Authorization": "Bearer x"}).status_code == 503
    get_settings.cache_clear()
