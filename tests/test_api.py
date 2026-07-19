"""Dashboard API: аутентификация fail-closed + защита эндпоинтов (без БД)."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("APP_ENV", "test")


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    from soqchi.config import get_settings

    monkeypatch.setenv("SECRET_KEY", "test-secret-key-for-api-tests-0123456789")
    monkeypatch.setenv("ADMIN_PASSWORD", "correct-horse")
    get_settings.cache_clear()
    from soqchi.api.app import app

    yield TestClient(app)
    get_settings.cache_clear()


def test_login_wrong_password(client: TestClient) -> None:
    assert client.post("/api/v1/auth/login", json={"password": "nope"}).status_code == 401


def test_login_lockout_after_5_failures(client: TestClient) -> None:
    from soqchi.api.routers.auth import _throttle

    _throttle.reset("testclient")  # TestClient использует host "testclient"
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json={"password": "x"}).status_code == 401
    # 6-я попытка — блок, даже с ВЕРНЫМ паролем
    assert client.post("/api/v1/auth/login", json={"password": "correct-horse"}).status_code == 429
    _throttle.reset("testclient")


def test_security_headers_present(client: TestClient) -> None:
    r = client.get("/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_login_and_me(client: TestClient) -> None:
    body = client.post("/api/v1/auth/login", json={"password": "correct-horse"}).json()
    assert body["role"] == "admin" and body["username"] == "admin"  # break-glass admin
    r = client.get("/api/v1/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert r.status_code == 200
    assert r.json()["sub"] == "admin" and r.json()["role"] == "admin"


def test_users_endpoint_requires_auth(client: TestClient) -> None:
    # без токена — 401; admin-гейт проверяется на живой БД (см. ручную проверку)
    assert client.get("/api/v1/users").status_code == 401


def test_protected_without_token(client: TestClient) -> None:
    assert client.get("/api/v1/me").status_code == 401
    assert client.get("/api/v1/events").status_code == 401


def test_garbage_token_rejected(client: TestClient) -> None:
    r = client.get("/api/v1/me", headers={"Authorization": "Bearer garbage"})
    assert r.status_code == 401


def test_login_fail_closed_without_config(monkeypatch: pytest.MonkeyPatch) -> None:
    from soqchi.config import get_settings

    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    get_settings.cache_clear()
    # .env юзера может задавать значения — форсим пустые
    monkeypatch.setenv("ADMIN_PASSWORD", "")
    monkeypatch.setenv("SECRET_KEY", "")
    get_settings.cache_clear()
    from soqchi.api.app import app

    c = TestClient(app)
    assert c.post("/api/v1/auth/login", json={"password": "x"}).status_code == 503
    assert c.get("/api/v1/me", headers={"Authorization": "Bearer x"}).status_code == 503
    get_settings.cache_clear()
