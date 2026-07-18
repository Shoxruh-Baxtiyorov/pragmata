"""Камеры: список/снапшот + управление (CRUD камер и зон) — правки живо перезагружают пайплайн."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from soqchi.api.schemas import CameraIn, CameraOut, CameraPatch, OkOut, ZoneIn
from soqchi.api.security import require_auth
from soqchi.services import config_service as cfgsvc
from soqchi.services import events_service as svc

router = APIRouter(prefix="/api/v1", tags=["cameras"])


@router.get("/cameras", response_model=list[CameraOut])
def cameras(all: bool = False, _: str = Depends(require_auth)) -> list[CameraOut]:  # noqa: A002
    return svc.list_cameras(include_disabled=all)


@router.get("/cameras/{camera_id}/snapshot")
def snapshot(camera_id: str, _: str = Depends(require_auth)) -> FileResponse:
    return svc.snapshot_file(camera_id)


@router.post("/cameras", response_model=OkOut)
def create(payload: CameraIn, _: str = Depends(require_auth)) -> OkOut:
    cfgsvc.create_camera(payload)
    return OkOut()


@router.patch("/cameras/{camera_id}", response_model=OkOut)
def patch(camera_id: str, payload: CameraPatch, _: str = Depends(require_auth)) -> OkOut:
    cfgsvc.patch_camera(camera_id, payload)
    return OkOut()


@router.delete("/cameras/{camera_id}", response_model=OkOut)
def remove(camera_id: str, _: str = Depends(require_auth)) -> OkOut:
    cfgsvc.delete_camera(camera_id)
    return OkOut()


@router.post("/cameras/{camera_id}/zones", response_model=dict)
def add_zone(camera_id: str, payload: ZoneIn, _: str = Depends(require_auth)) -> dict[str, str]:
    zid = cfgsvc.add_zone(camera_id, payload)
    return {"id": str(zid)}


@router.delete("/zones/{zone_id}", response_model=OkOut)
def delete_zone(zone_id: uuid.UUID, _: str = Depends(require_auth)) -> OkOut:
    cfgsvc.delete_zone(zone_id)
    return OkOut()
