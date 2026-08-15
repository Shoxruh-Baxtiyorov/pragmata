"""Инструменты агента — SQL-first: LLM только понимает вопрос и оформляет ответ.

Никакого text-to-SQL: типизированные функции с параметрами (дизайн-решение
против инъекций и выдуманных колонок). Каждая возвращает JSON-безопасные dict.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

    from pragmata.config import SiteConfig
    from pragmata.perception.embedder import ClipEmbedder

TOOL_SPECS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_events",
            "description": (
                "События видеонаблюдения с фильтрами и временем. По умолчанию — за N "
                "часов. Для КОНКРЕТНОЙ даты используй date='YYYY-MM-DD' (весь день); "
                "для точного интервала — from_time/to_time (ISO, напр. '2026-07-05T02:00'). "
                "Возвращает время, камеру, тип, описание с кадров, фото и клип каждого события."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hours": {
                        "type": "number",
                        "description": "глубина поиска в часах (если дата не задана)",
                        "default": 24,
                    },
                    "date": {
                        "type": "string",
                        "description": "конкретный день YYYY-MM-DD (весь день)",
                    },
                    "from_time": {
                        "type": "string",
                        "description": "начало интервала ISO, напр. 2026-07-05T02:00",
                    },
                    "to_time": {"type": "string", "description": "конец интервала ISO"},
                    "camera_id": {"type": "string", "description": "id камеры (опционально)"},
                    "type": {
                        "type": "string",
                        "enum": [
                            "person_entered",
                            "person_exited",
                            "zone_intrusion",
                            "loitering",
                            "after_hours_presence",
                            "weapon_detected",
                            "vehicle_seen",
                            "watchlist_match",
                            "person_recognized",
                            "camera_offline",
                            "camera_online",
                        ],
                    },
                    "severity": {"type": "string", "enum": ["info", "warning", "alert"]},
                    "zone": {"type": "string"},
                    "limit": {"type": "integer", "default": 20},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "stats",
            "description": (
                "Сводные цифры за период: посетители, тревоги, разбивка по типам и камерам. "
                "Для конкретного дня — date='YYYY-MM-DD'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hours": {"type": "number", "default": 24},
                    "date": {"type": "string", "description": "конкретный день YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recognized_people",
            "description": (
                "Сколько РАЗНЫХ людей из реестра (watchlist) узнала система за период — "
                "по именам, НЕ по числу событий (один человек может дать много "
                "срабатываний). Используй для вопросов «сколько наших/из списка "
                "пришло», «кто приходил сегодня». Возвращает count и список: имя, "
                "число визитов, первый/последний раз."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "hours": {"type": "number", "default": 24},
                    "date": {"type": "string", "description": "конкретный день YYYY-MM-DD"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_person",
            "description": (
                "Поиск человека по описанию внешности (Investigation Mode). "
                "description — ТОЛЬКО по-английски, коротко: 'man in black jacket with backpack'. "
                "Переведи запрос пользователя на английский сам."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "description": {"type": "string"},
                    "hours": {"type": "number", "default": 48},
                },
                "required": ["description"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "classify_people",
            "description": (
                "Разложить замеченных людей по категориям внешности и посчитать. "
                'categories — ПО-АНГЛИЙСКИ, взаимоисключающие: ["man", "woman"] или '
                '["person in uniform", "person in casual clothes"]. '
                "zone_only=true — только те, кто входил в запретные зоны. "
                "Возвращает counts и примеры с фото. Это ОЦЕНКА по внешности — "
                "обязательно скажи об этом в ответе."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "categories": {"type": "array", "items": {"type": "string"}},
                    "hours": {"type": "number", "default": 24},
                    "zone_only": {"type": "boolean", "default": False},
                },
                "required": ["categories"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "camera_status",
            "description": "Список камер и время их последнего события (живы ли).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "add_alert_zone",
            "description": (
                "Создать правило: алертить, когда человек появляется на камере "
                "(зона на весь кадр). Для «если кто-то зайдёт на склад — тревога». "
                "camera — имя или id камеры из списка. Изменение вступит в силу сразу."
            ),
            "parameters": {
                "type": "object",
                "properties": {"camera": {"type": "string"}, "zone_name": {"type": "string"}},
                "required": ["camera"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_working_hours",
            "description": (
                "Задать рабочие часы объекта. Появление человека ВНЕ этих часов → тревога "
                "(after-hours). Для «алертить всё, что после 22:00». Формат HH:MM."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "open": {"type": "string", "description": "начало, напр. 08:00"},
                    "close": {"type": "string", "description": "конец, напр. 22:00"},
                },
                "required": ["open", "close"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remember",
            "description": (
                "Запомнить факт про объект НАДОЛГО (между диалогами): предпочтение "
                "пользователя, как что называть, важное правило объекта. Вызывай, когда "
                "пользователь просит «запомни…»/«esla…» или сообщает устойчивый факт. "
                "Не запоминай разовые вопросы и приватные данные без явной просьбы."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "fact": {"type": "string", "description": "факт для долговременной памяти"},
                },
                "required": ["fact"],
            },
        },
    },
]

# severity-значения, которые локальные модели ошибочно шлют в поле type
_SEVERITY_WORDS = {"alert", "warn", "warning", "info", "critical", "тревога"}


def _coerce_type_severity(
    type_: str | None, severity: str | None
) -> tuple[str | None, str | None]:
    """type="alert" — частая ошибка модели: alert это severity, не тип события.

    Такой фильтр по несуществующему типу вернул бы пусто, и агент ответил бы
    «ничего не найдено». Переносим severity-слово из type в severity.
    """
    if type_ and type_.lower() in _SEVERITY_WORDS:
        word = type_.lower()
        severity = severity or ("warning" if word == "warn" else word)
        type_ = None
    return type_, severity


class AgentTools:
    """Реализации инструментов, привязанные к БД/конфигу/эмбеддеру."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        cfg: SiteConfig,
        embedder: ClipEmbedder | None = None,
        scope: int | None = None,
    ):
        self.sf = session_factory
        self.cfg = cfg
        # организация, которой ограничен агент; None = платформа видит всё
        self.scope = scope
        self.tz = ZoneInfo(cfg.site.timezone)
        self.cam_names = {c.id: c.name for c in cfg.cameras}
        self.embedder = embedder

    def _t(self, dt: datetime) -> str:
        return dt.astimezone(self.tz).strftime("%d.%m.%Y %H:%M:%S")

    def _parse_dt(self, s: str | None) -> datetime | None:
        if not s:
            return None
        try:
            d = datetime.fromisoformat(s)
        except (ValueError, TypeError):
            return None
        return (d.replace(tzinfo=self.tz) if d.tzinfo is None else d).astimezone(UTC)

    def _window(
        self,
        hours: float,
        date: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
    ) -> tuple[datetime, datetime | None]:
        """Окно поиска (start_utc, end_utc|None). Приоритет: from/to → date → hours.

        date — конкретный день 'YYYY-MM-DD' (весь день в tz объекта);
        from_time/to_time — точный диапазон (ISO, tz объекта).
        """
        start = self._parse_dt(from_time)
        end = self._parse_dt(to_time)
        if start or end:
            return start or (datetime.now(UTC) - timedelta(days=3650)), end
        if date:
            day = self._parse_dt(date)
            if day is not None:
                local = day.astimezone(self.tz).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
                return local.astimezone(UTC), (local + timedelta(days=1)).astimezone(UTC)
        return datetime.now(UTC) - timedelta(hours=hours), None

    def call(self, name: str, args: dict[str, Any]) -> Any:
        handler = getattr(self, name, None)
        if handler is None:
            return {"error": f"unknown tool {name}"}
        try:
            return handler(**args)
        except TypeError as e:
            return {"error": f"bad arguments: {e}"}

    # --- инструменты -------------------------------------------------------

    def search_events(
        self,
        hours: float = 24,
        camera_id: str | None = None,
        type: str | None = None,  # noqa: A002 — имя фиксировано контрактом инструмента
        severity: str | None = None,
        zone: str | None = None,
        limit: int = 20,
        date: str | None = None,
        from_time: str | None = None,
        to_time: str | None = None,
    ) -> list[dict[str, Any]]:
        from pragmata.db.models import Event

        type, severity = _coerce_type_severity(type, severity)
        start, end = self._window(hours, date, from_time, to_time)
        q = select(Event).where(Event.t_start >= start)
        if self.scope is not None:
            q = q.where(Event.site_id == self.scope)
        if end is not None:
            q = q.where(Event.t_start < end)
        if camera_id:
            q = q.where(Event.camera_id == camera_id)
        if type:
            q = q.where(Event.type == type)
        if severity:
            q = q.where(Event.severity == severity)
        if zone:
            q = q.where(Event.zone == zone)
        q = q.order_by(Event.t_start.desc()).limit(min(limit, 50))
        with self.sf() as s:
            rows = s.execute(q).scalars().all()
        return [
            {
                "time": self._t(ev.t_start),
                "type": ev.type,
                "severity": ev.severity,
                "camera": self.cam_names.get(ev.camera_id, ev.camera_id),
                "zone": ev.zone,
                "duration_s": ev.duration_s,
                "description": ev.description,  # VLM: что происходило на кадрах
                "photo": ev.frame_path,
                "clip": ev.clip_path,
            }
            for ev in rows
        ]

    def stats(self, hours: float = 24, date: str | None = None) -> dict[str, Any]:
        from pragmata.db.models import Event, Feedback

        start, end = self._window(hours, date)
        conds = [Event.t_start >= start, Event.source == "live"]
        if self.scope is not None:
            conds.append(Event.site_id == self.scope)
        if end is not None:
            conds.append(Event.t_start < end)
        fp_conds = [Feedback.created_at >= start, Feedback.verdict == "false_positive"]
        if end is not None:
            fp_conds.append(Feedback.created_at < end)
        with self.sf() as s:
            by_type = {
                r[0]: r[1]
                for r in s.execute(
                    select(Event.type, func.count()).where(*conds).group_by(Event.type)
                ).all()
            }
            by_camera = {
                self.cam_names.get(r[0], r[0]): r[1]
                for r in s.execute(
                    select(Event.camera_id, func.count()).where(*conds).group_by(Event.camera_id)
                ).all()
            }
            fp = s.execute(
                select(func.count()).select_from(Feedback).where(*fp_conds)
            ).scalar_one()
        return {
            "hours": hours,
            "visitors_entered": by_type.get("person_entered", 0),
            "alerts": sum(
                n
                for t, n in by_type.items()
                if t in ("zone_intrusion", "after_hours_presence", "camera_offline")
            ),
            "false_positives": fp,
            "by_type": by_type,
            "by_camera": by_camera,
        }

    def recognized_people(self, hours: float = 24, date: str | None = None) -> dict[str, Any]:
        """РАЗНЫЕ узнанные люди из реестра за период — по именам, не по событиям.

        Считаем distinct person_id по трекам (один человек = один пункт, сколько бы
        раз ни мелькал), чтобы «сколько из списка пришло» не раздувалось числом
        срабатываний.
        """
        from pragmata.db.models import Person, Track

        start, end = self._window(hours, date)
        with self.sf() as s:
            pq = select(Person.id, Person.name)
            if self.scope is not None:
                pq = pq.where(Person.site_id == self.scope)
            names = {pid: name for pid, name in s.execute(pq).all()}
            if not names:
                return {"count": 0, "people": []}
            tq = (
                select(
                    Track.person_id,
                    func.count(),
                    func.min(Track.started_at),
                    func.max(Track.ended_at),
                )
                .where(Track.person_id.is_not(None), Track.started_at >= start)
                .group_by(Track.person_id)
            )
            if end is not None:
                tq = tq.where(Track.started_at < end)
            rows = [r for r in s.execute(tq).all() if r[0] in names]
        people = [
            {
                "name": names.get(pid, "?"),
                "visits": int(cnt),
                "first_seen": self._t(mn),
                "last_seen": self._t(mx),
            }
            for pid, cnt, mn, mx in rows
        ]
        people.sort(key=lambda p: p["visits"], reverse=True)
        return {"count": len(people), "people": people}

    def find_person(self, description: str, hours: float = 48) -> list[dict[str, Any]]:
        if self.embedder is None:
            return [{"error": "embedder disabled"}]
        from pragmata.config import get_settings
        from pragmata.investigation import find_people, has_negation

        if has_negation(description):
            return [
                {
                    "error": "negation queries are unreliable for the vision model; "
                    "rephrase with a POSITIVE attribute (e.g. 'bald man' instead of "
                    "'man with no hair') and call find_person again"
                }
            ]

        found = find_people(
            self.sf,
            self.embedder,
            description,
            hours=int(hours),
            limit=5,
            min_margin=get_settings().find_min_margin,
        )
        return [
            {
                "time": self._t(t.started_at),
                "camera": self.cam_names.get(t.camera_id, t.camera_id),
                "duration_s": round((t.ended_at - t.started_at).total_seconds(), 1),
                "similarity": round(sim, 3),
                "photo": t.best_frame_path,
            }
            for t, sim in found
        ]

    def classify_people(
        self, categories: list[str], hours: float = 24, zone_only: bool = False
    ) -> dict[str, Any]:
        """Zero-shot классификация треков по CLIP: argmax по категорийным промптам."""
        if self.embedder is None:
            return {"error": "embedder disabled"}
        if not categories:
            return {"error": "нужны категории по-английски"}
        if len(categories) == 1:
            # маленькие модели зовут с одной категорией — дополняем парной сами
            complements = {
                "woman": "man",
                "man": "woman",
                "girl": "man",
                "boy": "woman",
                "child": "adult",
                "adult": "child",
            }
            categories = [categories[0], complements.get(categories[0].lower(), "other person")]
        from pragmata.db.models import Event, Track
        from pragmata.investigation import build_query_prompt

        cat_embs = {c: self.embedder.embed_text(build_query_prompt(c)) for c in categories}
        since = datetime.now(UTC) - timedelta(hours=hours)

        with self.sf() as s:
            tracks = (
                s.execute(
                    select(Track)
                    .where(Track.clip_emb.is_not(None), Track.started_at >= since)
                    .order_by(Track.started_at.desc())
                    .limit(300)
                )
                .scalars()
                .all()
            )
            if zone_only:
                zone_rows = s.execute(
                    select(Event.camera_id, Event.meta["track_id"].as_integer()).where(
                        Event.t_start >= since, Event.type == "zone_intrusion"
                    )
                ).all()
                in_zone = {(r[0], r[1]) for r in zone_rows if r[1] is not None}
                tracks = [t for t in tracks if (t.camera_id, t.track_id) in in_zone]

        counts: dict[str, int] = dict.fromkeys(categories, 0)
        examples: list[dict[str, Any]] = []
        for t in tracks:
            emb = list(t.clip_emb)  # type: ignore[arg-type]
            sims = {
                c: sum(a * b for a, b in zip(emb, e, strict=True)) for c, e in cat_embs.items()
            }
            ranked = sorted(sims.items(), key=lambda kv: -kv[1])
            best, gap = ranked[0][0], ranked[0][1] - ranked[1][1]
            counts[best] += 1
            examples.append(
                {
                    "category": best,
                    "confidence_gap": round(gap, 3),
                    "time": self._t(t.started_at),
                    "camera": self.cam_names.get(t.camera_id, t.camera_id),
                    "photo": t.best_frame_path,
                }
            )
        # в примеры — по 2 самых уверенных на категорию
        examples.sort(key=lambda e: -e["confidence_gap"])
        per_cat: dict[str, int] = dict.fromkeys(categories, 0)
        top_examples = []
        for ex in examples:
            if per_cat[ex["category"]] < 2:
                per_cat[ex["category"]] += 1
                top_examples.append(ex)
        return {
            "total_people": len(tracks),
            "counts": counts,
            "examples": top_examples,
            "note": "оценка по внешности (zero-shot CLIP), возможны ошибки",
        }

    def camera_status(self) -> list[dict[str, Any]]:
        from pragmata.db.models import Event

        with self.sf() as s:
            last = {
                r[0]: r[1]
                for r in s.execute(
                    select(Event.camera_id, func.max(Event.t_start)).group_by(Event.camera_id)
                ).all()
            }
        return [
            {
                "camera": c.name,
                "id": c.id,
                "last_event": self._t(last[c.id]) if c.id in last else "нет событий",
            }
            for c in self.cfg.cameras
        ]

    def _resolve_camera(self, camera: str) -> str | None:
        for c in self.cfg.cameras:
            if camera in (c.id, c.name) or camera.lower() in c.name.lower():
                return c.id
        return None

    def add_alert_zone(self, camera: str, zone_name: str = "Тревога") -> dict[str, Any]:
        cam_id = self._resolve_camera(camera)
        if cam_id is None:
            return {
                "error": f"камера '{camera}' не найдена",
                "cameras": [c.name for c in self.cfg.cameras],
            }
        from pragmata.api.schemas import ZoneIn
        from pragmata.services.config_service import add_zone

        add_zone(
            cam_id,
            ZoneIn(
                name=zone_name,
                polygon=[(0.02, 0.02), (0.98, 0.02), (0.98, 0.98), (0.02, 0.98)],
                zone_intrusion=True,
                hysteresis_frames=6,
            ),
        )
        return {"ok": True, "camera": cam_id, "note": "правило создано, действует сразу"}

    def set_working_hours(self, open: str, close: str) -> dict[str, Any]:  # noqa: A002
        from pragmata.db.config_store import bump_config_version
        from pragmata.db.models import Site

        with self.sf() as s:
            site = s.get(Site, 1)
            if site is None:
                return {"error": "site not found"}
            wh = site.working_hours or {"days": ["mon", "tue", "wed", "thu", "fri", "sat"]}
            wh["open"], wh["close"] = open, close
            site.working_hours = wh
            s.commit()
        bump_config_version(self.sf)
        return {"ok": True, "open": open, "close": close, "note": "вне этих часов = тревога"}

    def remember(self, fact: str) -> dict[str, Any]:
        """Записать факт в долговременную память ассистента (per-site)."""
        from pragmata.services import agent_chat_service

        fact = (fact or "").strip()
        if not fact:
            return {"error": "empty fact"}
        agent_chat_service.add_memory(self.scope, fact, source="user")
        return {"ok": True, "remembered": fact, "note": "запомнил надолго"}
