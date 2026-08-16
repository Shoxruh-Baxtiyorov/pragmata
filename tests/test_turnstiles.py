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


# --- авто-открытие по лицу: чистое решение доступа --------------------------


def test_face_open_allows_valid() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    assert (
        evaluate_face_open("Aziz", "employee", 0.9, True, 0.55, True, [])
        is None  # пропускаем
    )


def test_face_open_denies_without_liveness() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    # фото с телефона: похоже, но живости нет → anti-spoof отказ
    assert evaluate_face_open("Aziz", "employee", 0.99, False, 0.55, True, []) == "no_liveness"


def test_face_open_denies_low_confidence() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    assert evaluate_face_open("Aziz", "employee", 0.4, True, 0.55, True, []) == "low_confidence"


def test_face_open_denies_banned_even_in_allowlist() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    assert evaluate_face_open("X", "banned", 0.9, True, 0.55, True, ["banned"]) == "banned"


def test_face_open_denies_outside_allowlist() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    reason = evaluate_face_open("Guest", "visitor", 0.9, True, 0.55, True, ["employee"])
    assert reason == "not_allowed"


def test_face_open_denies_unknown_person() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    assert evaluate_face_open(None, None, 0.9, True, 0.55, True, []) == "unknown"


def test_face_open_liveness_optional_when_policy_off() -> None:
    from pragmata.services.turnstile_service import evaluate_face_open

    # require_liveness=False → живость не требуется
    assert evaluate_face_open("Aziz", "employee", 0.9, False, 0.55, False, []) is None


def test_face_policy_parses_config_and_defaults() -> None:
    from pragmata.services.turnstile_service import _face_policy

    assert _face_policy({}) == (0.55, True, [])
    assert _face_policy(
        {"min_similarity": 0.7, "require_liveness": False, "allow_categories": ["employee"]}
    ) == (0.7, False, ["employee"])
    # мусор в min_similarity → дефолт, не падаем
    assert _face_policy({"min_similarity": "x"})[0] == 0.55
