"""Playback-ссылки NVR: бренд, канал и — главное — часовые пояса."""

from __future__ import annotations

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

import pytest

from pragmata.ingest.nvr import DAHUA, HIKVISION, build_playback_url, detect_brand

TASHKENT = ZoneInfo("Asia/Tashkent")  # UTC+5
HIK_LIVE = "rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101"
DAHUA_LIVE = "rtsp://admin:pass@192.168.1.70:554/cam/realmonitor?channel=3&subtype=0"


def test_detect_brand() -> None:
    assert detect_brand(HIK_LIVE) == HIKVISION
    assert detect_brand(DAHUA_LIVE) == DAHUA
    assert detect_brand("rtsp://host:554/live/main") is None


def test_hikvision_uses_utc() -> None:
    # 02:14 в Ташкенте = 21:14 предыдущего дня по UTC — Hikvision ждёт именно UTC
    start = datetime(2026, 7, 5, 2, 14, 0, tzinfo=TASHKENT)
    end = datetime(2026, 7, 5, 2, 30, 0, tzinfo=TASHKENT)
    url = build_playback_url(HIK_LIVE, start, end, site_tz=TASHKENT)
    assert url.startswith("rtsp://admin:pass@192.168.1.64:554/Streaming/tracks/101?")
    assert "starttime=20260704T211400Z" in url
    assert "endtime=20260704T213000Z" in url


def test_dahua_uses_local_time_and_channel() -> None:
    # Dahua ждёт ЛОКАЛЬНОЕ время регистратора, канал берётся из живого адреса
    start = datetime(2026, 7, 4, 21, 14, 0, tzinfo=UTC)  # = 02:14 в Ташкенте
    end = datetime(2026, 7, 4, 21, 30, 0, tzinfo=UTC)
    url = build_playback_url(DAHUA_LIVE, start, end, site_tz=TASHKENT)
    assert url.startswith("rtsp://admin:pass@192.168.1.70:554/cam/playback?")
    assert "channel=3" in url
    assert "starttime=2026_07_05_02_14_00" in url
    assert "endtime=2026_07_05_02_30_00" in url


def test_brand_can_be_forced() -> None:
    start = datetime(2026, 7, 5, 2, 0, tzinfo=UTC)
    end = datetime(2026, 7, 5, 3, 0, tzinfo=UTC)
    url = build_playback_url("rtsp://h:554/unknown/path", start, end, brand=HIKVISION)
    assert "/Streaming/tracks/101" in url  # канал не распознан → дефолт 101


def test_rejects_bad_input() -> None:
    aware = datetime(2026, 7, 5, 2, 0, tzinfo=UTC)
    naive = datetime(2026, 7, 5, 2, 0)  # noqa: DTZ001 — намеренно наивное время
    with pytest.raises(ValueError, match="timezone-aware"):
        build_playback_url(HIK_LIVE, naive, aware)
    with pytest.raises(ValueError, match="позже начала"):
        build_playback_url(HIK_LIVE, aware, aware)
    with pytest.raises(ValueError, match="не опознан"):
        build_playback_url("rtsp://host:554/live/main", aware, aware.replace(hour=3))
