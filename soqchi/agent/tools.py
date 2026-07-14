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
            "name": "camera_status",
            "description": "Список камер и время их последнего события (живы ли).",
            "parameters": {"type": "object", "properties": {}},
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
            }
            for ev in rows
        ]

    def stats(self, hours: float = 24) -> dict[str, Any]:
        from soqchi.db.models import Event

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
        return {
            "hours": hours,
            "visitors_entered": by_type.get("person_entered", 0),
            "alerts": sum(
                n
                for t, n in by_type.items()
                if t in ("zone_intrusion", "after_hours_presence", "camera_offline")
            ),
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
