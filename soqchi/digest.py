"""Вечерний дайджест: шаблонная сводка из БД (неделя 3, LLM-версия — после).

Без LLM специально: дайджест обязан работать и без API-ключей — деградация
всегда в сторону «скучно, но честно».
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from soqchi.bot.texts import EVENT_TITLES

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

    from soqchi.config import SiteConfig


def seconds_until(hhmm: str, tz: str, now_ts: float) -> float:
    """Секунд до ближайшего hh:mm в таймзоне объекта (сегодня или завтра)."""
    zone = ZoneInfo(tz)
    now = datetime.fromtimestamp(now_ts, tz=zone)
    hour, minute = (int(x) for x in hhmm.split(":"))
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


def build_digest_text(
    session_factory: sessionmaker[Session], cfg: SiteConfig, hours: int = 24
) -> str:
    from soqchi.db.models import Event, Feedback

    tz = ZoneInfo(cfg.site.timezone)
    since = datetime.now(UTC) - timedelta(hours=hours)
    cam_names = {c.id: c.name for c in cfg.cameras}

    with session_factory() as s:
        by_type: dict[str, int] = {
            row[0]: row[1]
            for row in s.execute(
                select(Event.type, func.count()).where(Event.t_start >= since).group_by(Event.type)
            ).all()
        }
        alerts = (
            s.execute(
                select(Event)
                .where(Event.t_start >= since, Event.severity == "alert")
                .order_by(Event.t_start.desc())
                .limit(8)
            )
            .scalars()
            .all()
        )
        fp_count = s.execute(
            select(func.count())
            .select_from(Feedback)
            .where(Feedback.created_at >= since, Feedback.verdict == "false_positive")
        ).scalar_one()

    visitors = by_type.get("person_entered", 0)
    alert_total = sum(
        n
        for t, n in by_type.items()
        if t in ("zone_intrusion", "after_hours_presence", "camera_offline")
    )
    lines = [
        f"📊 Дайджест · {cfg.site.name} · за {hours} ч",
        "",
        f"👥 Посетителей (входов): {visitors}",
        f"🚨 Тревог: {alert_total} · ⚠️ помечено ложными: {fp_count}",
    ]
    if by_type:
        lines.append("")
        lines.append("По типам:")
        for t, n in sorted(by_type.items(), key=lambda kv: -kv[1]):
            title = EVENT_TITLES.get(t, t)
            lines.append(f"  {title} — {n}")
    if alerts:
        lines.append("")
        lines.append("Последние тревоги:")
        for ev in alerts:
            when = ev.t_start.astimezone(tz).strftime("%d.%m %H:%M")
            cam = cam_names.get(ev.camera_id, ev.camera_id)
            zone = f" · {ev.zone}" if ev.zone else ""
            lines.append(f"  {when} · {cam}{zone} · {EVENT_TITLES.get(ev.type, ev.type)}")
    else:
        lines.append("")
        lines.append("Тревог не было. Тихий день ✨")
    return "\n".join(lines)
