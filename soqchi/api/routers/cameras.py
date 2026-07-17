"""Камеры: список с online-статусом и зонами + живые снапшоты."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from soqchi.api.schemas import CameraOut
from soqchi.api.security import require_auth
from soqchi.services import events_service as svc

router = APIRouter(prefix="/api/v1", tags=["cameras"])


@router.get("/cameras", response_model=list[CameraOut])
def cameras(_: str = Depends(require_auth)) -> list[CameraOut]:
    return svc.list_cameras()


@router.get("/cameras/{camera_id}/snapshot")
def snapshot(camera_id: str, _: str = Depends(require_auth)) -> FileResponse:
    return svc.snapshot_file(camera_id)
