"""AI-ассистент на дашборде: тот же LLM-агент, что в Telegram, + media-прокси.

Агент лениво инициализируется (CLIP + LLM в API-процессе) — только если задан
LLM_API_KEY. Доказательства (фото/клипы) отдаём через /media с anti-traversal.
"""

from __future__ import annotations

import os
import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов резолвит FastAPI
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse  # noqa: TC002 — FastAPI резолвит return-type в рантайме

from pragmata.api.deps import data_root, require_site, safe_file, session_factory
from pragmata.api.schemas import (
    AgentAnswer,
    AgentAsk,
    AgentMemoryIn,
    ConversationTitleIn,
    MediaEvidence,
    OkOut,
)
from pragmata.api.security import current_scope, require_auth
from pragmata.config import get_settings
from pragmata.services import agent_chat_service as chat

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
    from pragmata.agent.runner import AgentRunner
    from pragmata.agent.tools import AgentTools
    from pragmata.perception.embedder import ClipEmbedder

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
def ask(payload: AgentAsk, scope: int | None = Depends(current_scope)) -> AgentAnswer:
    runner = _get_runner()
    q = payload.question.strip()
    if not q:
        raise HTTPException(422, "пустой вопрос")
    # сохраняемый диалог: новый или проверенный на принадлежность площадке
    if payload.conversation_id is not None:
        chat.assert_owned(payload.conversation_id, scope)
        conv_id = payload.conversation_id
    else:
        conv_id = uuid.UUID(chat.create_conversation(scope))
    # контекст ДО текущего вопроса + долговременная память объекта
    history = chat.history_for_llm(conv_id)
    memory = chat.memory_block(scope)
    text, evidence = runner.chat(q, history, memory)
    items: list[MediaEvidence] = []
    stored: list[dict[str, Any]] = []
    for e in evidence:
        photo_url, clip_url = _to_url(e.get("photo"), e.get("clip"))
        me = {"caption": e.get("caption", ""), "photo_url": photo_url, "clip_url": clip_url}
        items.append(MediaEvidence(**me))
        stored.append(me)
    chat.append_message(conv_id, "user", q, autotitle=True)
    chat.append_message(conv_id, "assistant", text, stored)
    return AgentAnswer(text=text, evidence=items, conversation_id=str(conv_id))


# ── сохранённые диалоги ───────────────────────────────────────────────────────


@router.get("/agent/conversations", response_model=list[dict[str, object]])
def conversations(scope: int | None = Depends(current_scope)) -> list[dict[str, object]]:
    return chat.list_conversations(scope)


@router.post("/agent/conversations", response_model=dict)
def new_conversation(scope: int | None = Depends(current_scope)) -> dict[str, str]:
    return {"id": chat.create_conversation(scope)}


@router.get("/agent/conversations/{conv_id}", response_model=list[dict[str, object]])
def conversation_messages(
    conv_id: uuid.UUID, scope: int | None = Depends(current_scope)
) -> list[dict[str, object]]:
    return chat.get_messages(conv_id, scope)


@router.patch("/agent/conversations/{conv_id}", response_model=OkOut)
def rename_conversation(
    conv_id: uuid.UUID,
    payload: ConversationTitleIn,
    scope: int | None = Depends(current_scope),
) -> OkOut:
    chat.rename_conversation(conv_id, scope, payload.title)
    return OkOut()


@router.delete("/agent/conversations/{conv_id}", response_model=OkOut)
def delete_conversation(conv_id: uuid.UUID, scope: int | None = Depends(current_scope)) -> OkOut:
    chat.delete_conversation(conv_id, scope)
    return OkOut()


# ── долговременная память ассистента ──────────────────────────────────────────


@router.get("/agent/memory", response_model=list[dict[str, object]])
def memory(scope: int | None = Depends(current_scope)) -> list[dict[str, object]]:
    return chat.list_memory(scope)


@router.post("/agent/memory", response_model=dict)
def add_memory(
    payload: AgentMemoryIn, scope: int | None = Depends(current_scope)
) -> dict[str, str]:
    return {"id": chat.add_memory(scope, payload.text, source="user")}


@router.delete("/agent/memory/{mem_id}", response_model=OkOut)
def delete_memory(mem_id: uuid.UUID, scope: int | None = Depends(current_scope)) -> OkOut:
    chat.delete_memory(mem_id, scope)
    return OkOut()


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
