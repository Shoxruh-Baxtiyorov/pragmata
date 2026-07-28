"""Вечерний дайджест: шаблонная сводка из БД (неделя 3, LLM-версия — после).

Без LLM специально: дайджест обязан работать и без API-ключей — деградация
всегда в сторону «скучно, но честно».
"""

from __future__ import annotations

import re
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, TypedDict
from zoneinfo import ZoneInfo

from sqlalchemy import func, select

from pragmata.bot.texts import EVENT_TITLES

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

    from pragmata.config import SiteConfig


class DigestLabels(TypedDict):
    header: str  # {name}, {hours}
    visitors: str  # {n}
    alerts_line: str  # {alerts}, {fp}
    by_type: str
    recent: str
    quiet: str
    titles: dict[str, str]  # event type → человекочитаемый заголовок


# ru использует EVENT_TITLES бота; uz/en — свои таблицы (дайджест-локальные,
# не расширяют контракт бота). Неизвестный язык → ru (build_digest_text по умолчанию ru).
_DIGEST_LABELS: dict[str, DigestLabels] = {
    "ru": {
        "header": "📊 Дайджест · {name} · за {hours} ч",
        "visitors": "👥 Посетителей (входов): {n}",
        "alerts_line": "🚨 Тревог: {alerts} · ⚠️ помечено ложными: {fp}",
        "by_type": "По типам:",
        "recent": "Последние тревоги:",
        "quiet": "Тревог не было. Тихий день ✨",
        "titles": EVENT_TITLES,
    },
    "uz": {
        "header": "📊 Dayjest · {name} · {hours} soat ichida",
        "visitors": "👥 Tashrif buyuruvchilar (kirishlar): {n}",
        "alerts_line": "🚨 Ogohlantirishlar: {alerts} · ⚠️ notoʻgʻri belgilangan: {fp}",
        "by_type": "Turlari boʻyicha:",
        "recent": "Soʻnggi ogohlantirishlar:",
        "quiet": "Ogohlantirishlar boʻlmadi. Tinch kun ✨",
        "titles": {
            "zone_intrusion": "🚨 Taqiqlangan zonaga kirish",
            "loitering": "⏳ Zonada uzoq turish",
            "after_hours_presence": "🌙 Ish vaqtidan tashqari odam",
            "person_entered": "👤 Odam paydo boʻldi",
            "person_exited": "🚪 Odam ketdi",
            "camera_offline": "📵 Kamera oʻchgan",
            "camera_online": "✅ Kamera yana ishlayapti",
            "watchlist_match": "🔴 Kuzatuv roʻyxatidagi odam",
            "weapon_detected": "🔫 Qurol aniqlandi",
            "vehicle_seen": "🚗 Transport",
        },
    },
    "en": {
        "header": "📊 Digest · {name} · last {hours}h",
        "visitors": "👥 Visitors (entries): {n}",
        "alerts_line": "🚨 Alerts: {alerts} · ⚠️ marked false: {fp}",
        "by_type": "By type:",
        "recent": "Recent alerts:",
        "quiet": "No alerts. A quiet day ✨",
        "titles": {
            "zone_intrusion": "🚨 Entered a restricted zone",
            "loitering": "⏳ Lingering in a zone",
            "after_hours_presence": "🌙 Person outside working hours",
            "person_entered": "👤 Person appeared",
            "person_exited": "🚪 Person left",
            "camera_offline": "📵 Camera offline",
            "camera_online": "✅ Camera back online",
            "watchlist_match": "🔴 Person from the watchlist",
            "weapon_detected": "🔫 Weapon detected",
            "vehicle_seen": "🚗 Vehicle",
        },
    },
}


def _digest_labels(lang: str) -> DigestLabels:
    """Набор подписей дайджеста для языка; неизвестный язык → ru."""
    return _DIGEST_LABELS.get(lang, _DIGEST_LABELS["ru"])


def seconds_until(hhmm: str, tz: str, now_ts: float) -> float:
    """Секунд до ближайшего hh:mm в таймзоне объекта (сегодня или завтра)."""
    zone = ZoneInfo(tz)
    now = datetime.fromtimestamp(now_ts, tz=zone)
    hour, minute = (int(x) for x in hhmm.split(":"))
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= now:
        target += timedelta(days=1)
    return (target - now).total_seconds()


