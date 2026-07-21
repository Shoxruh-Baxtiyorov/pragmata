"""Playback-ссылки реальных NVR: оператор выбирает камеру и интервал, не URL.

Живой RTSP-адрес камеры уже лежит в БД — из него берём хост, порт, учётку и
номер канала, и собираем адрес ВОСПРОИЗВЕДЕНИЯ архива за нужный интервал.

Форматы отличаются не только путём, но и часовым поясом:
- Hikvision — время в UTC (суффикс Z): /Streaming/tracks/<id>?starttime=...Z
- Dahua     — время ЛОКАЛЬНОЕ для регистратора: /cam/playback?...starttime=...
Перепутать пояс = «пустой» архив, поэтому конвертация здесь явная.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING
from urllib.parse import parse_qs, urlparse, urlunparse

if TYPE_CHECKING:
    from zoneinfo import ZoneInfo

HIKVISION = "hikvision"
DAHUA = "dahua"


def detect_brand(url: str) -> str | None:
    """Бренд по пути живого потока. None = не опознан (нужен ручной URL)."""
    path = urlparse(url).path.lower()
    if "/streaming/channels" in path or "/streaming/tracks" in path:
        return HIKVISION
    if "/cam/realmonitor" in path or "/cam/playback" in path:
        return DAHUA
    return None


def _channel(url: str, brand: str) -> str:
    """Номер канала из живого адреса. Hik: /Channels/101 → 101; Dahua: ?channel=1."""
    parsed = urlparse(url)
    if brand == HIKVISION:
        tail = parsed.path.rstrip("/").rsplit("/", 1)[-1]
        return tail if tail.isdigit() else "101"
    ch = parse_qs(parsed.query).get("channel", ["1"])[0]
    return ch if ch.isdigit() else "1"


def build_playback_url(
    live_url: str,
    start: datetime,
    end: datetime,
    brand: str | None = None,
    site_tz: ZoneInfo | None = None,
) -> str:
    """Живой адрес + интервал → адрес воспроизведения архива с регистратора.

    start/end — timezone-aware. brand=None определяется по live_url.
    Неопознанный бренд → ValueError (пусть оператор укажет URL руками).
    """
    if start.tzinfo is None or end.tzinfo is None:
        raise ValueError("start/end должны быть timezone-aware")
    if end <= start:
        raise ValueError("конец интервала должен быть позже начала")

    brand = brand or detect_brand(live_url)
    if brand not in (HIKVISION, DAHUA):
        raise ValueError(
            "бренд регистратора не опознан по адресу камеры — выберите Hikvision или Dahua "
            "вручную, либо загрузите запись файлом"
        )

    parsed = urlparse(live_url)
    netloc = parsed.netloc  # user:pass@host:port сохраняем как есть
    channel = _channel(live_url, brand)

    if brand == HIKVISION:
        # Hikvision ждёт UTC с Z
        s = start.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
        e = end.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
        path = f"/Streaming/tracks/{channel}"
        query = f"starttime={s}&endtime={e}"
    else:
        # Dahua ждёт ЛОКАЛЬНОЕ время регистратора
        tz = site_tz or UTC
        s = start.astimezone(tz).strftime("%Y_%m_%d_%H_%M_%S")
        e = end.astimezone(tz).strftime("%Y_%m_%d_%H_%M_%S")
        path = "/cam/playback"
        query = f"channel={channel}&starttime={s}&endtime={e}"

    return urlunparse(("rtsp", netloc, path, "", query, ""))
