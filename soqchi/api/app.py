"""Dashboard API — бэкенд для веб-фронта (и будущего приложения).

Запуск:  uv run uvicorn soqchi.api.app:app --host 127.0.0.1 --port 8088
OpenAPI: http://127.0.0.1:8088/docs

Отдельный процесс от пайплайна: живые кадры берёт из data/live/*.jpg
(пайплайн пишет их атомарно раз в ~2с), события/медиа — из Postgres и data/.
"""

from __future__ import annotations

import secrets
import time
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов резолвит FastAPI в рантайме
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from soqchi.api.schemas import (
    CameraOut,
    DigestOut,
    EventOut,
    EventsPage,
    FeedbackIn,
    FindItem,
    LoginRequest,
    OkOut,
    StatsOut,
    TokenResponse,
    ZoneOut,
)
from soqchi.api.security import create_token, require_auth
from soqchi.config import SiteConfig, get_settings, load_site_config

ONLINE_STALE_S = 15.0  # снапшот старше — камера считается офлайн

app = FastAPI(title="Soqchi AI API", version="0.1.0")

_sf: Any = None
_site_cfg: SiteConfig | None = None
_embedder: Any = None


def sf() -> Any:
    global _sf
    if _sf is None:
        from soqchi.db.session import make_session_factory

        _sf = make_session_factory()
    return _sf


def site_cfg() -> SiteConfig | None:
    global _site_cfg
    if _site_cfg is None:
        path = get_settings().site_config
        if Path(path).exists():
            _site_cfg = load_site_config(path)
    return _site_cfg


settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.api_cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _data_root() -> Path:
    return get_settings().media_dir.parent


def _safe_file(root: Path, rel_or_abs: str) -> Path:
    """Отдаём файлы только из-под доверенного корня (анти-traversal)."""
    root = root.resolve()
    p = Path(rel_or_abs)
    full = (p if p.is_absolute() else root / p).resolve()
    if not str(full).startswith(str(root) + "/") and full != root:
        raise HTTPException(404, "нет такого файла")
    if not full.exists():
        raise HTTPException(404, "нет такого файла")
    return full


def _camera_names() -> dict[str, str]:
    cfg = site_cfg()
    if cfg is not None:
        return {c.id: c.name for c in cfg.cameras}
    from soqchi.db.models import Camera

    with sf()() as s:
        return {c.id: c.name for c in s.execute(select(Camera)).scalars().all()}


# --- auth ---------------------------------------------------------------------


@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest) -> TokenResponse:
    admin_password = get_settings().admin_password
    if not admin_password:
        raise HTTPException(503, "ADMIN_PASSWORD не задан в .env — вход выключен")
    if not secrets.compare_digest(payload.password, admin_password):
        raise HTTPException(401, "неверный пароль")
    return TokenResponse(access_token=create_token())


@app.get("/api/v1/me")
def me(sub: str = Depends(require_auth)) -> dict[str, str]:
    return {"sub": sub}


# --- камеры -------------------------------------------------------------------


@app.get("/api/v1/cameras", response_model=list[CameraOut])
def cameras(_: str = Depends(require_auth)) -> list[CameraOut]:
    cfg = site_cfg()
    live_dir = _data_root() / "live"
    out: list[CameraOut] = []
    cams = (
        [(c.id, c.name, c.zones) for c in cfg.cameras]
        if cfg is not None
        else [(cid, name, []) for cid, name in _camera_names().items()]
    )
    now = time.time()
    for cam_id, name, zones in cams:
        snap = live_dir / f"{cam_id}.jpg"
        online = snap.exists() and (now - snap.stat().st_mtime) < ONLINE_STALE_S
        out.append(
            CameraOut(
                id=cam_id,
                name=name,
                online=online,
                snapshot_url=f"/api/v1/cameras/{cam_id}/snapshot" if snap.exists() else None,
                zones=[ZoneOut(name=z.name, type=z.type, polygon=list(z.polygon)) for z in zones],
            )
        )
    return out


@app.get("/api/v1/cameras/{camera_id}/snapshot")
def snapshot(camera_id: str, _: str = Depends(require_auth)) -> FileResponse:
    path = _safe_file(_data_root() / "live", f"{camera_id}.jpg")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "no-store"})


# --- события ------------------------------------------------------------------


def _event_out(ev: Any, names: dict[str, str]) -> EventOut:
    return EventOut(
        id=ev.id,
        camera_id=ev.camera_id,
        camera=names.get(ev.camera_id, ev.camera_id),
        type=ev.type,
        severity=ev.severity,
        zone=ev.zone,
        t_start=ev.t_start,
        t_end=ev.t_end,
        duration_s=ev.duration_s,
        description=ev.description,
        people_in_zone=ev.meta.get("people_in_zone"),
        photo_url=f"/api/v1/events/{ev.id}/photo" if ev.frame_path else None,
        face_url=f"/api/v1/events/{ev.id}/face" if ev.face_path else None,
        clip_url=f"/api/v1/events/{ev.id}/clip" if ev.clip_path else None,
    )


