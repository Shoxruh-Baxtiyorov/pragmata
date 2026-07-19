"""Демо-данные для дашборда: 3 камеры, ~25 треков, ~55 событий за последние 24ч.

  uv run python scripts/seed_demo.py            # первый запуск (нужна пустая таблица events)
  uv run python scripts/seed_demo.py --force     # пересидить: удалить данные сидера и залить снова

Сидит camera/zone-таблицы в БД — это ровно то, что читает GET /api/v1/cameras
(pragmata/services/events_service.list_cameras), а не YAML. Без этого /system
(fallback на config/dev.yaml) и /cameras (всегда из БД) расходятся.

Гарантии безопасности:
  - работает только если DATABASE_URL указывает на 127.0.0.1/localhost;
  - никаких TRUNCATE/DROP;
  - без --force падает, если в events уже есть строки;
  - с --force удаляет только то, чем сам управляет: events/tracks по camera_id
    из cam1/cam2/cam3, и сами эти камеры (zones каскадятся FK ondelete=CASCADE) —
    параметризованные ORM DELETE, не raw SQL.
"""

from __future__ import annotations

import argparse
import random
import sys
import uuid
from collections import Counter
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any
from zoneinfo import ZoneInfo

import cv2
import numpy as np
from sqlalchemy import delete, func, select
from sqlalchemy.engine import make_url

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))  # пакет не устанавливается (tool.uv.package=false)

from pragmata.config import (  # noqa: E402
    ClipConfig,
    LoiteringRule,
    MotionConfig,
    WorkingHours,
    ZoneIntrusionRule,
    ZoneRules,
    get_settings,
)
from pragmata.db.session import make_session_factory  # noqa: E402
from pragmata.media import MediaStore  # noqa: E402

TZ = ZoneInfo("Asia/Tashkent")
DAY_START, DAY_END = 7, 21  # часы с повышенным весом — посетители заметнее днём


@dataclass(frozen=True)
class CameraSpec:
    id: str
    name: str
    color: tuple[int, int, int]  # BGR — фон плейсхолдера
    zone: str


CAMERAS = [
    CameraSpec("cam1", "Kirish", (60, 60, 200), "Kirish zonasi"),
    CameraSpec("cam2", "Ombor", (50, 140, 60), "Ombor zonasi"),
    CameraSpec("cam3", "Hovli", (180, 120, 30), "Hovli zonasi"),
]
SEEDED_CAMERA_IDS = [c.id for c in CAMERAS]
CAMERA_BY_ID = {c.id: c for c in CAMERAS}
RESTRICTED_POLYGON = [[0.55, 0.05], [0.98, 0.05], [0.98, 0.97], [0.55, 0.97]]

DESCRIPTIONS: dict[str, list[str]] = {
    "person_entered": ["Odam kadrga kirdi.", "Посетитель вошёл в кадр."],
    "person_exited": ["Odam kadrdan chiqib ketdi.", "Посетитель покинул зону наблюдения."],
    "zone_intrusion": [
        "Taqiqlangan zonaga kirish qayd etildi.",
        "Обнаружено проникновение в запретную зону.",
    ],
    "loitering": [
        "Zonada uzoq turgan shaxs aniqlandi.",
        "Человек долго находится в зоне — возможно подозрительное поведение.",
    ],
    "after_hours_presence": [
        "Ish vaqtidan tashqarida odam aniqlandi.",
        "Обнаружено присутствие вне рабочих часов.",
    ],
    "camera_offline": ["Kamera aloqasi uzildi.", "Камера потеряла связь."],
    "camera_online": ["Kamera qayta ulandi.", "Камера снова на связи."],
}


@dataclass
class TrackSpec:
    id: uuid.UUID
    camera_id: str
    track_id: int
    started_at: datetime
    ended_at: datetime
    frames: int
    best_frame_path: str | None = None


@dataclass
class EventSpec:
    type: str
    camera_id: str
    zone: str | None
    t_start: datetime
    t_end: datetime
    meta: dict[str, Any] = field(default_factory=dict)


def guard_local_db(database_url: str) -> None:
    host = make_url(database_url).host
    if host not in ("127.0.0.1", "localhost"):
        print(f"отказ: DATABASE_URL host={host!r} — сидер работает только на локальной БД")
        raise SystemExit(1)


def random_ts(now: datetime, *, night_only: bool = False) -> datetime:
    """Метка внутри последних 23ч (часовой запас до проверки curl'ом), с дневным перекосом."""
    since = now - timedelta(hours=23)
    while True:
        cand = since + timedelta(seconds=random.uniform(0, 23 * 3600))
        h = cand.astimezone(TZ).hour
        if night_only:
            if h < 6 or h >= 22:
                return cand
            continue
        weight = 3 if DAY_START <= h <= DAY_END else 1
        if random.random() < weight / 3:
            return cand


