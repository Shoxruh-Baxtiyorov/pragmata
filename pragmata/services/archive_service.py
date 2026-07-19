"""Задачи ретро-анализа: сохранить запись, запустить фоновую обработку, статус."""

from __future__ import annotations

import threading
import time
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import HTTPException

from pragmata.api.deps import session_factory
from pragmata.config import get_settings

if TYPE_CHECKING:
    from datetime import datetime

    from pragmata.api.schemas import ArchiveJobOut

_PROGRESS_EVERY = 2.0  # не чаще раза в 2с пишем прогресс в БД


def _set(job_id: uuid.UUID, **fields: object) -> None:
    from pragmata.db.models import ArchiveJob

    with session_factory()() as s:
        job = s.get(ArchiveJob, job_id)
        if job is None:
            return
        for k, v in fields.items():
            setattr(job, k, v)
        s.commit()


def _run(job_id: uuid.UUID, file_path: str, base_ts: float, camera_id: str) -> None:
    from pragmata.archive import run_archive_job

    _set(job_id, status="running")
    last = 0.0

    def on_progress(p: float) -> None:
        nonlocal last
        now = time.time()
        if now - last >= _PROGRESS_EVERY or p >= 1.0:
            last = now
            _set(job_id, progress=round(p, 3))

    try:
        found = run_archive_job(file_path, base_ts, camera_id, on_progress=on_progress)
        _set(job_id, status="done", progress=1.0, events_found=found)
    except Exception as e:  # noqa: BLE001 — падение задачи не должно ронять API
        _set(job_id, status="error", error=str(e)[:500])


def create_job(
    filename: str, data: bytes, recorded_at: datetime, camera_id: str
) -> uuid.UUID:
    from pragmata.db.models import ArchiveJob

    if not data:
        raise HTTPException(422, "пустой файл")
    if not camera_id.strip():
        raise HTTPException(422, "укажите камеру записи")

    job_id = uuid.uuid4()
    root = get_settings().media_dir / "archive"
    root.mkdir(parents=True, exist_ok=True)
    safe_name = Path(filename).name or "recording.mp4"
    path = root / f"{job_id.hex}_{safe_name}"
    path.write_bytes(data)

    with session_factory()() as s:
        s.add(
            ArchiveJob(
                id=job_id,
                filename=safe_name,
                file_path=str(path),
                camera_id=camera_id.strip(),
                recorded_at=recorded_at,
            )
        )
        s.commit()

    threading.Thread(
        target=_run,
        args=(job_id, str(path), recorded_at.timestamp(), camera_id.strip()),
        name=f"archive-{job_id.hex[:8]}",
        daemon=True,
    ).start()
    return job_id


def _to_out(job: object) -> ArchiveJobOut:
    from pragmata.api.schemas import ArchiveJobOut

    return ArchiveJobOut(
        id=job.id,  # type: ignore[attr-defined]
        filename=job.filename,  # type: ignore[attr-defined]
        camera_id=job.camera_id,  # type: ignore[attr-defined]
        recorded_at=job.recorded_at,  # type: ignore[attr-defined]
        status=job.status,  # type: ignore[attr-defined]
        progress=job.progress,  # type: ignore[attr-defined]
        events_found=job.events_found,  # type: ignore[attr-defined]
        error=job.error,  # type: ignore[attr-defined]
        created_at=job.created_at,  # type: ignore[attr-defined]
    )


def list_jobs() -> list[ArchiveJobOut]:
    from sqlalchemy import select

    from pragmata.db.models import ArchiveJob

    with session_factory()() as s:
        jobs = s.execute(select(ArchiveJob).order_by(ArchiveJob.created_at.desc())).scalars().all()
        return [_to_out(j) for j in jobs]


def get_job(job_id: uuid.UUID) -> ArchiveJobOut:
    from pragmata.db.models import ArchiveJob

    with session_factory()() as s:
        job = s.get(ArchiveJob, job_id)
        if job is None:
            raise HTTPException(404, "нет такой задачи")
        return _to_out(job)
