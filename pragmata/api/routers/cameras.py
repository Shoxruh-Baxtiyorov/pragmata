"""Камеры: список/снапшот + управление (CRUD камер и зон).

Мультиарендность: клиент видит и настраивает ТОЛЬКО камеры своей организации —
настраивать чужой объект за клиента не должен никто. Платформенный админ
(scope=None) видит все организации. Чужая камера отдаётся как 404, а не 403:
403 подтвердил бы сам факт её существования.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from pragmata.api.schemas import CameraIn, CameraOut, CameraPatch, OkOut, ZoneIn
from pragmata.api.security import Principal, current_principal, current_scope, own_camera_or_404
from pragmata.services import config_service as cfgsvc
from pragmata.services import events_service as svc

router = APIRouter(prefix="/api/v1", tags=["cameras"])


@router.get("/cameras", response_model=list[CameraOut])
def cameras(
    all: bool = False,  # noqa: A002
    scope: int | None = Depends(current_scope),
) -> list[CameraOut]:
    return svc.list_cameras(include_disabled=all, scope=scope)


@router.get("/cameras/{camera_id}/snapshot")
def snapshot(camera_id: str, scope: int | None = Depends(current_scope)) -> FileResponse:
    own_camera_or_404(camera_id, scope)
    return svc.snapshot_file(camera_id)


@router.post("/cameras", response_model=OkOut)
def create(payload: CameraIn, p: Principal = Depends(current_principal)) -> OkOut:
    """Клиент заводит камеру себе. Админ без организации — некому: 422."""
    site_id = p.site_id
    if site_id is None:
        raise HTTPException(422, "выберите организацию: платформенный админ не владеет камерами")
    cfgsvc.create_camera(payload, site_id=site_id)
    return OkOut()


@router.patch("/cameras/{camera_id}", response_model=OkOut)
def patch(
    camera_id: str, payload: CameraPatch, scope: int | None = Depends(current_scope)
) -> OkOut:
    own_camera_or_404(camera_id, scope)
    cfgsvc.patch_camera(camera_id, payload)
    return OkOut()


@router.delete("/cameras/{camera_id}", response_model=OkOut)
def remove(camera_id: str, scope: int | None = Depends(current_scope)) -> OkOut:
    own_camera_or_404(camera_id, scope)
    cfgsvc.delete_camera(camera_id)
    return OkOut()


@router.post("/cameras/{camera_id}/zones", response_model=dict)
def add_zone(
    camera_id: str, payload: ZoneIn, scope: int | None = Depends(current_scope)
) -> dict[str, str]:
    own_camera_or_404(camera_id, scope)
    return {"id": str(cfgsvc.add_zone(camera_id, payload))}


@router.delete("/zones/{zone_id}", response_model=OkOut)
def delete_zone(zone_id: uuid.UUID, scope: int | None = Depends(current_scope)) -> OkOut:
    cfgsvc.delete_zone(zone_id, scope=scope)
    return OkOut()
