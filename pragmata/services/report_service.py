"""PDF-акт расследования: события за период → HTML → PDF (weasyprint) с фото-доказательствами."""
# ruff: noqa: E501 — длинные строки CSS/HTML в шаблоне читаемее одной строкой

from __future__ import annotations

import base64
from datetime import UTC, datetime, timedelta
from html import escape
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import select

from pragmata.api.deps import camera_names, require_site, session_factory
from pragmata.config import get_settings

_EVENT_RU = {
    "zone_intrusion": "Вход в запретную зону",
    "loitering": "Долгое присутствие",
    "after_hours_presence": "Нерабочее время",
    "person_entered": "Человек вошёл",
    "person_exited": "Человек вышел",
    "camera_offline": "Камера офлайн",
    "watchlist_match": "Человек из списка наблюдения",
}


def _img_data_uri(rel: str | None) -> str | None:
    if not rel:
        return None
    p = get_settings().media_dir / rel
    if not p.exists():
        return None
    return "data:image/jpeg;base64," + base64.b64encode(p.read_bytes()).decode()


def build_report_pdf(hours: float, camera_id: str | None, severity: str | None) -> bytes:
    from pragmata.db.models import Event

    cfg = require_site()
    tz = ZoneInfo(cfg.site.timezone)
    names = camera_names()
    since = datetime.now(UTC) - timedelta(hours=hours)

    # акт — про людей, не про сетевые сбои камер
    q = select(Event).where(
        Event.t_start >= since,
        Event.source == "live",
        Event.type.notin_(["camera_offline", "camera_online"]),
    )
    if camera_id:
        q = q.where(Event.camera_id == camera_id)
    if severity:
        q = q.where(Event.severity == severity)
    q = q.order_by(Event.t_start.desc()).limit(200)
    with session_factory()() as s:
        events = s.execute(q).scalars().all()

    generated = datetime.now(tz).strftime("%d.%m.%Y %H:%M")
    rows = []
    for ev in events:
        img = _img_data_uri(ev.frame_path)
        thumb = f'<img src="{img}"/>' if img else '<div class="noimg">—</div>'
        rows.append(
            f"""<tr>
              <td class="thumb">{thumb}</td>
              <td>
                <div class="etype">{escape(_EVENT_RU.get(ev.type, ev.type))}</div>
                <div class="meta">{escape(names.get(ev.camera_id, ev.camera_id))}"""
            + (f" · {escape(ev.zone)}" if ev.zone else "")
            + f"""</div>
                {'<div class="desc">' + escape(ev.description) + "</div>" if ev.description else ""}
              </td>
              <td class="time">{ev.t_start.astimezone(tz).strftime("%d.%m %H:%M:%S")}</td>
            </tr>"""
        )

    scope = names.get(camera_id, camera_id) if camera_id else "все камеры"
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
      @page {{ size: A4; margin: 1.6cm; @bottom-right {{ content: "Стр. " counter(page); font-size: 9px; color: #888; }} }}
      body {{ font-family: sans-serif; color: #1f2530; font-size: 12px; }}
      h1 {{ font-size: 20px; margin: 0 0 2px; }}
      .sub {{ color: #78808f; margin-bottom: 16px; }}
      .badge {{ display:inline-block; background:#eef3ff; color:#1f5ae8; padding:2px 8px; border-radius:20px; font-size:11px; }}
      table {{ width: 100%; border-collapse: collapse; }}
      td {{ border-bottom: 1px solid #eef0f3; padding: 8px 6px; vertical-align: top; }}
      .thumb {{ width: 130px; }}
      .thumb img {{ width: 120px; border-radius: 6px; }}
      .noimg {{ width:120px; height:68px; background:#f4f5f7; border-radius:6px; text-align:center; line-height:68px; color:#bbb; }}
      .etype {{ font-weight: 700; }}
      .meta {{ color: #78808f; font-size: 11px; }}
      .desc {{ color:#4a5160; font-style: italic; font-size: 11px; margin-top:3px; }}
      .time {{ font-family: monospace; color:#78808f; white-space:nowrap; text-align:right; width:110px; }}
    </style></head><body>
      <h1>Акт видеонаблюдения — {escape(cfg.site.name)}</h1>
      <div class="sub">
        Объект: {escape(scope)} · Период: последние {hours:g} ч · Событий: {len(events)}<br/>
        Сформировано: {generated} ({cfg.site.timezone}) · Pragmata AI
      </div>
      <div class="badge">Доказательства с камер видеонаблюдения</div>
      <table>{"".join(rows)}</table>
    </body></html>"""

    from weasyprint import HTML  # тяжёлый импорт — только на генерации

    return HTML(string=html, base_url=str(Path.cwd())).write_pdf()  # type: ignore[no-any-return]
