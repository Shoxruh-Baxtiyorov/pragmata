"""Watchlist: именованные люди (L2). Эталон — из существующего трека."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from soqchi.api.deps import safe_file, session_factory
from soqchi.api.schemas import OkOut, PersonCreate, PersonOut, PersonPatch
from soqchi.api.security import require_auth
from soqchi.config import get_settings
from soqchi.services import watchlist_service as svc

router = APIRouter(prefix="/api/v1", tags=["watchlist"])


@router.get("/persons", response_model=list[PersonOut])
def persons(_: str = Depends(require_auth)) -> list[PersonOut]:
    return svc.list_persons()


@router.post("/persons", response_model=dict)
def create(payload: PersonCreate, _: str = Depends(require_auth)) -> dict[str, str]:
    return {"id": str(svc.create_person(payload))}


@router.patch("/persons/{person_id}", response_model=OkOut)
def patch(person_id: uuid.UUID, payload: PersonPatch, _: str = Depends(require_auth)) -> OkOut:
    svc.patch_person(person_id, payload)
    return OkOut()


@router.delete("/persons/{person_id}", response_model=OkOut)
def remove(person_id: uuid.UUID, _: str = Depends(require_auth)) -> OkOut:
    svc.delete_person(person_id)
    return OkOut()


@router.get("/persons/{person_id}/photo")
def photo(person_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    from soqchi.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
    if p is None or not p.ref_photo_path:
        raise HTTPException(404, "нет фото")
    return FileResponse(
        safe_file(get_settings().media_dir, p.ref_photo_path), media_type="image/jpeg"
    )
