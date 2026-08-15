"""Сохраняемые диалоги ассистента + его долговременная память.

Диалоги и память принадлежат площадке. История подтягивается в LLM-контекст,
а память (факты про объект) вклеивается в системный промпт — так ассистент
«помнит и учится» между сессиями. Пополняется инструментом remember и из UI.
"""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов
from typing import Any

from fastapi import HTTPException
from sqlalchemy import delete, func, select

from pragmata.api.deps import session_factory

# сколько последних реплик отдаём модели как контекст диалога
HISTORY_TURNS = 12
MEMORY_LIMIT = 60  # потолок фактов памяти на площадку


def _site(scope: int | None) -> int:
    """Конкретная площадка: у админа без X-Site-Id — основная (1)."""
    return scope if scope is not None else 1


# ── диалоги ───────────────────────────────────────────────────────────────────


def list_conversations(scope: int | None) -> list[dict[str, Any]]:
    from pragmata.db.models import AgentConversation, AgentMessage

    site_id = _site(scope)
    with session_factory()() as s:
        counts = dict(
            s.execute(
                select(AgentMessage.conversation_id, func.count())
                .group_by(AgentMessage.conversation_id)
            ).all()
        )
        rows = (
            s.execute(
                select(AgentConversation)
                .where(AgentConversation.site_id == site_id)
                .order_by(AgentConversation.updated_at.desc())
            )
            .scalars()
            .all()
        )
        return [
            {
                "id": str(c.id),
                "title": c.title,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "message_count": int(counts.get(c.id, 0)),
            }
            for c in rows
        ]


def create_conversation(scope: int | None, title: str | None = None) -> str:
    from pragmata.db.models import AgentConversation

    with session_factory()() as s:
        conv = AgentConversation(
            site_id=_site(scope), title=(title or "Yangi suhbat").strip()[:200]
        )
        s.add(conv)
        s.commit()
        return str(conv.id)


def _own_or_404(s: Any, conv_id: uuid.UUID, scope: int | None) -> Any:
    from pragmata.db.models import AgentConversation

    conv = s.get(AgentConversation, conv_id)
    if conv is None or conv.site_id != _site(scope):
        raise HTTPException(404, "нет такого диалога")
    return conv


def assert_owned(conv_id: uuid.UUID, scope: int | None) -> None:
    """404, если диалог не этой площадки (перед записью в чужой диалог)."""
    with session_factory()() as s:
        _own_or_404(s, conv_id, scope)


def get_messages(conv_id: uuid.UUID, scope: int | None) -> list[dict[str, Any]]:
    from pragmata.db.models import AgentMessage

    with session_factory()() as s:
        _own_or_404(s, conv_id, scope)
        rows = (
            s.execute(
                select(AgentMessage)
                .where(AgentMessage.conversation_id == conv_id)
                .order_by(AgentMessage.created_at)
            )
            .scalars()
            .all()
        )
        return [
            {"role": m.role, "content": m.content, "evidence": m.evidence or []} for m in rows
        ]


def delete_conversation(conv_id: uuid.UUID, scope: int | None) -> None:
    with session_factory()() as s:
        conv = _own_or_404(s, conv_id, scope)
        s.delete(conv)  # agent_messages каскадятся (FK ondelete=CASCADE)
        s.commit()


def rename_conversation(conv_id: uuid.UUID, scope: int | None, title: str) -> None:
    title = title.strip()
    if not title:
        raise HTTPException(422, "пустой заголовок")
    with session_factory()() as s:
        conv = _own_or_404(s, conv_id, scope)
        conv.title = title[:200]
        s.commit()


def history_for_llm(conv_id: uuid.UUID) -> list[dict[str, str]]:
    """Последние реплики диалога как контекст модели ([{role, content}])."""
    from pragmata.db.models import AgentMessage

    with session_factory()() as s:
        rows = (
            s.execute(
                select(AgentMessage.role, AgentMessage.content)
                .where(AgentMessage.conversation_id == conv_id)
                .order_by(AgentMessage.created_at.desc())
                .limit(HISTORY_TURNS)
            )
            .all()
        )
    return [{"role": r[0], "content": r[1]} for r in reversed(rows)]


