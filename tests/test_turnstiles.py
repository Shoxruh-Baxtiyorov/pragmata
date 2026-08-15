"""Турникеты: коннекторы, гейт по фиче подписки, валидация, severity."""

from __future__ import annotations

import uuid

import pytest
from fastapi import HTTPException

from pragmata.analytics.entitlements import FULL, Entitlements
from pragmata.api.routers import turnstiles
from pragmata.rules.engine import SEVERITY
from pragmata.turnstile import NullConnector, RelayConnector, make_connector


def _ent(features: set[str]) -> Entitlements:
    return Entitlements(
        modules=frozenset(),
        features=frozenset(features),
        person_categories=frozenset(),
    )


# --- коннекторы -------------------------------------------------------------


def test_null_connector_open_true() -> None:
    assert NullConnector({}).open("test") is True


def test_make_connector_selects_type() -> None:
    assert isinstance(make_connector("relay", {"url": "http://x"}), RelayConnector)
    assert isinstance(make_connector("null", {}), NullConnector)
    assert isinstance(make_connector("unknown", {}), NullConnector)  # дефолт — null


def test_relay_open_without_url_is_false() -> None:
    # нет url в config → команда не отправляется, но и не падает
    assert RelayConnector({}).open("test") is False


# --- гейт по фиче подписки --------------------------------------------------


def test_gate_denied_without_feature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(turnstiles, "resolve", lambda scope: _ent(set()))
    with pytest.raises(HTTPException) as e:
        turnstiles.require_turnstile(scope=5)
    assert e.value.status_code == 403


def test_gate_allowed_with_feature(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(turnstiles, "resolve", lambda scope: _ent({"turnstile"}))
    assert turnstiles.require_turnstile(scope=5) == 5


def test_gate_admin_full_access(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(turnstiles, "resolve", lambda scope: FULL)
    assert turnstiles.require_turnstile(scope=None) is None


# --- валидация приёма события доступа --------------------------------------


def test_ingest_rejects_bad_kind() -> None:
    from pragmata.api.schemas import AccessEventIn
    from pragmata.services import turnstile_service as svc

    with pytest.raises(HTTPException) as e:
        svc.ingest_access(uuid.uuid4(), AccessEventIn(kind="bogus"), scope=1)
    assert e.value.status_code == 422


# --- severity типов турникета известны движку ------------------------------


def test_turnstile_event_types_have_severity() -> None:
    assert SEVERITY["turnstile_open"] == "info"
    assert SEVERITY["turnstile_denied"] == "warning"
    assert SEVERITY["turnstile_tailgate"] == "alert"