@app.get("/api/v1/events", response_model=EventsPage)
def events(
    hours: float = Query(24, gt=0, le=24 * 30),
    camera_id: str | None = None,
    type: str | None = None,  # noqa: A002 — имя из контракта API
    severity: str | None = None,
    zone: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: str = Depends(require_auth),
) -> EventsPage:
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
    names = _camera_names()
    with sf()() as s:
        total = s.execute(select(func.count()).select_from(q.subquery())).scalar_one()
        rows = (
            s.execute(q.order_by(Event.t_start.desc()).limit(limit).offset(offset)).scalars().all()
        )
        return EventsPage(total=total, items=[_event_out(ev, names) for ev in rows])


def _event_media(event_id: uuid.UUID, kind: str) -> FileResponse:
    from soqchi.db.models import Event

    with sf()() as s:
        ev = s.get(Event, event_id)
    if ev is None:
        raise HTTPException(404, "нет такого события")
    if kind == "clip":
        path = ev.clip_path
        root = _data_root() / "clips"
        media_type = "video/mp4"
    else:
        path = ev.frame_path if kind == "photo" else ev.face_path
        root = get_settings().media_dir
        media_type = "image/jpeg"
    if not path:
        raise HTTPException(404, f"у события нет {kind}")
    return FileResponse(_safe_file(root, path), media_type=media_type)


@app.get("/api/v1/events/{event_id}/photo")
def event_photo(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return _event_media(event_id, "photo")


@app.get("/api/v1/events/{event_id}/face")
def event_face(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return _event_media(event_id, "face")


@app.get("/api/v1/events/{event_id}/clip")
def event_clip(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return _event_media(event_id, "clip")


@app.post("/api/v1/events/{event_id}/feedback", response_model=OkOut)
def event_feedback(
    event_id: uuid.UUID, payload: FeedbackIn, _: str = Depends(require_auth)
) -> OkOut:
    if payload.verdict not in ("false_positive", "confirmed"):
        raise HTTPException(422, "verdict: false_positive | confirmed")
    from soqchi.db.queries import save_feedback

    save_feedback(sf(), event_id, chat_id=0, verdict=payload.verdict)  # chat_id=0 = web
    return OkOut()


# --- сводки -------------------------------------------------------------------


@app.get("/api/v1/stats", response_model=StatsOut)
def stats(hours: float = Query(24, gt=0, le=24 * 30), _: str = Depends(require_auth)) -> StatsOut:
    cfg = site_cfg()
    if cfg is None:
        raise HTTPException(503, "SITE_CONFIG не найден")
    from soqchi.agent.tools import AgentTools

    return StatsOut(**AgentTools(sf(), cfg, None).stats(hours=hours))


@app.get("/api/v1/digest", response_model=DigestOut)
def digest(hours: int = Query(24, gt=0, le=24 * 7), _: str = Depends(require_auth)) -> DigestOut:
    cfg = site_cfg()
    if cfg is None:
        raise HTTPException(503, "SITE_CONFIG не найден")
    from soqchi.digest import build_digest_text

    return DigestOut(text=build_digest_text(sf(), cfg, hours=hours))


# --- investigation (за флагом: CLIP в API-процессе = ещё ~600МБ RAM) -----------


@app.get("/api/v1/find", response_model=list[FindItem])
def find(
    description: str = Query(min_length=3),
    hours: int = Query(48, gt=0, le=24 * 14),
    _: str = Depends(require_auth),
) -> list[FindItem]:
    s = get_settings()
    if not s.api_enable_find:
        raise HTTPException(501, "поиск в API выключен (API_ENABLE_FIND=1 включает)")
    from soqchi.investigation import find_people, has_negation

    if has_negation(description):
        raise HTTPException(422, "опишите положительным признаком (bald, а не 'no hair')")
    global _embedder
    if _embedder is None:
        from soqchi.perception.embedder import ClipEmbedder

        _embedder = ClipEmbedder()
    names = _camera_names()
    found = find_people(sf(), _embedder, description, hours=hours, min_margin=s.find_min_margin)
    return [
        FindItem(
            time=t.started_at,
            camera=names.get(t.camera_id, t.camera_id),
            similarity=round(sim, 3),
            photo_url=f"/api/v1/tracks/{t.id}/photo" if t.best_frame_path else None,
        )
        for t, sim in found
    ]


@app.get("/api/v1/tracks/{track_id}/photo")
def track_photo(track_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    from soqchi.db.models import Track

    with sf()() as s:
        t = s.get(Track, track_id)
    if t is None or not t.best_frame_path:
        raise HTTPException(404, "нет фото трека")
    return FileResponse(
        _safe_file(get_settings().media_dir, t.best_frame_path), media_type="image/jpeg"
    )
