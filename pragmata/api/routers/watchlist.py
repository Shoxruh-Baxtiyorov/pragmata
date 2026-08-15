"""Реестр людей (L2): сотрудники/гости/наблюдение/бан. Эталон лица — из фото
(регистрация) или у существующего трека."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from pragmata.api.deps import safe_file, session_factory
from pragmata.api.schemas import (
    OkOut,
    PersonCategoryIn,
    PersonCreate,
    PersonFolderIn,
    PersonFolderPatch,
    PersonOut,
    PersonPatch,
    PersonPhotoOut,
)
from pragmata.api.security import Principal, current_principal, current_scope, require_auth
from pragmata.config import get_settings
from pragmata.services import person_org_service as org
from pragmata.services import watchlist_service as svc

router = APIRouter(prefix="/api/v1", tags=["people"])

MAX_PHOTOS = 8  # разумный потолок на один запрос (защита от заливки гигабайтов)


@router.get("/persons", response_model=list[PersonOut])
def persons(
    category: str | None = None,
    folder_id: uuid.UUID | None = None,
    scope: int | None = Depends(current_scope),
) -> list[PersonOut]:
    return svc.list_persons(category, scope=scope, folder_id=folder_id)


# ── папки (дерево) и категории людей ─────────────────────────────────────────


@router.get("/person-folders", response_model=list[dict[str, object]])
def person_folders(scope: int | None = Depends(current_scope)) -> list[dict[str, object]]:
    return org.list_folders(scope)


@router.post("/person-folders", response_model=dict)
def create_folder(
    payload: PersonFolderIn, scope: int | None = Depends(current_scope)
) -> dict[str, object]:
    return org.create_folder(payload.name, payload.parent_id, scope)


@router.patch("/person-folders/{folder_id}", response_model=OkOut)
def patch_folder(
    folder_id: uuid.UUID, payload: PersonFolderPatch, scope: int | None = Depends(current_scope)
) -> OkOut:
    org.patch_folder(
        folder_id,
        scope,
        name=payload.name,
        parent_id=payload.parent_id,
        clear_parent=payload.clear_parent,
    )
    return OkOut()


@router.delete("/person-folders/{folder_id}", response_model=OkOut)
def delete_folder(folder_id: uuid.UUID, scope: int | None = Depends(current_scope)) -> OkOut:
    org.delete_folder(folder_id, scope)
    return OkOut()


@router.get("/person-categories", response_model=list[dict[str, object]])
def person_categories(scope: int | None = Depends(current_scope)) -> list[dict[str, object]]:
    return org.list_categories(scope)


@router.post("/person-categories", response_model=dict)
def create_category(
    payload: PersonCategoryIn, scope: int | None = Depends(current_scope)
) -> dict[str, object]:
    return org.create_category(payload.name, scope)


@router.delete("/person-categories/{cat_id}", response_model=OkOut)
def delete_category(cat_id: uuid.UUID, scope: int | None = Depends(current_scope)) -> OkOut:
    org.delete_category(cat_id, scope)
    return OkOut()


@router.post("/persons", response_model=dict)
def create(payload: PersonCreate, p: Principal = Depends(current_principal)) -> dict[str, str]:
    return {"id": str(svc.create_person(payload, site_id=p.site_id))}


@router.post("/persons/enroll", response_model=dict)
def enroll(
    name: str = Form(...),
    category: str | None = Form(None),
    position: str | None = Form(None),
    note: str | None = Form(None),
    watch: bool = Form(False),
    folder_id: uuid.UUID | None = Form(None),
    files: list[UploadFile] = File(...),
    p: Principal = Depends(current_principal),
) -> dict[str, str]:
    images = [f.file.read() for f in files[:MAX_PHOTOS]]
    pid = svc.enroll_person(
        name, category, position, note, watch, images, site_id=p.site_id, folder_id=folder_id
    )
    return {"id": str(pid)}


@router.patch("/persons/{person_id}", response_model=OkOut)
def patch(
    person_id: uuid.UUID, payload: PersonPatch, p: Principal = Depends(current_principal)
) -> OkOut:
    svc.own_person_or_404(person_id, p.scope)
    svc.patch_person(person_id, payload)
    return OkOut()


@router.delete("/persons/{person_id}", response_model=OkOut)
def remove(person_id: uuid.UUID, p: Principal = Depends(current_principal)) -> OkOut:
    svc.own_person_or_404(person_id, p.scope)
    svc.delete_person(person_id)
    return OkOut()


@router.get("/persons/{person_id}/photos", response_model=list[PersonPhotoOut])
def photos(person_id: uuid.UUID, _: str = Depends(require_auth)) -> list[PersonPhotoOut]:
    return svc.list_photos(person_id)


@router.post("/persons/{person_id}/photos", response_model=dict)
def add_photos(
    person_id: uuid.UUID,
    files: list[UploadFile] = File(...),
    p: Principal = Depends(current_principal),
) -> dict[str, int]:
    images = [f.file.read() for f in files[:MAX_PHOTOS]]
    svc.own_person_or_404(person_id, p.scope)
    return {"added": svc.add_photos(person_id, images)}


@router.delete("/persons/photos/{photo_id}", response_model=OkOut)
def delete_photo(photo_id: uuid.UUID, p: Principal = Depends(current_principal)) -> OkOut:
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
    from pragmata.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
    if p is None or not p.ref_photo_path:
        raise HTTPException(404, "нет фото")
    return FileResponse(
        safe_file(get_settings().media_dir, p.ref_photo_path), media_type="image/jpeg"
    )
