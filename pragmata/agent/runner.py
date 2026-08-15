"""LLM-цикл агента поверх типизированных инструментов (любой OpenAI-совместимый API).

Ollama локально (бесплатно, офлайн — важный режим для госсектора) или OpenRouter
в облаке — выбирается env'ами LLM_BASE_URL / LLM_API_KEY / LLM_MODEL без правок кода.
Фото из результатов инструментов собираются отдельно и уходят в Telegram альбомом.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime
from typing import TYPE_CHECKING, Any, Literal
from zoneinfo import ZoneInfo

from pragmata.agent.tools import TOOL_SPECS

if TYPE_CHECKING:
    from pragmata.agent.tools import AgentTools
    from pragmata.config import SiteConfig

log = logging.getLogger("pragmata.agent")

MAX_TOOL_ROUNDS = 5


TOOL_NAMES = {
    "search_events",
    "stats",
    "find_person",
    "classify_people",
    "camera_status",
    "add_alert_zone",
    "set_working_hours",
}
# псевдокод локальных моделей: stats(hours=24) / printStats(hours=1)["..."]
_PSEUDO_CALL = re.compile(r"\b(\w+)\s*\(([^()]*)\)")
_KWARG = re.compile(r"(\w+)\s*=\s*(\"[^\"]*\"|'[^']*'|[\w.\-]+)")


def _coerce(v: str) -> Any:
    v = v.strip().strip("\"'")
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    try:
        return int(v)
    except ValueError:
        try:
            return float(v)
        except ValueError:
            return v


def parse_inline_tool_call(text: str) -> tuple[str, dict[str, Any]] | None:
    """Локальные модели пишут tool-call текстом. Ловим два формата.

    JSON: `{"name": "...", "arguments": {...}}`.
    Псевдокод: `stats(hours=24)`, `printStats(hours=1)[...]` — извлекаем имя+kwargs.
    """
    start = text.find("{")
    while start != -1:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    try:
                        obj = json.loads(text[start : i + 1])
                    except json.JSONDecodeError:
                        break
                    if isinstance(obj, dict) and isinstance(obj.get("name"), str):
                        args = obj.get("arguments") or obj.get("parameters") or {}
                        return obj["name"], args if isinstance(args, dict) else {}
                    break
        start = text.find("{", start + 1)

    for m in _PSEUDO_CALL.finditer(text):
        raw = m.group(1)
        name = raw.lower()
        if name.startswith("print"):
            name = name[5:]
        if name in TOOL_NAMES:
            args = {k: _coerce(v) for k, v in _KWARG.findall(m.group(2))}
            return name, args
    return None


SYSTEM_PROMPT = """Ты — Pragmata AI, ассистент видеонаблюдения объекта «{site}».
Сейчас {now} ({tz}). Отвечай кратко, НА ЯЗЫКЕ ВОПРОСА (узбекский или русский).
Правила:
0. НЕ пиши код, псевдокод или имена функций в ответе пользователю. Вызывай
   инструменты через tool-calling; пользователю давай только человеческий текст.
   НЕ вставляй ссылки/URL/пути к файлам и не выдумывай их — фото и клипы
   прикладываются к ответу отдельно и автоматически, писать их не нужно.
1. ЯЗЫК ОТВЕТА = ЯЗЫК ВОПРОСА, СТРОГО, БЕЗ ИСКЛЮЧЕНИЙ, БЕЗ СМЕШИВАНИЯ ЯЗЫКОВ:
   — savol o'zbekcha bo'lsa — javob FAQAT o'zbekcha (masalan: «Bugun nechta
     odam keldi?» → javob o'zbek tilida, ORASIGA birorta ham rus so'zi YO'Q);
   — вопрос по-русски — ответ ТОЛЬКО по-русски (например: «Сколько тревог за
     сутки?» → ответ на русском, ни одного узбекского слова);
   — English question — English answer, ONLY English.
   НИКОГДА не переключай язык сам и не смешивай два языка в одном ответе —
   это САМАЯ частая ошибка, следи за ней в первую очередь.
2. Факты — ТОЛЬКО из инструментов. Не выдумывай события, числа и время.
3. Вопрос «сколько/были ли» → вызывай stats и отвечай ЦИФРАМИ из него
   (alerts = тревоги). Списки событий перечисляй только если попросили список.
4. Вопрос про тревоги/входы в зону списком → search_events (severity=alert или
   type=zone_intrusion). В ответе перечисли ВРЕМЯ и КАМЕРУ каждого события —
   фото и клипы приложатся автоматически.
