"""Публичная форма «Связаться» с лендинга + просмотр заявок в бэкофисе.

POST /contact — без авторизации (лендинг открыт всем). Простая валидация от мусора;
GET /contact — только для бэкофиса (список заявок)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from pragmata.api.deps import session_factory
from pragmata.api.schemas import ContactIn, OkOut
from pragmata.api.security import Principal, require_backoffice

router = APIRouter(prefix="/api/v1", tags=["contact"])


@router.post("/contact", response_model=OkOut)
def submit(payload: ContactIn) -> OkOut:
    from pragmata.db.models import ContactRequest

    name = payload.name.strip()
    contact = payload.contact.strip()
    if not name or not contact:
        raise HTTPException(422, "имя и контакт обязательны")
    if len(name) > 120 or len(contact) > 200 or len(payload.message) > 4000:
        raise HTTPException(422, "слишком длинное поле")
    with session_factory()() as s:
        s.add(
            ContactRequest(name=name, contact=contact, message=payload.message.strip()[:4000])
        )
        s.commit()
    return OkOut()


@router.get("/contact", response_model=list[dict[str, object]])
def list_requests(_: Principal = Depends(require_backoffice)) -> list[dict[str, object]]:
    from sqlalchemy import select

    from pragmata.db.models import ContactRequest

    with session_factory()() as s:
        rows = (
            s.execute(select(ContactRequest).order_by(ContactRequest.created_at.desc()))
            .scalars()
            .all()
        )
        return [
            {
                "id": str(r.id),
                "name": r.name,
                "contact": r.contact,
                "message": r.message,
                "handled": r.handled,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
