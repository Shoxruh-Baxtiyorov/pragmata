"""Архив / форензика: загрузка записи → фоновой ретро-анализ → события."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from pragmata.api.schemas import ArchiveJobOut
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


@router.get("/archive/jobs", response_model=list[ArchiveJobOut])
def list_jobs(_: str = Depends(require_auth)) -> list[ArchiveJobOut]:
    return svc.list_jobs()


@router.get("/archive/jobs/{job_id}", response_model=ArchiveJobOut)
def get_job(job_id: uuid.UUID, _: str = Depends(require_auth)) -> ArchiveJobOut:
    return svc.get_job(job_id)
