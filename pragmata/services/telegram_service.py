"""Маршрутизация Telegram по организациям.

Один бот на всех клиентов, но чат принадлежит организации: иначе тревога
одного клиента улетит в чат другого. Привязка — одноразовым кодом, который
клиент берёт у себя в дашборде и отправляет боту.

Список из .env (TELEGRAM_CHAT_IDS) остаётся чатами ВЛАДЕЛЬЦА платформы: он
получает всё. Клиентские чаты приходят только из БД и только по своей
организации.
"""

from __future__ import annotations

import logging
import secrets
import string

from sqlalchemy import select

from pragmata.api.deps import session_factory
from pragmata.config import get_settings

log = logging.getLogger("pragmata.telegram")

CODE_LEN = 8
# без похожих символов: код диктуют голосом и переписывают руками
_ALPHABET = "".join(c for c in string.ascii_uppercase + string.digits if c not in "O0I1L")


def issue_bind_code(site_id: int) -> str:
    """Выдать организации одноразовый код привязки чата."""
    from pragmata.db.models import Site

    code = "".join(secrets.choice(_ALPHABET) for _ in range(CODE_LEN))
    with session_factory()() as s:
        site = s.get(Site, site_id)
        if site is None:
            raise ValueError("нет такой организации")
        # код живёт на «пустой» строке чата: chat_id придёт при активации
        from pragmata.db.models import Chat

        s.add(Chat(chat_id=-abs(hash(code)) % (10**12), site_id=site_id, bind_code=code))
        s.commit()
    return code


def bind_chat(code: str, chat_id: int, title: str | None = None) -> int | None:
    """Активировать код в конкретном чате. → site_id или None, если код неверный.

    Код одноразовый: после активации обнуляем, иначе им воспользовался бы любой,
    кому переслали сообщение.
    """
    from pragmata.db.models import Chat

    code = code.strip().upper()
    with session_factory()() as s:
        pending = s.execute(select(Chat).where(Chat.bind_code == code)).scalars().first()
        if pending is None:
            return None
        site_id: int | None = pending.site_id
        s.delete(pending)  # заготовка отработала

        chat = s.get(Chat, chat_id)
        if chat is None:
            chat = Chat(chat_id=chat_id, site_id=site_id, title=title)
            s.add(chat)
        else:
            chat.site_id = site_id
            if title:
                chat.title = title
        s.commit()
    log.info("чат %s привязан к организации %s", chat_id, site_id)
    return site_id


def recipients_for_site(site_id: int | None) -> set[int]:
    """Кому слать событие этой организации: её чаты + чаты владельца платформы."""
    from pragmata.db.models import Chat

    owners = get_settings().allowed_chat_ids  # платформа видит всё
    if site_id is None:
        return set(owners)
    with session_factory()() as s:
        rows = (
            s.execute(
                select(Chat.chat_id).where(
                    Chat.site_id == site_id, Chat.bind_code.is_(None)
                )
            )
            .scalars()
            .all()
        )
    # положительные chat_id — реальные чаты; заготовки кодов хранятся отрицательными
    return {c for c in rows if c > 0} | set(owners)


def unbind_chat(chat_id: int) -> None:
    from pragmata.db.models import Chat

    with session_factory()() as s:
        chat = s.get(Chat, chat_id)
        if chat is not None:
            s.delete(chat)
            s.commit()