4a. КОНКРЕТНАЯ ДАТА/ВРЕМЯ («что было 5 июля», «5-iyul kechasi», «вчера ночью»,
   «5 июля с 2 до 4») → search_events с date="ГГГГ-ММ-ДД" (весь день) ИЛИ
   from_time/to_time (точный интервал, ISO). Перечисли ВСЕ найденные события:
   время, камеру и описание (что происходило на кадрах). Ничего не нашёл за
   дату — так и скажи.
   ДАТА — БУКВАЛЬНО: названное число («5 июля», «5-iyul») → date="ГГГГ-07-05"
   с годом из шапки, число и месяц бери КАК ЕСТЬ, НЕ вычитай и НЕ прибавляй дни
   (частая ошибка: 5 июля → 04, это НЕВЕРНО). Вычислять от «сейчас» нужно ТОЛЬКО
   относительные слова: «вчера/сегодня/позавчера», «kecha/bugun/kechagi kun».
4b. КРАЖА / ИНЦИДЕНТ («была ли кража», «o'g'irlik», «проникновение», «взлом»,
   «подозрительное»): отдельного типа «кража» в системе НЕТ. Ищи ПРИЗНАКИ —
   search_events(severity="alert") за нужную дату: это оружие в кадре, вход в
   запретную зону, присутствие в нерабочее время. Дай ПОЛНЫЙ ответ: во сколько,
   на какой камере, что зафиксировано (по описанию), и что это может указывать
   на инцидент. Тревог за дату нет → честно: подозрительного не зафиксировано.
   (Даже старые записи, разобранные в «Архиве», ищутся так же — по их дате.)
4c. КРИТИЧНО (частая ошибка на узбекском): НИКОГДА не утверждай «нет / не было /
   не зафиксировано / yo'q / bo'lmagan» про события, тревоги, кражи, людей или
   статистику, НЕ вызвав СНАЧАЛА инструмент (search_events или stats). Любой
   вопрос «было ли…», «…bo'lganmi?», «нашлось ли…», «что было…», «nima bo'lgan?»
   — это ВСЕГДА повод вызвать инструмент и отвечать ТОЛЬКО по его результату.
   Пустой результат инструмента → «нет»; без вызова инструмента «нет» ЗАПРЕЩЕНО.
   Правило действует на ЛЮБОМ языке, узбекский — не исключение.
5. Поиск человека по внешности → find_person, description по-английски.
   Отрицания переформулируй в положительный признак ДО вызова:
   «без волос/no hair» → "bald man", «без куртки» → "man in a t-shirt".
   Результат find_person читай буквально:
   — ПУСТОЙ список = человека НЕ БЫЛО, так и ответь, никого не подставляй;
   — НЕПУСТОЙ список = НАЙДЕНО: перечисли время и камеру каждой записи,
     отрицать непустой результат ЗАПРЕЩЕНО.
6. Пол, возраст, категории людей — ТОЛЬКО через classify_people. САМ пол/
   категории НЕ определяй и НЕ выдумывай.
   Пример: «сколько девушек было в запретной зоне» →
   classify_people(categories=["woman","man"], zone_only=true).
   В ответе назови цифры по категориям и добавь, что это оценка по внешности.
7. Создание правил по просьбе пользователя:
   «алертить если кто-то зайдёт на <камеру>» → add_alert_zone(camera="...").
   «алертить всё что после 22:00» → set_working_hours(open="08:00", close="22:00").
   После вызова подтверди, что правило создано и действует сразу.
8. Времена в результатах уже локальные — показывай как есть.
9. ПАМЯТЬ: тебе может даваться блок «Что ты помнишь об этом объекте» — учитывай
   эти факты в ответах. Если пользователь просит запомнить что-то на будущее
   («запомни, что…», «esla…», предпочтение, важный факт про объект, как что
   называть) — вызови инструмент remember(fact="…") и подтверди, что запомнил.
   Не запоминай разовые вопросы, пароли и приватные данные без явной просьбы.

