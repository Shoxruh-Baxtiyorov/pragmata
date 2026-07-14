"""Мелкие синхронные DB-операции для бота и клип-воркера."""

from __future__ import annotations

from typing import TYPE_CHECKING

from soqchi.db.models import Event, Feedback

if TYPE_CHECKING:
    import uuid

    from sqlalchemy.orm import Session, sessionmaker


def get_clip_path(session_factory: sessionmaker[Session], event_id: uuid.UUID) -> str | None:
    with session_factory() as s:
        ev = s.get(Event, event_id)
        return ev.clip_path if ev is not None else None


def update_clip_path(
    session_factory: sessionmaker[Session], event_id: uuid.UUID, path: str
) -> None:
    with session_factory() as s:
        ev = s.get(Event, event_id)
        if ev is not None:
            ev.clip_path = path
            s.commit()


def update_description(
    session_factory: sessionmaker[Session],
    event_id: uuid.UUID,
    description: str,
    vlm_meta: dict[str, object],
) -> None:
    with session_factory() as s:
        ev = s.get(Event, event_id)
        if ev is not None:
            ev.description = description
            ev.meta = {**ev.meta, "vlm": vlm_meta}
            s.commit()


def save_feedback(
    session_factory: sessionmaker[Session], event_id: uuid.UUID, chat_id: int, verdict: str
) -> None:
    with session_factory() as s:
        s.add(Feedback(event_id=event_id, chat_id=chat_id, verdict=verdict))
        s.commit()


# Поиск по описанию внешности — в soqchi/investigation.py (контраст-порог)
