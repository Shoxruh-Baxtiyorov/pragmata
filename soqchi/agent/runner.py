"""LLM-цикл агента поверх типизированных инструментов (OpenRouter, OpenAI-совместимый).

Паттерн Iqbola: free-модели на dev, переключение через env (OPENROUTER_MODEL).
Фото из результатов инструментов собираются отдельно и уходят в Telegram альбомом.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

from soqchi.agent.tools import TOOL_SPECS

if TYPE_CHECKING:
    from soqchi.agent.tools import AgentTools
    from soqchi.config import SiteConfig

log = logging.getLogger("soqchi.agent")

MAX_TOOL_ROUNDS = 5

SYSTEM_PROMPT = """Ты — Soqchi AI, ассистент видеонаблюдения объекта «{site}».
Сейчас {now} ({tz}). Отвечай кратко и по делу, НА ЯЗЫКЕ ВОПРОСА (узбекский или русский).
Факты бери ТОЛЬКО из инструментов — не выдумывай события и время.
Для поиска человека по внешности вызывай find_person с английским описанием.
Времена в ответе — уже локальные, показывай как есть."""


class AgentRunner:
    def __init__(self, api_key: str, model: str, tools: AgentTools, cfg: SiteConfig):
        from openai import OpenAI

        self.client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=api_key)
        self.model = model
        self.tools = tools
        self.cfg = cfg
        # короткая память диалога per chat_id
        self._history: dict[int, list[dict[str, Any]]] = {}

    def answer(self, chat_id: int, question: str) -> tuple[str, list[str]]:
        """→ (текст ответа, пути к фото из инструментов). Вызывать из thread'а."""
        tz = self.cfg.site.timezone
        system = SYSTEM_PROMPT.format(
            site=self.cfg.site.name,
            now=datetime.now(ZoneInfo(tz)).strftime("%d.%m.%Y %H:%M"),
            tz=tz,
        )
        history = self._history.setdefault(chat_id, [])
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": question},
        ]
        photos: list[str] = []

        for _ in range(MAX_TOOL_ROUNDS):
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=messages,  # type: ignore[arg-type]
                tools=TOOL_SPECS,  # type: ignore[arg-type]
                temperature=0.2,
            )
            msg = resp.choices[0].message
            if not msg.tool_calls:
                text = msg.content or "…"
                history.extend(
                    [{"role": "user", "content": question}, {"role": "assistant", "content": text}]
                )
                del history[:-6]  # держим последние 3 обмена
                return text, photos

            messages.append(
                {
                    "role": "assistant",
                    "content": msg.content,
                    "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
                }
            )
            for tc in msg.tool_calls:
                if tc.type != "function":
                    continue
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                log.info("agent tool %s(%s)", tc.function.name, args)
                result = self.tools.call(tc.function.name, args)
                photos.extend(
                    item["photo"]
                    for item in (result if isinstance(result, list) else [])
                    if isinstance(item, dict) and item.get("photo")
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    }
                )
        return "Не уложился в лимит шагов — уточни вопрос.", photos
