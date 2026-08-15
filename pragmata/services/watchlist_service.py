"""Реестр людей: сотрудники/гости/наблюдение/бан. Эталон лица — усреднённый по
нескольким загруженным фото (insightface), либо взятый у существующего трека."""

from __future__ import annotations

import time
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from typing import TYPE_CHECKING

import cv2
import numpy as np
from fastapi import HTTPException
from sqlalchemy import func, select

from pragmata.api.deps import session_factory
from pragmata.config import get_settings
from pragmata.media import MediaStore

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from pragmata.api.schemas import PersonCreate, PersonOut, PersonPatch, PersonPhotoOut
    from pragmata.db.models import Person
    from pragmata.perception.face_recog import FaceRecognizer

CATEGORIES = ("employee", "visitor", "contractor", "watchlist", "banned", "other")

_recognizer_cache: FaceRecognizer | None = None


def _recognizer() -> FaceRecognizer:
    """Ленивый insightface в процессе API (для регистрации по фото)."""
    global _recognizer_cache
    if _recognizer_cache is None:
        from pragmata.perception.face_recog import FaceRecognizer

        _recognizer_cache = FaceRecognizer(get_settings().models_dir, enabled=True)
    return _recognizer_cache


def _media() -> MediaStore:
    return MediaStore(get_settings().media_dir)


def _avg_norm(embs: list[list[float]]) -> list[float] | None:
    """Усреднить L2-нормированные эмбеддинги и снова нормировать → эталон лица."""
    if not embs:
        return None
    arr = np.asarray(embs, dtype=np.float32)
    mean = arr.mean(axis=0)
    norm = float(np.linalg.norm(mean))
    if norm == 0:
        return None
    return [float(x) for x in (mean / norm)]


def _embed_upload(data: bytes) -> tuple[np.ndarray, list[float] | None]:
    """Декодировать загруженный файл → (изображение, эмбеддинг лица|None)."""
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(422, "не удалось прочитать изображение")
    return img, _recognizer().embed_largest(img)


def _photo_embs(s: Session, person_id: uuid.UUID) -> list[list[float]]:
    from pragmata.db.models import PersonPhoto

    rows = (
        s.execute(
            select(PersonPhoto.face_emb).where(
                PersonPhoto.person_id == person_id, PersonPhoto.face_emb.is_not(None)
            )
        )
        .scalars()
        .all()
    )
    return [list(e) for e in rows if e is not None]


def _recompute_face(s: Session, person: Person) -> None:
    """Пересчитать усреднённый face_emb человека по его фото."""
    person.face_emb = _avg_norm(_photo_embs(s, person.id))


def own_person_or_404(person_id: uuid.UUID, scope: int | None) -> None:
    """Человек чужой организации = как будто его нет (404, а не 403)."""
    from fastapi import HTTPException

    from pragmata.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
    if p is None or (scope is not None and p.site_id != scope):
        raise HTTPException(404, "нет такого человека")


def list_persons(
    category: str | None = None,
    scope: int | None = None,
    folder_id: uuid.UUID | None = None,
) -> list[PersonOut]:
    from pragmata.api.schemas import PersonOut
    from pragmata.db.models import Person, PersonPhoto, Track
    from pragmata.services import person_org_service

    with session_factory()() as s:
        q = select(Person).order_by(Person.created_at.desc())
        if scope is not None:
            q = q.where(Person.site_id == scope)
        if category:
            q = q.where(Person.category == category)
        if folder_id is not None:
            # папка + все её подпапки (напр. «5-е классы» показывает и 5-А, и 5-Б)
            q = q.where(Person.folder_id.in_(person_org_service.subtree_ids(scope, folder_id)))
        persons = s.execute(q).scalars().all()
        seen = {
            r[0]: r[1]
            for r in s.execute(
                select(Track.person_id, func.count())
                .where(Track.person_id.is_not(None))
                .group_by(Track.person_id)
            ).all()
        }
        photos = {
            r[0]: r[1]
            for r in s.execute(
                select(PersonPhoto.person_id, func.count()).group_by(PersonPhoto.person_id)
            ).all()
        }
        return [
            PersonOut(
                id=p.id,
                name=p.name,
                category=p.category,
                folder_id=str(p.folder_id) if p.folder_id else None,
                position=p.position,
                note=p.note,
                watch=p.watch,
                photo_url=f"/api/v1/persons/{p.id}/photo" if p.ref_photo_path else None,
                photo_count=photos.get(p.id, 0),
                seen_count=seen.get(p.id, 0),
            )
            for p in persons
        ]


def enroll_person(
    name: str,
    category: str | None,
    position: str | None,
    note: str | None,
    watch: bool,
    images: list[bytes],
    site_id: int | None = None,
    folder_id: uuid.UUID | None = None,
) -> uuid.UUID:
    """Регистрация человека по фото: детект лица на каждом → усреднённый эталон."""
    from pragmata.db.models import Person, PersonPhoto
    from pragmata.services import person_org_service

    if not name.strip():
        raise HTTPException(422, "имя обязательно")
    category = (category or "").strip() or None
    if category is not None and category not in person_org_service.allowed_category_keys(site_id):
        raise HTTPException(422, "неизвестная категория для этой площадки")
    person_org_service.assert_folder_ok(folder_id, site_id)
    if not images:
        raise HTTPException(422, "нужно хотя бы одно фото")
    if not _recognizer().available:
        raise HTTPException(503, "распознавание лиц недоступно (insightface/модель)")

    media = _media()
    saved: list[tuple[str, list[float]]] = []
    for data in images:
        img, emb = _embed_upload(data)
        if emb is None:
            continue  # на фото не нашли лицо — пропускаем
        path = media.save_jpeg(img, "person", "enroll", _ts())
        saved.append((path, emb))
    if not saved:
        raise HTTPException(422, "ни на одном фото не найдено лицо — загрузите чёткий портрет")

    face_emb = _avg_norm([e for _, e in saved])
    with session_factory()() as s:
        person = Person(
            site_id=site_id,
            name=name.strip(),
            category=category,
            folder_id=folder_id,
            position=(position or None),
            note=(note or None),
            watch=watch,
            face_emb=face_emb,
            ref_photo_path=saved[0][0],
        )
        s.add(person)
        s.flush()
        for path, emb in saved:
            s.add(PersonPhoto(person_id=person.id, path=path, face_emb=emb))
        s.commit()
        return person.id


