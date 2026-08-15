"""Витринные демо-данные для БОГАТЫХ скриншотов дашборда.

Наполняет БД разнообразными СВЕЖИМИ событиями всех модулей аналитики + именами
для журнала Face ID, переиспользуя реальные кадры/лица из data/media. Показывает
каталог 19 модулей, ленту событий, статистику и журнал «живыми».

    uv run python scripts/seed_showcase.py            # залить витрину
    uv run python scripts/seed_showcase.py --reset     # удалить только витринные строки

Безопасность: работает ТОЛЬКО на локальной БД (127.0.0.1/localhost); не трогает
чужие строки — сеет с меткой meta.seed="showcase" и по фикс-списку имён; reset
удаляет ровно их. Никаких TRUNCATE/DROP.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import shutil
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import delete, select, update
from sqlalchemy.engine import make_url

sys.path.insert(0, str(Path(__file__).parent.parent))

from pragmata.config import get_settings  # noqa: E402
from pragmata.db.models import Camera, Event, Person, Track  # noqa: E402
from pragmata.db.session import make_session_factory  # noqa: E402
from pragmata.rules.engine import SEVERITY  # noqa: E402

RNG = random.Random(2026)
SEED = "showcase"

# активные камеры сайта 1 → чистые демо-имена + тематика событий
CAM_RENAME = {"cam8": "Kirish (Face ID)", "phone": "Ombor", "pub_brela": "Avtoturargoh"}
CAM_KIRISH, CAM_OMBOR, CAM_PARK = "cam8", "phone", "pub_brela"

ZONES = ["Kirish zonasi", "Ombor zonasi", "Avtoturargoh", "Kassa zonasi",
         "Ish joyi", "Yuklash zonasi", "Xavfli zona"]

# именованные люди для журнала Face ID (reset удаляет ровно этот список по имени)
PEOPLE = [
    ("Aziz Karimov", "employee", "Qorovul"), ("Dilnoza Yusupova", "employee", "Menejer"),
    ("Sardor Rahimov", "employee", "Omborchi"), ("Nodira Islomova", "employee", "Kassir"),
    ("Javohir Sobirov", "employee", "Muhandis"), ("Malika Aliyeva", "visitor", None),
    ("Jasur Toshev", "visitor", None), ("Kamola Yo'ldosheva", "visitor", None),
    ("Bekzod Sattorov", "contractor", "Yetkazib beruvchi"),
    ("Rustam Qodirov", "contractor", "Ta'mirlash"),
    ("Noma'lum shaxs", "watchlist", None), ("Oybek Nazarov", "employee", "Elektrik"),
]
PLATES = ["01A123BC", "30 777 AAA", "40G500DD", "01B456MN", "95K012OP", "10E345TR"]

# (тип, сколько, предпочитаемая камера, нужно_лицо, зона?, шаблон описания)
SPEC: list[tuple[str, int, str, bool, bool, str | None]] = [
    ("person_recognized", 16, CAM_KIRISH, True, False, None),
    ("person_entered", 14, CAM_KIRISH, True, False, None),
    ("person_exited", 12, CAM_KIRISH, False, False, None),
    ("plate_recognized", 11, CAM_PARK, False, False, "Davlat raqami {plate}"),
    ("plate_unlisted", 4, CAM_PARK, False, False, "Davlat raqami {plate} — ro'yxatda yo'q"),
    ("illegal_parking", 6, CAM_PARK, False, True, "Belgi ostida {mins} daqiqa turibdi"),
    ("vehicle_seen", 7, CAM_PARK, False, False, "Kadrda transport"),
    ("crowd_gathering", 6, CAM_KIRISH, False, True, "To'planish: {n} kishi"),
    ("queue_buildup", 5, CAM_KIRISH, False, True, "Navbat: {n} kishi"),
    ("danger_zone_presence", 4, CAM_OMBOR, False, True, "Xavfli zonada odam"),
    ("abandoned_object", 4, CAM_KIRISH, False, True, "Egasiz qoldirilgan sumka"),
    ("ppe_violation", 7, CAM_OMBOR, False, True, "Ish zonasida kaska/jilet yo'q"),
    ("hygiene_violation", 4, CAM_OMBOR, False, True, "Qo'lqop/qalpoqsiz"),
    ("fire_smoke", 2, CAM_OMBOR, False, True, "Zonada tutun"),
    ("package_damage", 4, CAM_OMBOR, False, True, "Lentada shikastlangan qadoq"),
    ("equipment_idle", 5, CAM_OMBOR, False, False, "Texnika {mins} daqiqa bo'sh turibdi"),
    ("loading_activity", 4, CAM_OMBOR, False, True, "Zonada yuklash"),
    ("zone_intrusion", 8, CAM_KIRISH, False, True, None),
    ("loitering", 5, CAM_KIRISH, False, True, "Zonada chegaradan uzoq turish"),
    ("after_hours_presence", 6, CAM_KIRISH, False, False, "Ish vaqtidan tashqari mavjudlik"),
    ("weapon_detected", 1, CAM_KIRISH, False, True, "Qurolga o'xshash buyum"),
]


def write_heatmaps(media: Path, cams: list[str]) -> None:
    """Реалистичная тепловая сетка 48×27 (амбиент + 2–3 горячие точки) на камеру."""
    w, h = 48, 27
    root = media / "heatmap"
    root.mkdir(parents=True, exist_ok=True)
    for cam in cams:
        grid = [[RNG.uniform(0, 3) for _ in range(w)] for _ in range(h)]
        for _ in range(RNG.randint(2, 3)):
            cx, cy = RNG.uniform(w * 0.2, w * 0.8), RNG.uniform(h * 0.25, h * 0.8)
            peak, sig = RNG.uniform(70, 130), RNG.uniform(3, 6)
            for y in range(h):
                for x in range(w):
                    d2 = (x - cx) ** 2 + (y - cy) ** 2
                    grid[y][x] += peak * math.exp(-d2 / (2 * sig * sig))
        out = [[round(v, 1) for v in row] for row in grid]
        (root / f"{cam}.json").write_text(json.dumps({"w": w, "h": h, "grid": out}))


def guard_local(db_url: str) -> None:
    host = make_url(db_url).host
    if host not in ("127.0.0.1", "localhost"):
        sys.exit(f"отказ: сидер работает только на локальной БД (host={host!r})")


def recent_ts(now: datetime) -> datetime:
    """Свежая метка: ~45% сегодня, остальное — последние 6 дней (для живых графиков)."""
    day = 0 if RNG.random() < 0.45 else RNG.randint(1, 6)
    return now - timedelta(days=day, hours=RNG.randint(0, 22), minutes=RNG.randint(0, 59))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()

    s = get_settings()
    guard_local(s.database_url)
    sf = make_session_factory()
    media = s.media_dir
    names = [p[0] for p in PEOPLE]

    if args.reset:
        with sf() as db:
            db.execute(delete(Track).where(Track.meta["seed"].astext == SEED))
            db.execute(delete(Event).where(Event.meta["seed"].astext == SEED))
            db.execute(delete(Person).where(Person.name.in_(names)))
            db.commit()
        for cid in CAM_RENAME:
            (s.media_dir / "heatmap" / f"{cid}.json").unlink(missing_ok=True)
        print("витринные строки удалены")
        return 0

    frames = [str(p.relative_to(media)) for p in media.rglob("event_*.jpg")]
    faces = [str(p.relative_to(media)) for p in media.rglob("face_*.jpg")]
    if not frames:
        sys.exit("нет кадров в data/media — сначала прогони пайплайн/seed_demo")
    RNG.shuffle(frames)
    RNG.shuffle(faces)
    now = datetime.now(UTC)

    with sf() as db:
        active = {c.id for c in db.execute(
            select(Camera).where(Camera.site_id == 1, Camera.deleted.is_(False))
        ).scalars()}
        cams = [c for c in (CAM_KIRISH, CAM_OMBOR, CAM_PARK) if c in active]
        if not cams:
            sys.exit("нет активных камер сайта 1")

        # чистые демо-имена камер
        for cid, nm in CAM_RENAME.items():
            if cid in active:
                db.execute(update(Camera).where(Camera.id == cid).values(name=nm))

        # именованные люди (журнал Face ID)
        existing_rows = db.execute(select(Person).where(Person.name.in_(names))).scalars()
        existing = {p.name for p in existing_rows}
        persons: list[Person] = []
        for nm, cat, pos in PEOPLE:
            if nm in existing:
                continue
            p = Person(id=uuid.uuid4(), site_id=1, name=nm, category=cat,
                       position=pos, watch=(cat == "watchlist"),
                       ref_photo_path=(RNG.choice(faces) if faces else None))
            db.add(p)
            persons.append(p)
        db.flush()
        all_persons = list(db.execute(select(Person).where(Person.name.in_(names))).scalars())

        n_ev = 0
        for etype, cnt, pref_cam, need_face, has_zone, tmpl in SPEC:
            for _ in range(cnt):
                cam = pref_cam if (pref_cam in cams and RNG.random() < 0.8) else RNG.choice(cams)
                ts = recent_ts(now)
                dur = round(RNG.uniform(2, 40), 1)
                meta: dict[str, object] = {"seed": SEED}
                desc = tmpl
                if etype in ("plate_recognized", "plate_unlisted"):
                    pl = "".join(ch for ch in RNG.choice(PLATES) if ch.isalnum())
                    meta["plate"] = pl
                    meta["whitelisted"] = etype == "plate_recognized"
                    desc = (tmpl or "").format(plate=pl)
                elif etype in ("crowd_gathering", "queue_buildup"):
                    n = RNG.randint(4, 12)
                    meta["people_in_zone"] = n
                    desc = (tmpl or "").format(n=n)
                elif etype in ("illegal_parking", "equipment_idle"):
                    secs = RNG.randint(120, 1800)
                    meta["idle_s"] = secs
                    desc = (tmpl or "").format(mins=secs // 60)
                elif etype == "person_recognized":
                    meta["person"] = RNG.choice(all_persons).name

                db.add(Event(
                    id=uuid.uuid4(), site_id=1, camera_id=cam, type=etype,
                    severity=SEVERITY.get(etype, "info"),
                    zone=RNG.choice(ZONES) if has_zone else None,
                    t_start=ts, t_end=ts + timedelta(seconds=dur), duration_s=dur,
                    frame_path=RNG.choice(frames),
                    face_path=(RNG.choice(faces) if (need_face and faces) else None),
                    description=desc, source="live", meta=meta,
                ))
                n_ev += 1

        # треки для журнала вход/выход (часть — с именами, часть — «Неизвестный»)
        n_tr = 0
        for _ in range(46):
            cam = RNG.choice(cams)
            ts = recent_ts(now)
            named = RNG.random() < 0.65
            db.add(Track(
                id=uuid.uuid4(), camera_id=cam, track_id=RNG.randint(1, 9999),
                started_at=ts, ended_at=ts + timedelta(seconds=RNG.randint(4, 90)),
                frames=RNG.randint(8, 200),
                best_frame_path=RNG.choice(frames),
                face_crop_path=(RNG.choice(faces) if faces else None),
                person_id=(RNG.choice(all_persons).id if named else None),
                meta={"seed": SEED},
            ))
            n_tr += 1

        db.commit()

    # свежие live-снапшоты → камеры «online» с реальным кадром на стене
    live = media.parent / "live"
    live.mkdir(parents=True, exist_ok=True)
    for cam in cams:
        src = media / frames[RNG.randrange(len(frames))]
        if src.exists():
            shutil.copyfile(src, live / f"{cam}.jpg")

    # тепловые карты для страницы «Тепловая карта»
    write_heatmaps(media, cams)

    print(f"витрина залита: {n_ev} событий, {len(persons)} новых людей, {n_tr} треков, "
          f"камеры={cams}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
