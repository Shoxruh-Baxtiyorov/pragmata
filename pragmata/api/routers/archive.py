"""Архив / форензика: загрузка записи → фоновой ретро-анализ → события."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from pragmata.api.schemas import ArchiveJobOut, NvrPlaybackIn
from pragmata.api.security import require_auth
from pragmata.services import archive_service as svc

router = APIRouter(prefix="/api/v1", tags=["archive"])

MAX_BYTES = 2 * 1024 * 1024 * 1024  # 2 ГБ на один файл записи


@router.post("/archive/analyze", response_model=dict)
def analyze(
    recorded_at: str = Form(...),  # ISO-время начала записи, напр. 2026-07-05T02:00:00
    camera_id: str = Form(...),
    file: UploadFile | None = File(None),
    url: str | None = Form(None),  # NVR-playback / RTSP/HTTP-поток вместо файла
    _: str = Depends(require_auth),
) -> dict[str, str]:
    try:
        started = datetime.fromisoformat(recorded_at)
    except ValueError as err:
        raise HTTPException(422, "recorded_at: ISO-дата, напр. 2026-07-05T02:00") from err
    if url and url.strip():
        return {"id": str(svc.create_job(url.strip(), b"", started, camera_id, url=url.strip()))}
    if file is not None:
        data = file.file.read()
        if len(data) > MAX_BYTES:
            raise HTTPException(413, "файл больше 2 ГБ — вырежьте нужный интервал")
        name = file.filename or "recording.mp4"
        return {"id": str(svc.create_job(name, data, started, camera_id))}
    raise HTTPException(422, "нужен файл записи или URL потока")


@router.post("/archive/nvr", response_model=dict)
def analyze_from_nvr(payload: NvrPlaybackIn, _: str = Depends(require_auth)) -> dict[str, str]:
    """Разобрать архив прямо с регистратора: выбираем камеру и интервал.

    Playback-адрес собирается из уже сохранённого живого RTSP камеры (там же
    хост и учётка), поэтому оператору не нужно знать формат ссылки вендора.
    """
    from zoneinfo import ZoneInfo

    from pragmata.api.deps import session_factory
    from pragmata.db.models import Camera, Site
    from pragmata.ingest.nvr import build_playback_url

    with session_factory()() as s:
        cam = s.get(Camera, payload.camera_id)
        if cam is None:
            raise HTTPException(404, "нет такой камеры")
        live_url = cam.url
        site = s.get(Site, 1)
        tz = ZoneInfo(site.timezone if site else "UTC")
    try:
        url = build_playback_url(
            live_url, payload.from_time, payload.to_time, payload.brand, site_tz=tz
        )
    except ValueError as err:
        raise HTTPException(422, str(err)) from err
    name = f"{payload.camera_id} {payload.from_time:%d.%m %H:%M}–{payload.to_time:%H:%M}"
    return {"id": str(svc.create_job(name, b"", payload.from_time, payload.camera_id, url=url))}


@router.get("/archive/jobs", response_model=list[ArchiveJobOut])
def list_jobs(_: str = Depends(require_auth)) -> list[ArchiveJobOut]:
    return svc.list_jobs()


@router.get("/archive/jobs/{job_id}", response_model=ArchiveJobOut)
def get_job(job_id: uuid.UUID, _: str = Depends(require_auth)) -> ArchiveJobOut:
    return svc.get_job(job_id)