def append_message(
    conv_id: uuid.UUID,
    role: str,
    content: str,
    evidence: list[dict[str, Any]] | None = None,
    *,
    autotitle: bool = False,
) -> None:
    """Сохранить реплику; при autotitle — назвать диалог по первому вопросу."""
    from pragmata.db.models import AgentConversation, AgentMessage

    with session_factory()() as s:
        conv = s.get(AgentConversation, conv_id)
        if conv is None:
            raise HTTPException(404, "нет такого диалога")
        s.add(
            AgentMessage(
                conversation_id=conv_id,
                role=role,
                content=content,
                evidence=evidence or None,
            )
        )
        # первый вопрос пользователя → заголовок диалога (пока он дефолтный)
        if autotitle and role == "user" and conv.title in ("Yangi suhbat", "", None):
            conv.title = content.strip().replace("\n", " ")[:60] or "Yangi suhbat"
        s.add(conv)  # тронуть updated_at
        s.commit()


# ── память ──────────────────────────────────────────────────────────────────


def list_memory(scope: int | None) -> list[dict[str, Any]]:
    from pragmata.db.models import AgentMemory

    site_id = _site(scope)
    with session_factory()() as s:
        rows = (
            s.execute(
                select(AgentMemory)
                .where(AgentMemory.site_id == site_id)
                .order_by(AgentMemory.created_at.desc())
            )
            .scalars()
            .all()
        )
        return [
            {
                "id": str(m.id),
                "text": m.text,
                "source": m.source,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in rows
        ]


def add_memory(scope: int | None, text: str, source: str = "user") -> str:
    """Запомнить факт. Дубли (тот же текст на площадке) не плодим."""
    from pragmata.db.models import AgentMemory

    text = text.strip()
    if not text:
        raise HTTPException(422, "пустой факт")
    site_id = _site(scope)
    with session_factory()() as s:
        existing = s.execute(
            select(AgentMemory).where(
                AgentMemory.site_id == site_id, func.lower(AgentMemory.text) == text.lower()
            )
        ).scalar_one_or_none()
        if existing is not None:
            return str(existing.id)
        # мягкий потолок: не даём памяти расти бесконечно
        count = s.execute(
            select(func.count()).select_from(AgentMemory).where(AgentMemory.site_id == site_id)
        ).scalar_one()
        if count >= MEMORY_LIMIT:
            oldest = s.execute(
                select(AgentMemory.id)
                .where(AgentMemory.site_id == site_id)
                .order_by(AgentMemory.created_at)
                .limit(1)
            ).scalar_one_or_none()
            if oldest is not None:
                s.execute(delete(AgentMemory).where(AgentMemory.id == oldest))
        mem = AgentMemory(site_id=site_id, text=text[:2000], source=source)
        s.add(mem)
        s.commit()
        return str(mem.id)


def delete_memory(mem_id: uuid.UUID, scope: int | None) -> None:
    from pragmata.db.models import AgentMemory

    with session_factory()() as s:
        mem = s.get(AgentMemory, mem_id)
        if mem is None or mem.site_id != _site(scope):
            raise HTTPException(404, "нет такого факта")
        s.delete(mem)
        s.commit()


def memory_block(scope: int | None) -> str:
    """Факты памяти как текст для системного промпта (пусто = нет памяти)."""
    from pragmata.db.models import AgentMemory

    site_id = _site(scope)
    with session_factory()() as s:
        facts = list(
            s.execute(
                select(AgentMemory.text)
                .where(AgentMemory.site_id == site_id)
                .order_by(AgentMemory.created_at)
            ).scalars()
        )
    if not facts:
        return ""
    lines = "\n".join(f"- {f}" for f in facts)
    return (
        "Что ты помнишь об этом объекте (долговременная память, учитывай при ответах):\n"
        f"{lines}"
    )