def make_placeholder(color: tuple[int, int, int], camera_name: str, ts: datetime) -> np.ndarray:
    img = np.full((400, 320, 3), color, dtype=np.uint8)
    cv2.putText(
        img, camera_name, (14, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2, cv2.LINE_AA
    )
    cv2.putText(
        img,
        ts.astimezone(TZ).strftime("%Y-%m-%d %H:%M:%S"),
        (14, 225),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.5,
        (255, 255, 255),
        1,
        cv2.LINE_AA,
    )
    return img


def force_delete(session_factory: sessionmaker[Session]) -> None:
    from pragmata.db.models import Camera, Event, Track

    with session_factory() as s:
        s.execute(delete(Event).where(Event.camera_id.in_(SEEDED_CAMERA_IDS)))
        s.execute(delete(Track).where(Track.camera_id.in_(SEEDED_CAMERA_IDS)))
        s.execute(delete(Camera).where(Camera.id.in_(SEEDED_CAMERA_IDS)))
        s.commit()


def seed_config(session_factory: sessionmaker[Session]) -> tuple[bool, int, dict[str, str]]:
    from pragmata.db.models import Camera, Site, Zone

    site_created = False
    cameras_created = 0
    zone_by_camera: dict[str, str] = {}
    with session_factory() as s:
        if s.get(Site, 1) is None:
            s.add(
                Site(
                    id=1,
                    name="Pragmata Demo",
                    timezone="Asia/Tashkent",
                    working_hours=WorkingHours().model_dump(),
                    digest_time="20:00",
                )
            )
            site_created = True
        for spec in CAMERAS:
            if s.get(Camera, spec.id) is None:
                s.add(
                    Camera(
                        id=spec.id,
                        site_id=1,
                        name=spec.name,
                        url=f"rtsp://demo:demo@127.0.0.1:8554/{spec.id}",
                        enabled=True,
                        process_fps=5.0,
                        detect_conf=0.35,
                        detect_imgsz=640,
                        motion=MotionConfig().model_dump(),
                        clips=ClipConfig().model_dump(),
                    )
                )
                cameras_created += 1
            existing = s.execute(select(Zone).where(Zone.camera_id == spec.id)).scalars().first()
            if existing is None:
                s.add(
                    Zone(
                        camera_id=spec.id,
                        name=spec.zone,
                        type="restricted",
                        polygon=RESTRICTED_POLYGON,
                        rules=ZoneRules(
                            zone_intrusion=ZoneIntrusionRule(), loitering=LoiteringRule()
                        ).model_dump(exclude_none=True),
                    )
                )
            zone_by_camera[spec.id] = spec.zone
        s.commit()
    return site_created, cameras_created, zone_by_camera


def seed_tracks(
    session_factory: sessionmaker[Session], media: MediaStore, now: datetime
) -> list[TrackSpec]:
    from pragmata.db.models import Track

    counters = dict.fromkeys(SEEDED_CAMERA_IDS, 0)
    tracks: list[TrackSpec] = []
    for _ in range(25):
        cam_id = random.choice(SEEDED_CAMERA_IDS)
        counters[cam_id] += 1
        started_at = random_ts(now)
        ended_at = started_at + timedelta(seconds=random.uniform(3, 90))
        tracks.append(
            TrackSpec(
                id=uuid.uuid4(),
                camera_id=cam_id,
                track_id=counters[cam_id],
                started_at=started_at,
                ended_at=ended_at,
                frames=random.randint(50, 500),
            )
        )

    with_photo = set(random.sample(range(len(tracks)), 10))
    with session_factory() as s:
        for i, tr in enumerate(tracks):
            meta: dict[str, Any] = {}
            if i in with_photo:
                cam = CAMERA_BY_ID[tr.camera_id]
                img = make_placeholder(cam.color, cam.name, tr.ended_at)
                tr.best_frame_path = media.save_jpeg(
                    img, tr.camera_id, "track", tr.ended_at.timestamp()
                )
                meta = {"best_bbox": [90, 60, 230, 360]}
            s.add(
                Track(
                    id=tr.id,
                    camera_id=tr.camera_id,
                    track_id=tr.track_id,
                    started_at=tr.started_at,
                    ended_at=tr.ended_at,
                    frames=tr.frames,
                    best_frame_path=tr.best_frame_path,
                    meta=meta,
                )
            )
        s.commit()
    return tracks


def _pick_description(type_: str) -> str:
    return random.choice(DESCRIPTIONS[type_])


def _build_events(
    zone_by_camera: dict[str, str], tracks: list[TrackSpec], now: datetime
) -> list[EventSpec]:
    events: list[EventSpec] = []

    # 21 пара person_entered/person_exited — по реальным трекам (равные счётчики)
    for tr in random.sample(tracks, 21):
        lifetime_s = (tr.ended_at - tr.started_at).total_seconds()
        entered_end = tr.started_at + timedelta(seconds=min(2.5, lifetime_s))
        events.append(
            EventSpec(
                "person_entered",
                tr.camera_id,
                None,
                tr.started_at,
                entered_end,
                {"track_id": tr.track_id},
            )
        )
        events.append(
            EventSpec(
                "person_exited",
                tr.camera_id,
                None,
                tr.started_at,
                tr.ended_at,
                {"track_id": tr.track_id, "lifetime_s": round(lifetime_s, 1)},
            )
        )

    # 6 zone_intrusion
    for _ in range(6):
        cam_id = random.choice(SEEDED_CAMERA_IDS)
        ts = random_ts(now)
        events.append(
            EventSpec(
                "zone_intrusion",
                cam_id,
                zone_by_camera[cam_id],
                ts,
                ts,
                {
                    "track_id": random.randint(1, 40),
                    "hits": 8,
                    "people_in_zone": random.randint(1, 2),
                },
            )
        )

    # 3 loitering
    for _ in range(3):
        cam_id = random.choice(SEEDED_CAMERA_IDS)
        dwell = random.uniform(60, 180)
        t_end = random_ts(now)
        events.append(
            EventSpec(
                "loitering",
                cam_id,
                zone_by_camera[cam_id],
                t_end - timedelta(seconds=dwell),
                t_end,
                {"track_id": random.randint(1, 40), "dwell_s": round(dwell, 1)},
            )
        )

    # 2 after_hours_presence (ночные часы)
    for _ in range(2):
        cam_id = random.choice(SEEDED_CAMERA_IDS)
        ts = random_ts(now, night_only=True)
        events.append(
            EventSpec(
                "after_hours_presence",
                cam_id,
                None,
                ts - timedelta(seconds=3),
                ts,
                {"track_id": random.randint(1, 40)},
            )
        )

    # 1 пара camera_offline/camera_online
    cam_id = random.choice(SEEDED_CAMERA_IDS)
    offline_ts = random_ts(now)
    online_ts = offline_ts + timedelta(seconds=random.uniform(30, 300))
    events.append(
        EventSpec("camera_offline", cam_id, None, offline_ts, offline_ts, {"reason": "network"})
    )
    events.append(EventSpec("camera_online", cam_id, None, online_ts, online_ts, {}))

    return events


def seed_events(
    session_factory: sessionmaker[Session],
    media: MediaStore,
    zone_by_camera: dict[str, str],
    tracks: list[TrackSpec],
    now: datetime,
) -> Counter[str]:
    from pragmata.db.models import Event
    from pragmata.rules.engine import SEVERITY

    events = _build_events(zone_by_camera, tracks, now)

    # ~15 событий с фото: все alert-категории (13) + 2 случайных entered/exited
    paired = ("person_entered", "person_exited")
    alert_idx = [i for i, e in enumerate(events) if e.type not in paired]
    other_idx = [i for i, e in enumerate(events) if e.type in paired]
    with_photo = set(alert_idx) | set(random.sample(other_idx, 2))

    counts: Counter[str] = Counter()
    with session_factory() as s:
        for i, e in enumerate(events):
            frame_path = None
            if i in with_photo:
                cam = CAMERA_BY_ID[e.camera_id]
                img = make_placeholder(cam.color, cam.name, e.t_end)
                frame_path = media.save_jpeg(img, e.camera_id, "event", e.t_end.timestamp())
            description = _pick_description(e.type) if random.random() < 0.4 else None
            s.add(
                Event(
                    site_id=1,
                    camera_id=e.camera_id,
                    type=e.type,
                    severity=SEVERITY[e.type],
                    zone=e.zone,
                    t_start=e.t_start,
                    t_end=e.t_end,
                    duration_s=round((e.t_end - e.t_start).total_seconds(), 2),
                    frame_path=frame_path,
                    description=description,
                    meta=e.meta,
                )
            )
            counts[e.type] += 1
        s.commit()
    return counts


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--force", action="store_true", help="удалить данные сидера и залить заново")
    args = ap.parse_args()

    settings = get_settings()
    guard_local_db(settings.database_url)

    session_factory = make_session_factory()
    from pragmata.db.models import Event

    with session_factory() as s:
        n_events = s.execute(select(func.count()).select_from(Event)).scalar_one()

    if n_events > 0 and not args.force:
        print(f"в events уже {n_events} строк(и) — нужен --force, чтобы пересидить")
        return 1
    if args.force:
        force_delete(session_factory)

    media = MediaStore(settings.media_dir)
    now = datetime.now(UTC)

    site_created, cameras_created, zone_by_camera = seed_config(session_factory)
    tracks = seed_tracks(session_factory, media, now)
    counts = seed_events(session_factory, media, zone_by_camera, tracks, now)

    n_track_photos = sum(1 for t in tracks if t.best_frame_path)
    print("--- seed_demo: готово ---")
    print(f"site: {'создан' if site_created else 'уже был'}")
    print(f"cameras: {cameras_created} новых из {len(CAMERAS)} (id={SEEDED_CAMERA_IDS})")
    print(f"zones: {len(zone_by_camera)} (по 1 restricted на камеру)")
    print(f"tracks: {len(tracks)}, из них с best_frame_path: {n_track_photos}")
    print(f"events: {sum(counts.values())} всего")
    for t, n in sorted(counts.items()):
        print(f"  {t}: {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
