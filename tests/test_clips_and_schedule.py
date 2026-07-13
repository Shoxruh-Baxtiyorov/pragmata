"""Чистая логика недели 2: выбор сегментов для клипа + окно рабочих часов."""

from __future__ import annotations

from soqchi.clips import pick_segments
from soqchi.config import WorkingHours
from soqchi.rules.engine import is_outside_hours

# --- клипы -------------------------------------------------------------------


def test_pick_segments_covers_window() -> None:
    names = list(range(1000, 1040, 2))  # сегменты по 2с: 1000,1002,...,1038
    got = pick_segments(names, t_start=1005.0, t_end=1013.0)
    # 1004 начинается до окна, но накрывает его начало; 1012 накрывает конец
    assert got == [1004, 1006, 1008, 1010, 1012]


def test_pick_segments_empty_ring() -> None:
    assert pick_segments([], 100.0, 130.0) == []


def test_pick_segments_window_in_future() -> None:
    names = [1000, 1002, 1004]
    assert pick_segments(names, 2000.0, 2030.0) == []


# --- рабочие часы --------------------------------------------------------------

TZ = "Asia/Tashkent"  # UTC+5
WH = WorkingHours(days=["mon", "tue", "wed", "thu", "fri", "sat"], open="08:00", close="18:00")

# 2026-07-13 — понедельник. 12:00 по Ташкенту = 07:00 UTC
MON_NOON_UTC = 1783926000.0  # 2026-07-13 07:00:00 UTC


def test_working_hours_inside() -> None:
    assert not is_outside_hours(MON_NOON_UTC, TZ, WH)


def test_after_close_is_outside() -> None:
    evening = MON_NOON_UTC + 8 * 3600  # 20:00 по Ташкенту
    assert is_outside_hours(evening, TZ, WH)


def test_sunday_is_outside() -> None:
    sunday_noon = MON_NOON_UTC - 24 * 3600  # вс 2026-07-12, 12:00 Ташкент
    assert is_outside_hours(sunday_noon, TZ, WH)


def test_open_boundary_inclusive_close_exclusive() -> None:
    eight_am = MON_NOON_UTC - 4 * 3600  # 08:00 Ташкент
    six_pm = MON_NOON_UTC + 6 * 3600  # 18:00 Ташкент
    assert not is_outside_hours(eight_am, TZ, WH)
    assert is_outside_hours(six_pm, TZ, WH)
