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
    file: UploadFile = File(...),
    recorded_at: str = Form(...),  # ISO-время начала записи, напр. 2026-07-05T02:00:00
    camera_id: str = Form(...),
    _: str = Depends(require_auth),
) -> dict[str, str]:
    try:
        started = datetime.fromisoformat(recorded_at)
    except ValueError as err:
        raise HTTPException(422, "recorded_at: ISO-дата, напр. 2026-07-05T02:00") from err
    data = file.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "файл больше 2 ГБ — вырежьте нужный интервал")
    job_id = svc.create_job(file.filename or "recording.mp4", data, started, camera_id)
    return {"id": str(job_id)}


@router.get("/archive/jobs", response_model=list[ArchiveJobOut])
def list_jobs(_: str = Depends(require_auth)) -> list[ArchiveJobOut]:
    return svc.list_jobs()


@router.get("/archive/jobs/{job_id}", response_model=ArchiveJobOut)
def get_job(job_id: uuid.UUID, _: str = Depends(require_auth)) -> ArchiveJobOut:
    return svc.get_job(job_id)
