"""LLM-цикл агента поверх типизированных инструментов (любой OpenAI-совместимый API).

Ollama локально (бесплатно, офлайн — важный режим для госсектора) или OpenRouter
в облаке — выбирается env'ами LLM_BASE_URL / LLM_API_KEY / LLM_MODEL без правок кода.
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
Сейчас {now} ({tz}). Отвечай кратко, НА ЯЗЫКЕ ВОПРОСА (узбекский или русский).
Правила:
1. Факты — ТОЛЬКО из инструментов. Не выдумывай события, числа и время.
2. Вопрос «сколько/были ли» → вызывай stats и отвечай ЦИФРАМИ из него
   (alerts = тревоги). Списки событий перечисляй только если попросили список.
3. Вопрос про тревоги списком → search_events с severity=alert.
4. Поиск человека по внешности → find_person, description по-английски.
   Пустой результат find_person = такого человека НЕ БЫЛО — так и ответь,
   не подставляй других людей.
5. Времена в результатах уже локальные — показывай как есть."""


class AgentRunner:
    def __init__(
        self, base_url: str, api_key: str, model: str, tools: AgentTools, cfg: SiteConfig
    ):
        from openai import OpenAI

        self.client = OpenAI(base_url=base_url, api_key=api_key)
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
                if tc.function.name == "find_person":  # фото только из поиска людей
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
