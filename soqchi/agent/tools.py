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

    from soqchi.config import SiteConfig
    from soqchi.perception.embedder import ClipEmbedder

TOOL_SPECS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_events",
            "description": "События видеонаблюдения с фильтрами. Время — за последние N часов.",
            "parameters": {
                "type": "object",
                "properties": {
                    "hours": {
                        "type": "number",
                        "description": "глубина поиска в часах",
                        "default": 24,
                    },
                    "camera_id": {"type": "string", "description": "id камеры (опционально)"},
                    "type": {
                        "type": "string",
                        "enum": [
                            "person_entered",
                            "person_exited",
                            "zone_intrusion",
                            "loitering",
                            "after_hours_presence",
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
                "Сводные цифры за период: посетители, тревоги, разбивка по типам и камерам."
            ),
            "parameters": {
                "type": "object",
                "properties": {"hours": {"type": "number", "default": 24}},
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
]


class AgentTools:
    """Реализации инструментов, привязанные к БД/конфигу/эмбеддеру."""

    def __init__(
        self,
        session_factory: sessionmaker[Session],
        cfg: SiteConfig,
        embedder: ClipEmbedder | None = None,
    ):
        self.sf = session_factory
        self.cfg = cfg
        self.tz = ZoneInfo(cfg.site.timezone)
        self.cam_names = {c.id: c.name for c in cfg.cameras}
        self.embedder = embedder

    def _t(self, dt: datetime) -> str:
        return dt.astimezone(self.tz).strftime("%d.%m %H:%M:%S")

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
    ) -> list[dict[str, Any]]:
        from soqchi.db.models import Event

        since = datetime.now(UTC) - timedelta(hours=hours)
        q = select(Event).where(Event.t_start >= since)
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

    def stats(self, hours: float = 24) -> dict[str, Any]:
        from soqchi.db.models import Event, Feedback

        since = datetime.now(UTC) - timedelta(hours=hours)
        with self.sf() as s:
            by_type = {
                r[0]: r[1]
                for r in s.execute(
                    select(Event.type, func.count())
                    .where(Event.t_start >= since)
                    .group_by(Event.type)
                ).all()
            }
            by_camera = {
                self.cam_names.get(r[0], r[0]): r[1]
                for r in s.execute(
                    select(Event.camera_id, func.count())
                    .where(Event.t_start >= since)
                    .group_by(Event.camera_id)
                ).all()
            }
            fp = s.execute(
                select(func.count())
                .select_from(Feedback)
                .where(Feedback.created_at >= since, Feedback.verdict == "false_positive")
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

    def find_person(self, description: str, hours: float = 48) -> list[dict[str, Any]]:
        if self.embedder is None:
            return [{"error": "embedder disabled"}]
        from soqchi.config import get_settings
        from soqchi.investigation import find_people, has_negation

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
        from soqchi.db.models import Event, Track
        from soqchi.investigation import build_query_prompt

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
        from soqchi.db.models import Event

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
        from soqchi.api.schemas import ZoneIn
        from soqchi.services.config_service import add_zone

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
        from soqchi.db.config_store import bump_config_version
        from soqchi.db.models import Site

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
