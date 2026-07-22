"""Сводки и Investigation: stats, digest, find."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатуре роута резолвит FastAPI в рантайме
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query

from pragmata.api.deps import require_site, session_factory
from pragmata.api.schemas import (
    DigestOut,
    FindItem,
    OverviewOut,
    PersonAppearance,
    StatsOut,
    SystemOut,
)
from pragmata.api.security import Principal, current_principal, current_scope, require_auth
from pragmata.config import get_settings
from pragmata.services import insights_service as isvc

router = APIRouter(prefix="/api/v1", tags=["insights"])
_embedder = None


@router.post("/telegram/bind-code", response_model=dict)
def telegram_bind_code(p: Principal = Depends(current_principal)) -> dict[str, str]:
    """Код привязки Telegram-чата к своей организации.

    Клиент подключает свой чат сам: получает код здесь и отправляет боту
    /bind КОД. Без этого владельцу платформы пришлось бы вписывать чужие
    chat_id в .env руками, а тревоги ходили бы в общий котёл.
    """
    from pragmata.services.telegram_service import issue_bind_code

    if p.site_id is None:
        raise HTTPException(422, "у платформенного админа нет своей организации")
    return {"code": issue_bind_code(p.site_id), "how": "отправьте боту: /bind КОД"}


@router.get("/overview", response_model=OverviewOut)
def overview(scope: int | None = Depends(current_scope)) -> OverviewOut:
    require_site()
    return isvc.overview(scope)


@router.get("/system", response_model=SystemOut)
def system(scope: int | None = Depends(current_scope)) -> SystemOut:
    return isvc.system_status(scope)


@router.get("/tracks/{track_id}/timeline", response_model=list[PersonAppearance])
def timeline(
    track_id: uuid.UUID,
    hours: int = Query(24, gt=0, le=24 * 7),
    _: str = Depends(require_auth),
) -> list[PersonAppearance]:
    return isvc.person_timeline(track_id, hours)


@router.get("/stats", response_model=StatsOut)
def stats(
    hours: float = Query(24, gt=0, le=24 * 30),
    scope: int | None = Depends(current_scope),
) -> StatsOut:
    from pragmata.agent.tools import AgentTools

    cfg = require_site()
    return StatsOut(**AgentTools(session_factory(), cfg, None, scope=scope).stats(hours=hours))


@router.get("/digest", response_model=DigestOut)
def digest(
    hours: int = Query(24, gt=0, le=24 * 7),
    lang: Literal["ru", "uz", "en"] = Query("ru"),
    _: str = Depends(require_auth),
) -> DigestOut:
    from pragmata.digest import build_digest_text

    cfg = require_site()
    # в вебе иконки рисует UI — эмодзи из телеграм-шаблона тут только мешают
    return DigestOut(
        text=build_digest_text(session_factory(), cfg, hours=hours, lang=lang, emoji=False)
    )


@router.get("/find", response_model=list[FindItem])
def find(
    description: str = Query(min_length=3),
    hours: int = Query(48, gt=0, le=24 * 14),
    _: str = Depends(require_auth),
) -> list[FindItem]:
    global _embedder
    s = get_settings()
    if not s.api_enable_find:
        raise HTTPException(501, "поиск в API выключен (API_ENABLE_FIND=1 включает)")
    from pragmata.api.deps import camera_names
    from pragmata.investigation import find_people, has_negation

    if has_negation(description):
        raise HTTPException(422, "опишите положительным признаком (bald, а не 'no hair')")
    if _embedder is None:
        from pragmata.perception.embedder import ClipEmbedder

        _embedder = ClipEmbedder()
    names = camera_names()
    found = find_people(
        session_factory(), _embedder, description, hours=hours, min_margin=s.find_min_margin
    )
    return [
        FindItem(
            time=t.started_at,
            camera=names.get(t.camera_id, t.camera_id),
            similarity=round(sim, 3),
            photo_url=f"/api/v1/tracks/{t.id}/photo" if t.best_frame_path else None,
        )
        for t, sim in found
    ]
