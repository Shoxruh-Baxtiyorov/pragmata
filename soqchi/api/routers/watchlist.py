"""Реестр людей (L2): сотрудники/гости/наблюдение/бан. Эталон лица — из фото
(регистрация) или у существующего трека."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from soqchi.api.deps import safe_file, session_factory
from soqchi.api.schemas import OkOut, PersonCreate, PersonOut, PersonPatch, PersonPhotoOut
from soqchi.api.security import require_auth
from soqchi.config import get_settings
from soqchi.services import watchlist_service as svc

router = APIRouter(prefix="/api/v1", tags=["people"])

MAX_PHOTOS = 8  # разумный потолок на один запрос (защита от заливки гигабайтов)


@router.get("/persons", response_model=list[PersonOut])
def persons(category: str | None = None, _: str = Depends(require_auth)) -> list[PersonOut]:
    return svc.list_persons(category)


@router.post("/persons", response_model=dict)
def create(payload: PersonCreate, _: str = Depends(require_auth)) -> dict[str, str]:
    return {"id": str(svc.create_person(payload))}


@router.post("/persons/enroll", response_model=dict)
def enroll(
    name: str = Form(...),
    category: str = Form("employee"),
    position: str | None = Form(None),
    note: str | None = Form(None),
    watch: bool = Form(False),
    files: list[UploadFile] = File(...),
    _: str = Depends(require_auth),
) -> dict[str, str]:
    images = [f.file.read() for f in files[:MAX_PHOTOS]]
    pid = svc.enroll_person(name, category, position, note, watch, images)
    return {"id": str(pid)}


@router.patch("/persons/{person_id}", response_model=OkOut)
def patch(person_id: uuid.UUID, payload: PersonPatch, _: str = Depends(require_auth)) -> OkOut:
    svc.patch_person(person_id, payload)
    return OkOut()


@router.delete("/persons/{person_id}", response_model=OkOut)
def remove(person_id: uuid.UUID, _: str = Depends(require_auth)) -> OkOut:
    svc.delete_person(person_id)
    return OkOut()


@router.get("/persons/{person_id}/photos", response_model=list[PersonPhotoOut])
def photos(person_id: uuid.UUID, _: str = Depends(require_auth)) -> list[PersonPhotoOut]:
    return svc.list_photos(person_id)


@router.post("/persons/{person_id}/photos", response_model=dict)
def add_photos(
    person_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    _: str = Depends(require_auth),
) -> dict[str, int]:
    images = [f.file.read() for f in files[:MAX_PHOTOS]]
    return {"added": svc.add_photos(person_id, images)}


@router.delete("/persons/photos/{photo_id}", response_model=OkOut)
def delete_photo(photo_id: uuid.UUID, _: str = Depends(require_auth)) -> OkOut:
    svc.delete_photo(photo_id)
    return OkOut()


@router.get("/persons/photos/{photo_id}/image")
def photo_image(photo_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    path = svc.photo_path(photo_id)
    if path is None:
        raise HTTPException(404, "нет фото")
    return FileResponse(safe_file(get_settings().media_dir, path), media_type="image/jpeg")


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
