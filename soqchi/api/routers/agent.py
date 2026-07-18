"""AI-ассистент на дашборде: тот же LLM-агент, что в Telegram, + media-прокси.

Агент лениво инициализируется (CLIP + LLM в API-процессе) — только если задан
LLM_API_KEY. Доказательства (фото/клипы) отдаём через /media с anti-traversal.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from soqchi.api.deps import data_root, require_site, safe_file, session_factory
from soqchi.api.schemas import AgentAnswer, AgentAsk, MediaEvidence
from soqchi.api.security import require_auth
from soqchi.config import get_settings

router = APIRouter(prefix="/api/v1", tags=["agent"])

_runner: Any = None
_embedder: Any = None


def _get_runner() -> Any:
    global _runner, _embedder
    if _runner is not None:
        return _runner
    s = get_settings()
    if not s.llm_api_key:
        raise HTTPException(501, "LLM-агент выключен (нет LLM_API_KEY в .env)")
    from soqchi.agent.runner import AgentRunner
    from soqchi.agent.tools import AgentTools
    from soqchi.perception.embedder import ClipEmbedder

    if _embedder is None:
        _embedder = ClipEmbedder()
    _runner = AgentRunner(
        s.llm_base_url,
        s.llm_api_key,
        s.llm_model,
        AgentTools(session_factory(), require_site(), _embedder),
        require_site(),
    )
    return _runner


def _to_url(photo: str | None, clip: str | None) -> tuple[str | None, str | None]:
    photo_url = f"/api/v1/media?p={quote(photo)}&kind=photo" if photo else None
    clip_url = f"/api/v1/media?p={quote(os.path.basename(clip))}&kind=clip" if clip else None
    return photo_url, clip_url


@router.post("/agent/ask", response_model=AgentAnswer)
def ask(payload: AgentAsk, _: str = Depends(require_auth)) -> AgentAnswer:
    runner = _get_runner()
    q = payload.question.strip()
    if not q:
        raise HTTPException(422, "пустой вопрос")
    # session_id → стабильный int-ключ истории диалога в раннере
    text, evidence = runner.answer(hash(payload.session_id) % 1_000_000, q)
    items: list[MediaEvidence] = []
    for e in evidence:
        photo_url, clip_url = _to_url(e.get("photo"), e.get("clip"))
        items.append(
            MediaEvidence(caption=e.get("caption", ""), photo_url=photo_url, clip_url=clip_url)
        )
    return AgentAnswer(text=text, evidence=items)


@router.get("/agent/enabled")
def enabled(_: str = Depends(require_auth)) -> dict[str, bool]:
    return {"enabled": bool(get_settings().llm_api_key)}


@router.get("/media")
def media(
    p: str = Query(min_length=1),
    kind: str = Query("photo"),
    _: str = Depends(require_auth),
) -> FileResponse:
    if kind == "clip":
        path = safe_file(data_root() / "clips", Path(p).name)
        return FileResponse(path, media_type="video/mp4")
    path = safe_file(get_settings().media_dir, p)
    return FileResponse(path, media_type="image/jpeg")
