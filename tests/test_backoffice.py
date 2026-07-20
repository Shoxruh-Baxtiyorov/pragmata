"""Гейт бэкофиса: role=admin + allowlist BACKOFFICE_USERS (по логике Iqbola)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from pragmata.api import security
from pragmata.api.security import Principal, require_backoffice
from pragmata.config import Settings


def test_backoffice_usernames_parsing() -> None:
    # регистр не важен, пробелы и пустые элементы отбрасываются
    s = Settings(backoffice_users="Admin, security_head ,")
    assert s.backoffice_usernames == {"admin", "security_head"}
    # пустая строка → пустой allowlist (secure default: бэкофис закрыт для всех)
    assert Settings(backoffice_users="").backoffice_usernames == set()


def _patch_allow(monkeypatch: pytest.MonkeyPatch, names: set[str]) -> None:
    class _S:
        backoffice_usernames = names

    monkeypatch.setattr(security, "get_settings", lambda: _S())


def test_admin_in_allowlist_passes(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_allow(monkeypatch, {"admin"})
    p = Principal(sub="1", role="admin", username="admin")
    assert require_backoffice(p) is p


def test_admin_not_in_allowlist_denied(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_allow(monkeypatch, {"admin"})
    p = Principal(sub="2", role="admin", username="bob")
    with pytest.raises(HTTPException) as e:
        require_backoffice(p)
    assert e.value.status_code == 403


def test_empty_allowlist_denies_everyone(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_allow(monkeypatch, set())
    p = Principal(sub="3", role="admin", username="admin")
    with pytest.raises(HTTPException) as e:
        require_backoffice(p)
    assert e.value.status_code == 403


def test_non_admin_denied_even_if_named(monkeypatch: pytest.MonkeyPatch) -> None:
    # роль важнее allowlist: обычный юзер с именем из списка всё равно не пройдёт
    _patch_allow(monkeypatch, {"admin"})
    p = Principal(sub="4", role="user", username="admin")
    with pytest.raises(HTTPException) as e:
        require_backoffice(p)
    assert e.value.status_code == 403
