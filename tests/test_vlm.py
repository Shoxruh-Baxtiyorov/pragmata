"""VLM-обвязка: парсер JSON из болтливых ответов + почасовой бюджет + оружие."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import numpy as np

from pragmata.vlm import HourBudget, VlmDescriber, extract_json


def _describer_with_reply(reply: str) -> VlmDescriber:
    d = object.__new__(VlmDescriber)
    d.model = "fake"

    def create(**_: Any) -> Any:
        msg = SimpleNamespace(content=reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)])

    d.client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    return d


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


def test_check_weapon_positive() -> None:
    d = _describer_with_reply('{"weapon": true, "type": "нож"}')
    found, kind = d.check_weapon([np.zeros((8, 8, 3), dtype=np.uint8)])
    assert found is True
    assert kind == "нож"


def test_check_weapon_negative_and_garbage() -> None:
    d = _describer_with_reply('{"weapon": false, "type": ""}')
    assert d.check_weapon([np.zeros((8, 8, 3), dtype=np.uint8)]) == (False, "")
    d2 = _describer_with_reply("никакого оружия не вижу")
    assert d2.check_weapon([np.zeros((8, 8, 3), dtype=np.uint8)]) == (False, "")


def test_weapon_sink_only_fires_on_person_entered() -> None:
    from pragmata.alerts import WeaponSink
    from pragmata.rules.engine import RuleEvent

    seen: list[tuple[str, int]] = []
    worker = SimpleNamespace(enqueue=lambda cam, frames: seen.append((cam, len(frames))))
    sink = WeaponSink(worker)  # type: ignore[arg-type]

    frame = np.zeros((8, 8, 3), dtype=np.uint8)
    track = SimpleNamespace(best_frame=frame)
    sink.emit_event(RuleEvent("person_entered", "cam1", 1.0, 2.0, track=track, frame=frame))
    sink.emit_event(RuleEvent("zone_intrusion", "cam1", 1.0, 2.0, track=track, frame=frame))
    sink.emit_event(RuleEvent("person_entered", "cam1", 1.0, 2.0))  # нет трека → пропуск

    assert seen == [("cam1", 1)]
