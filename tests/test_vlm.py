"""VLM-обвязка: парсер JSON из болтливых ответов + почасовой бюджет."""

from __future__ import annotations

from soqchi.vlm import HourBudget, extract_json


def test_extract_json_plain() -> None:
    assert extract_json('{"description": "два человека", "false_positive": false}') == {
        "description": "два человека",
        "false_positive": False,
    }


def test_extract_json_wrapped_in_prose_and_markdown() -> None:
    raw = 'Вот ответ:\n```json\n{"description": "пусто", "tags": [], "false_positive": true}\n```'
    got = extract_json(raw)
    assert got is not None and got["false_positive"] is True


def test_extract_json_garbage() -> None:
    assert extract_json("на кадрах никого нет") is None
    assert extract_json("вижу {сломанный json") is None


def test_hour_budget_sliding_window() -> None:
    b = HourBudget(2)
    assert b.allow(now=1000.0)
    assert b.allow(now=1010.0)
    assert not b.allow(now=1020.0)  # лимит 2/час исчерпан
    assert b.allow(now=1000.0 + 3601)  # окно уехало — снова можно
