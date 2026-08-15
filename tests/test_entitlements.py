"""Права подписки: разбор Plan.entitlements + флаг entitled в каталоге."""

from __future__ import annotations

from pragmata.analytics import catalog
from pragmata.analytics.entitlements import (
    ALL_FEATURE_KEYS,
    ALL_MODULE_KEYS,
    PERSON_CATEGORIES,
    from_plan,
)


def test_empty_plan_is_full_access() -> None:
    e = from_plan({})
    assert e.all_access
    assert e.modules == ALL_MODULE_KEYS
    assert e.features == ALL_FEATURE_KEYS
    assert e.person_categories == PERSON_CATEGORIES


def test_none_plan_is_full_access() -> None:
    assert from_plan(None).all_access


def test_restricted_axes_and_bogus_dropped() -> None:
    e = from_plan(
        {"modules": ["lpr", "vehicle", "bogus"], "features": [], "person_categories": []}
    )
    assert e.modules == frozenset({"lpr", "vehicle"})  # несуществующий ключ отброшен
    assert e.features == frozenset()
    assert e.person_categories == frozenset()
    assert not e.all_access


def test_absent_axis_is_unrestricted() -> None:
    # в непустом плане отсутствие оси = она не ограничена
    e = from_plan({"modules": ["lpr"]})
    assert e.modules == frozenset({"lpr"})
    assert e.features == ALL_FEATURE_KEYS
    assert e.person_categories == PERSON_CATEGORIES


def test_wildcard_axis() -> None:
    e = from_plan({"modules": ["*"], "features": ["assistant"]})
    assert e.modules == ALL_MODULE_KEYS
    assert e.features == frozenset({"assistant"})


def test_school_package_excludes_guest() -> None:
    e = from_plan(
        {"person_categories": ["employee", "contractor", "watchlist", "banned", "other"]}
    )
    assert "visitor" not in e.person_categories
    assert "employee" in e.person_categories


def test_limits_parsed_and_bad_skipped() -> None:
    e = from_plan({"limits": {"cameras": "20", "bad": "x"}})
    assert e.limits == {"cameras": 20}


def test_catalog_marks_entitled() -> None:
    cat = catalog(frozenset({"lpr"}))
    by = {m["key"]: m for m in cat["modules"]}  # type: ignore[union-attr]
    assert by["lpr"]["entitled"] is True
    assert by["zone_intrusion"]["entitled"] is False


def test_catalog_none_means_all_entitled() -> None:
    cat = catalog(None)
    assert all(m["entitled"] for m in cat["modules"])  # type: ignore[union-attr]
