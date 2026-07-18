"""Watchlist: именованные люди. Эталон берём у существующего трека (кроп + CLIP)."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов

from fastapi import HTTPException
from sqlalchemy import func, select

from soqchi.api.deps import session_factory
from soqchi.api.schemas import PersonCreate, PersonOut, PersonPatch


def list_persons() -> list[PersonOut]:
    from soqchi.db.models import Person, Track

    with session_factory()() as s:
        persons = s.execute(select(Person).order_by(Person.created_at.desc())).scalars().all()
        counts = {
            r[0]: r[1]
            for r in s.execute(
                select(Track.person_id, func.count())
                .where(Track.person_id.is_not(None))
                .group_by(Track.person_id)
            ).all()
        }
        return [
            PersonOut(
                id=p.id,
                name=p.name,
                note=p.note,
                watch=p.watch,
                photo_url=f"/api/v1/persons/{p.id}/photo" if p.ref_photo_path else None,
                seen_count=counts.get(p.id, 0),
            )
            for p in persons
        ]


def create_person(payload: PersonCreate) -> uuid.UUID:
    from soqchi.db.models import Person, Track

    with session_factory()() as s:
        track = s.get(Track, payload.track_id)
        if track is None or (track.clip_emb is None and track.face_emb is None):
            raise HTTPException(404, "у трека нет эмбеддинга — выберите другой")
        p = Person(
            name=payload.name,
            note=payload.note,
            watch=payload.watch,
            clip_emb=list(track.clip_emb) if track.clip_emb is not None else None,
            face_emb=list(track.face_emb) if track.face_emb is not None else None,
            ref_photo_path=track.best_frame_path,
        )
        s.add(p)
        s.commit()
        pid = p.id
    return pid


def patch_person(person_id: uuid.UUID, patch: PersonPatch) -> None:
    from soqchi.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
        if p is None:
            raise HTTPException(404, "нет такого человека")
        if patch.name is not None:
            p.name = patch.name
        if patch.note is not None:
            p.note = patch.note
        if patch.watch is not None:
            p.watch = patch.watch
        s.commit()


def delete_person(person_id: uuid.UUID) -> None:
    from soqchi.db.models import Person

    with session_factory()() as s:
        p = s.get(Person, person_id)
        if p is None:
            raise HTTPException(404, "нет такого человека")
        s.delete(p)
        s.commit()
