"""after_hours: камера переопределяет расписание организации (гибрид).

Дефолт — часы организации; на камере можно задать своё расписание (custom)
или круглосуточный режим (always → тревог «вне часов» нет)."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from pragmata.config import WorkingHours
from pragmata.rules.engine import _parse_days, effective_working_hours
from pragmata.services.config_service import _validate_working_hours

ORG = WorkingHours(days=["mon", "tue", "wed", "thu", "fri"], open="09:00", close="18:00")


def test_no_override_inherits_org() -> None:
    assert effective_working_hours(None, ORG) == ORG
    assert effective_working_hours({}, ORG) == ORG
    assert effective_working_hours({"enabled": False, "mode": "always"}, ORG) == ORG


def test_always_mode_disables_after_hours() -> None:
    # круглосуточная камера (парковка) — «вне часов» не существует
    assert effective_working_hours({"enabled": True, "mode": "always"}, ORG) is None


def test_custom_override_wins_over_org() -> None:
    eff = effective_working_hours(
        {
            "enabled": True,
            "mode": "custom",
            "days": "mon,tue,wed,thu,fri,sat",
            "open": "08:00",
            "close": "20:00",
        },
        ORG,
    )
    assert eff is not None
    assert eff.days == ["mon", "tue", "wed", "thu", "fri", "sat"]
    assert (eff.open, eff.close) == ("08:00", "20:00")


def test_custom_falls_back_to_org_for_missing_fields() -> None:
    # частичное переопределение: не указали часы → берём из организации
    eff = effective_working_hours({"enabled": True, "mode": "custom", "days": ""}, ORG)
    assert eff is not None
    assert eff.days == ORG.days  # пустые дни → дни организации
    assert (eff.open, eff.close) == (ORG.open, ORG.close)


def test_custom_without_org_default_uses_builtin() -> None:
    eff = effective_working_hours({"enabled": True, "mode": "custom", "open": "07:00"}, None)
    assert eff is not None
    assert eff.open == "07:00"
    assert eff.close == "18:00"  # дефолт WorkingHours


def test_parse_days_forms() -> None:
    assert _parse_days("mon,tue,wed") == ["mon", "tue", "wed"]
    assert _parse_days("mon-fri") == ["mon", "tue", "wed", "thu", "fri"]  # диапазон
    assert _parse_days("sat-sun") == ["sat", "sun"]
    assert _parse_days("MON, Tue , sunday") == ["mon", "tue", "sun"]
    assert _parse_days("") == []
    assert _parse_days("garbage,xyz") == []  # мусор игнорируем


def test_validate_working_hours_accepts_good() -> None:
    _validate_working_hours({"days": ["mon", "tue"], "open": "09:00", "close": "18:00"})


def test_validate_working_hours_rejects_bad() -> None:
    with pytest.raises(HTTPException) as e:
        _validate_working_hours({"days": 5, "open": "09:00", "close": "18:00"})
    assert e.value.status_code == 422