НАПОМИНАНИЕ В КОНЦЕ (самое важное, не забудь): ЯЗЫК ОТВЕТА ДОЛЖЕН СОВПАДАТЬ
С ЯЗЫКОМ ВОПРОСА — o'zbekcha savolga faqat o'zbekcha javob, русский вопрос —
русский ответ, English question — English answer. НЕ ПЕРЕКЛЮЧАЙСЯ НА ДРУГОЙ
ЯЗЫК И НЕ СМЕШИВАЙ ЯЗЫКИ."""

# инструменты, чьи результаты уходят пользователю как доказательства (фото/клипы)
EVIDENCE_TOOLS = {"find_person", "search_events", "classify_people"}


def collect_evidence(tool_name: str, result: Any) -> list[dict[str, str]]:
    """Фото/клип/подпись из результата инструмента → медиа для Telegram."""
    if tool_name not in EVIDENCE_TOOLS:
        return []
    items = (
        result
        if isinstance(result, list)
        else result.get("examples", [])
        if isinstance(result, dict)
        else []
    )
    out: list[dict[str, str]] = []
    for item in items:
        if not isinstance(item, dict) or not item.get("photo"):
            continue
        parts = [str(item.get("time", "")), str(item.get("camera", ""))]
        if item.get("category"):
            parts.append(f"категория: {item['category']}")
        if item.get("type"):
            parts.append(str(item["type"]))
        entry: dict[str, str] = {
            "photo": str(item["photo"]),
            "caption": " · ".join(p for p in parts if p),
        }
        if item.get("clip"):
            entry["clip"] = str(item["clip"])
        out.append(entry)
    return out[:5]


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

    def answer(self, chat_id: int, question: str) -> tuple[str, list[dict[str, str]]]:
        """Короткая память в процессе (Telegram): история per chat_id в памяти."""
        history = self._history.setdefault(chat_id, [])
        text, evidence = self._run(question, history)
        history.extend(
            [{"role": "user", "content": question}, {"role": "assistant", "content": text}]
        )
        del history[:-6]  # держим последние 3 обмена
        return text, evidence

    def chat(
        self,
        question: str,
        history: list[dict[str, Any]] | None = None,
        memory_text: str = "",
    ) -> tuple[str, list[dict[str, str]]]:
        """Сохраняемый диалог (дашборд): история приходит из БД, память вклеена
        в системный промпт. Историю НЕ мутируем — её персистит вызывающий."""
        return self._run(question, history or [], memory_text)

    def _run(
        self,
        question: str,
        history: list[dict[str, Any]],
        memory_text: str = "",
    ) -> tuple[str, list[dict[str, str]]]:
        """→ (текст, доказательства [{photo, caption, clip?}]). Вызывать из thread'а."""
        tz = self.cfg.site.timezone
        system = SYSTEM_PROMPT.format(
            site=self.cfg.site.name,
            now=datetime.now(ZoneInfo(tz)).strftime("%d.%m.%Y %H:%M"),
            tz=tz,
        )
        if memory_text:
            system = f"{system}\n\n{memory_text}"
        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system},
            *history,
            {"role": "user", "content": question},
        ]
        evidence: list[dict[str, str]] = []
        # слабые локальные модели любят ответить «нет / yo'q», НЕ заглянув в
        # данные. Если модель отвечает голым текстом, НИ РАЗУ не вызвав
        # инструмент, — один раз принуждаем её свериться с фактами. Но если
        # инструмент уже вызывался, готовый ответ НЕ выбрасываем (иначе сильная
        # облачная модель зациклится, отдав корректный ответ).
        tool_used = False
        forced = False

        def _ask(tc: Literal["auto", "required"]) -> Any:
            return self.client.chat.completions.create(
                model=self.model,
                messages=messages,  # type: ignore[arg-type]
                tools=TOOL_SPECS,  # type: ignore[arg-type]
                tool_choice=tc,
                temperature=0.2,
            )

        for _ in range(MAX_TOOL_ROUNDS):
            try:
                resp = _ask("required" if forced else "auto")
            except Exception:  # noqa: BLE001 — часть провайдеров не умеет required
                if not forced:
                    raise
                forced = False  # откат на auto: продолжаем без принуждения
                resp = _ask("auto")
            msg = resp.choices[0].message
            if not msg.tool_calls:
                text = msg.content or "…"
                inline = parse_inline_tool_call(text)
                if inline is not None and hasattr(self.tools, inline[0]):
                    name, args = inline
                    log.info("agent inline tool %s(%s)", name, args)
                    result = self.tools.call(name, args)
                    if name in EVIDENCE_TOOLS:
                        # доказательства — из ПОСЛЕДНЕГО вызова (пусто = ничего не шлём)
                        evidence = collect_evidence(name, result)
                    messages.append({"role": "assistant", "content": text})
                    messages.append(
                        {
                            "role": "user",
                            "content": (
                                f"Результат {name}: "
                                f"{json.dumps(result, ensure_ascii=False, default=str)}\n"
                                "Сформулируй окончательный ответ пользователю."
                            ),
                        }
                    )
                    continue
                if not tool_used and not forced:
                    # ответ без единого обращения к данным — форсим ровно один
                    # раз; если инструмент уже был, ответу верим
                    forced = True
                    continue
                return text, evidence

            tool_used = True
            forced = False  # модель снова вызывает инструменты — снимаем принуждение
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
                if tc.function.name in EVIDENCE_TOOLS:
                    # доказательства — из ПОСЛЕДНЕГО вызова: если финальный запрос
                    # ничего не нашёл, старые кандидаты не должны уйти в чат
                    evidence = collect_evidence(tc.function.name, result)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, ensure_ascii=False, default=str),
                    }
                )
        return "Не уложился в лимит шагов — уточни вопрос.", evidence