# Только escape-последовательности: литеральные эмодзи в исходнике уже ломали файл.
# Диапазоны: пиктограммы, часы/песочница, символы+дингбаты, стрелки, variation selector.
_EMOJI_RE = re.compile("[\U0001f000-\U0001faff⌀-⏿☀-➿⬀-⯿️]+")


def strip_emoji(text: str) -> str:
    """Убрать эмодзи и следы от них. В вебе иконки рисует UI, а не текст.

    Телеграм-шаблон дайджеста намеренно с эмодзи — там они уместны; на дашборде
    это мусор. Отступ вложенных строк (2 пробела) сохраняем: он держит структуру.
    """
    cleaned = _EMOJI_RE.sub("", text)
    cleaned = re.sub(r"(?m)^(?P<indent> {2})? (?=\S)", lambda m: m.group("indent") or "", cleaned)
    cleaned = re.sub(r"(?<=\S) {2,}(?=\S)", " ", cleaned)
    cleaned = re.sub(r"·\s*·", "·", cleaned)  # повисший разделитель ·
    return "\n".join(line.rstrip() for line in cleaned.split("\n"))


def build_digest_text(
    session_factory: sessionmaker[Session],
    cfg: SiteConfig,
    hours: int = 24,
    lang: str = "ru",
    emoji: bool = True,
    scope: int | None = None,
) -> str:
    from sqlalchemy import true

    from pragmata.db.models import Event, Feedback

    labels = _digest_labels(lang)

    tz = ZoneInfo(cfg.site.timezone)
    since = datetime.now(UTC) - timedelta(hours=hours)
    cam_names = {c.id: c.name for c in cfg.cameras}
    # мультиаренда: клиент видит сводку ТОЛЬКО своей организации, не чужой
    site = true() if scope is None else Event.site_id == scope

    with session_factory() as s:
        by_type: dict[str, int] = {
            row[0]: row[1]
            for row in s.execute(
                select(Event.type, func.count())
                .where(Event.t_start >= since, Event.source == "live", site)
                .group_by(Event.type)
            ).all()
        }
        alerts = (
            s.execute(
                select(Event)
                .where(
                    Event.t_start >= since,
                    Event.severity == "alert",
                    Event.source == "live",
                    site,
                )
                .order_by(Event.t_start.desc())
                .limit(8)
            )
            .scalars()
            .all()
        )
        fp_q = (
            select(func.count())
            .select_from(Feedback)
            .where(Feedback.created_at >= since, Feedback.verdict == "false_positive")
        )
        if scope is not None:
            fp_q = fp_q.join(Event, Event.id == Feedback.event_id).where(Event.site_id == scope)
        fp_count = s.execute(fp_q).scalar_one()

    visitors = by_type.get("person_entered", 0)
    alert_total = sum(
        n
        for t, n in by_type.items()
        if t in ("zone_intrusion", "after_hours_presence", "camera_offline")
    )
    lines = [
        labels["header"].format(name=cfg.site.name, hours=hours),
        "",
        labels["visitors"].format(n=visitors),
        labels["alerts_line"].format(alerts=alert_total, fp=fp_count),
    ]
    if by_type:
        lines.append("")
        lines.append(labels["by_type"])
        for t, n in sorted(by_type.items(), key=lambda kv: -kv[1]):
            title = labels["titles"].get(t, t)
            lines.append(f"  {title} — {n}")
    if alerts:
        lines.append("")
        lines.append(labels["recent"])
        for ev in alerts:
            when = ev.t_start.astimezone(tz).strftime("%d.%m %H:%M")
            cam = cam_names.get(ev.camera_id, ev.camera_id)
            zone = f" · {ev.zone}" if ev.zone else ""
            lines.append(f"  {when} · {cam}{zone} · {labels['titles'].get(ev.type, ev.type)}")
    else:
        lines.append("")
        lines.append(labels["quiet"])
    text = "\n".join(lines)
    return text if emoji else strip_emoji(text)
