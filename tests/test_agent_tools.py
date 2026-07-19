"""Контракт инструментов агента: схемы валидны, имена совпадают с реализациями."""

from __future__ import annotations

import json

from pragmata.agent.tools import TOOL_SPECS, AgentTools


def test_tool_specs_are_valid_json() -> None:
    dumped = json.dumps(TOOL_SPECS)
    assert json.loads(dumped) == TOOL_SPECS


def test_tool_names_unique_and_implemented() -> None:
    names = [t["function"]["name"] for t in TOOL_SPECS]
    assert len(names) == len(set(names))
    for name in names:
        assert callable(getattr(AgentTools, name, None)), f"нет реализации {name}"


def test_unknown_tool_returns_error_not_crash() -> None:
    tools = AgentTools.__new__(AgentTools)  # без БД: проверяем только диспетчер
    assert tools.call("rm_rf_slash", {})["error"].startswith("unknown tool")


def test_parse_inline_tool_call() -> None:
    from pragmata.agent.runner import parse_inline_tool_call

    # локальная модель пишет вызов сырым JSON'ом в текст (баг qwen на узбекском вопросе)
    assert parse_inline_tool_call('ronics\n{"name": "stats", "arguments": {"hours": 24}}') == (
        "stats",
        {"hours": 24},
    )
    assert parse_inline_tool_call('{"name": "camera_status"}') == ("camera_status", {})
    assert parse_inline_tool_call("Обычный ответ без JSON") is None
    assert parse_inline_tool_call('в зоне было {"people": 2} человека') is None  # не tool-call