def add_photos(person_id: uuid.UUID, images: list[bytes]) -> int:
    """Добавить фото к человеку → пересчитать эталон. Возвращает число принятых."""
    from pragmata.db.models import Person, PersonPhoto

    media = _media()
    with session_factory()() as s:
        person = s.get(Person, person_id)
        if person is None:
            raise HTTPException(404, "нет такого человека")
        added = 0
        for data in images:
            img, emb = _embed_upload(data)
            if emb is None:
                continue
            path = media.save_jpeg(img, "person", "enroll", _ts())
            s.add(PersonPhoto(person_id=person.id, path=path, face_emb=emb))
            if person.ref_photo_path is None:
                person.ref_photo_path = path
            added += 1
        if added:
            s.flush()
            _recompute_face(s, person)
        s.commit()
        return added


def list_photos(person_id: uuid.UUID) -> list[PersonPhotoOut]:
    from pragmata.api.schemas import PersonPhotoOut
    from pragmata.db.models import PersonPhoto

    with session_factory()() as s:
        rows = (
            s.execute(
                select(PersonPhoto)
                .where(PersonPhoto.person_id == person_id)
                .order_by(PersonPhoto.created_at)
            )
            .scalars()
            .all()
        )
        return [
            PersonPhotoOut(id=r.id, url=f"/api/v1/persons/photos/{r.id}/image") for r in rows
        ]


def delete_photo(photo_id: uuid.UUID) -> None:
    from pragmata.db.models import Person, PersonPhoto

    with session_factory()() as s:
        photo = s.get(PersonPhoto, photo_id)
        if photo is None:
            raise HTTPException(404, "нет такого фото")
        person = s.get(Person, photo.person_id)
        s.delete(photo)
        s.flush()
        if person is not None:
            _recompute_face(s, person)
            if person.ref_photo_path == photo.path:
                nxt = s.execute(
                    select(PersonPhoto.path)
                    .where(PersonPhoto.person_id == person.id)
                    .order_by(PersonPhoto.created_at)
                    .limit(1)
                ).scalar_one_or_none()
                person.ref_photo_path = nxt
        s.commit()


def photo_path(photo_id: uuid.UUID) -> str | None:
    from pragmata.db.models import PersonPhoto

    with session_factory()() as s:
        photo = s.get(PersonPhoto, photo_id)
        return photo.path if photo is not None else None


def create_person(payload: PersonCreate, site_id: int | None = None) -> uuid.UUID:
    """Завести человека, взяв эталон у существующего трека (из Поиска/кадра)."""
    from pragmata.db.models import Person, Track
    from pragmata.services import person_org_service

    if (
        payload.category is not None
        and payload.category not in person_org_service.allowed_category_keys(site_id)
    ):
        raise HTTPException(422, "неизвестная категория для этой площадки")
    person_org_service.assert_folder_ok(payload.folder_id, site_id)
    with session_factory()() as s:
        track = s.get(Track, payload.track_id)
        if track is None or (track.clip_emb is None and track.face_emb is None):
            raise HTTPException(404, "у трека нет эмбеддинга — выберите другой")
        person = Person(
            site_id=site_id,
            name=payload.name,
            category=payload.category,
            folder_id=payload.folder_id,
            position=payload.position,
            note=payload.note,
            watch=payload.watch,
            clip_emb=list(track.clip_emb) if track.clip_emb is not None else None,
            face_emb=list(track.face_emb) if track.face_emb is not None else None,
            ref_photo_path=track.best_frame_path,
        )
        s.add(person)
        s.commit()
        return person.id


def patch_person(person_id: uuid.UUID, patch: PersonPatch) -> None:
    from pragmata.db.models import Person
    from pragmata.services import person_org_service

    with session_factory()() as s:
        p = s.get(Person, person_id)
        if p is None:
            raise HTTPException(404, "нет такого человека")
        if patch.name is not None:
            p.name = patch.name
        if patch.category is not None:
            cat = patch.category.strip() or None  # "" → снять категорию
            if cat is not None and cat not in person_org_service.allowed_category_keys(p.site_id):
                raise HTTPException(422, "неизвестная категория для этой площадки")
            p.category = cat
        if patch.clear_folder:
            p.folder_id = None
        elif patch.folder_id is not None:
            person_org_service.assert_folder_ok(patch.folder_id, p.site_id)
            p.folder_id = patch.folder_id
        if patch.position is not None:
            p.position = patch.position
        if patch.note is not None:
            p.note = patch.note
        if patch.watch is not None:
            p.watch = patch.watch
        s.commit()


def delete_person(person_id: uuid.UUID) -> None:
    from pragmata.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
        if p is None:
            raise HTTPException(404, "нет такого человека")
        s.delete(p)  # person_photos каскадятся (FK ondelete=CASCADE)
        s.commit()


def _ts() -> float:
    return time.time()
