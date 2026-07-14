"""Контракт инструментов агента: схемы валидны, имена совпадают с реализациями."""

from __future__ import annotations

import json

from soqchi.agent.tools import TOOL_SPECS, AgentTools


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
