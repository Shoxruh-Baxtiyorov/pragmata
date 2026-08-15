"""Турникеты/СКУД: CRUD, ручное открытие, приём событий доступа.

События доступа падают в ОБЩУЮ ленту (таблица events), если у турникета задана
камера входа — так проходы видны рядом с видеоаналитикой. Открытие выполняет
коннектор (реле/SDK). Авто-открытие по лицу (face_open) — отдельная ступень
actuation: требует проверки живости (anti-spoof) и здесь НЕ автоматизируется.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах, вызываемых из FastAPI-роутов
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from fastapi import HTTPException
from sqlalchemy import select

from pragmata.api.deps import session_factory
from pragmata.turnstile import make_connector

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from pragmata.api.schemas import AccessEventIn, TurnstileIn, TurnstilePatch
    from pragmata.db.models import Turnstile

_ACCESS_KINDS = ("open", "denied", "tailgate")
_SEVERITY = {
    "turnstile_open": "info",
    "turnstile_denied": "warning",
    "turnstile_tailgate": "alert",
}


def _out(t: Turnstile) -> dict[str, object]:
    return {
        "id": str(t.id),
        "name": t.name,
        "camera_id": t.camera_id,
        "mode": t.mode,
        "connector": t.connector,
        "config": dict(t.config or {}),
        "enabled": t.enabled,
    }


def _load(s: Session, tid: uuid.UUID, scope: int | None) -> Turnstile:
    from pragmata.db.models import Turnstile

    t = s.get(Turnstile, tid)
    if t is None or (scope is not None and t.site_id != scope):
        raise HTTPException(404, "нет такого турникета")
    return t


def _emit(
    s: Session, t: Turnstile, ev_type: str, person_id: str | None, meta: dict[str, object]
) -> None:
    """Событие доступа → общая лента (только если у турникета задана камера входа)."""
    from pragmata.db.models import Event

    if not t.camera_id:
        return
    now = datetime.now(UTC)
    m: dict[str, object] = {"turnstile_id": str(t.id), **meta}
    if person_id:
        m["person"] = person_id
    s.add(
        Event(
            site_id=t.site_id,
            camera_id=t.camera_id,
            type=ev_type,
            severity=_SEVERITY.get(ev_type, "info"),
            t_start=now,
            t_end=now,
            source="live",
            meta=m,
        )
    )


def list_turnstiles(scope: int | None) -> list[dict[str, object]]:
    from pragmata.db.models import Turnstile

    with session_factory()() as s:
        q = select(Turnstile).order_by(Turnstile.name)
        if scope is not None:
            q = q.where(Turnstile.site_id == scope)
        return [_out(t) for t in s.execute(q).scalars()]


def create_turnstile(payload: TurnstileIn, scope: int | None) -> dict[str, object]:
    from pragmata.db.models import Turnstile

    with session_factory()() as s:
        t = Turnstile(
            site_id=scope if scope is not None else 1,
            name=payload.name.strip(),
            camera_id=payload.camera_id or None,
            mode=payload.mode,
            connector=payload.connector,
            config=payload.config,
            enabled=payload.enabled,
        )
        s.add(t)
        s.commit()
        return _out(t)


def patch_turnstile(tid: uuid.UUID, patch: TurnstilePatch, scope: int | None) -> dict[str, object]:
    with session_factory()() as s:
        t = _load(s, tid, scope)
        if patch.name is not None:
            t.name = patch.name.strip()
        if patch.camera_id is not None:
            t.camera_id = patch.camera_id or None
        if patch.mode is not None:
            t.mode = patch.mode
        if patch.connector is not None:
            t.connector = patch.connector
        if patch.config is not None:
            t.config = patch.config
        if patch.enabled is not None:
            t.enabled = patch.enabled
        s.commit()
        return _out(t)


def delete_turnstile(tid: uuid.UUID, scope: int | None) -> None:
    with session_factory()() as s:
        t = _load(s, tid, scope)
        s.delete(t)
        s.commit()


def open_turnstile(tid: uuid.UUID, scope: int | None, reason: str = "manual") -> dict[str, object]:
    """Ручное открытие оператором. Команда → коннектор, факт → в ленту."""
    with session_factory()() as s:
        t = _load(s, tid, scope)
        if not t.enabled:
            raise HTTPException(409, "турникет выключен")
        ok = make_connector(t.connector, dict(t.config or {})).open(reason)
        _emit(s, t, "turnstile_open", None, {"reason": reason, "ok": ok})
        s.commit()
    return {"ok": ok}


def ingest_access(tid: uuid.UUID, payload: AccessEventIn, scope: int | None) -> dict[str, object]:
    """Приём события доступа от турникета/интегратора (webhook) → в ленту."""
    if payload.kind not in _ACCESS_KINDS:
        raise HTTPException(422, f"kind должен быть одним из: {'|'.join(_ACCESS_KINDS)}")
    with session_factory()() as s:
        t = _load(s, tid, scope)
        ev_type = f"turnstile_{payload.kind}"
        meta: dict[str, object] = dict(payload.meta)
        if payload.direction:
            meta["direction"] = payload.direction
        _emit(s, t, ev_type, payload.person_id, meta)
        s.commit()
    return {"accepted": True, "type": ev_type}
