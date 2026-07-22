"""Telegram-бот: мгновенные алерты с кнопками [Клип] [Ложное] [Ок].

Живёт в собственном потоке со своим asyncio-циклом; пайплайн (threads)
шлёт события через run_coroutine_threadsafe — без блокировки обработки кадров.

Безопасность: карточки уходят ТОЛЬКО в chat_id из allowlist (.env
TELEGRAM_CHAT_IDS); колбэки чужих чатов игнорируются с подсказкой.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
import threading
import uuid
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING
from zoneinfo import ZoneInfo

import cv2
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command, CommandStart
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    FSInputFile,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
)

from pragmata.bot import texts
from pragmata.sinks import render_event_image

if TYPE_CHECKING:
    from collections.abc import Callable

    from pragmata.config import SiteConfig
    from pragmata.rules.engine import RuleEvent

log = logging.getLogger("pragmata.bot")

# только эти severity будят человека немедленно; info/warning уйдут в дайджест (неделя 3)
PUSH_SEVERITIES = {"alert"}


def _keyboard(event_id: uuid.UUID) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=texts.BTN_CLIP, callback_data=f"clip:{event_id}"),
                InlineKeyboardButton(text=texts.BTN_FALSE, callback_data=f"fp:{event_id}"),
                InlineKeyboardButton(text=texts.BTN_OK, callback_data=f"ok:{event_id}"),
            ]
        ]
    )


class BotService:
    """Поток с aiogram-поллингом + потокобезопасный вход для событий пайплайна."""

    def __init__(
        self,
        token: str,
        allowed_chat_ids: set[int],
        site_cfg: SiteConfig,
        get_clip_path: Callable[[uuid.UUID], str | None],
        save_feedback: Callable[[uuid.UUID, int, str], None],
        build_digest: Callable[[], str] | None = None,
        find_person: Callable[[str], list[tuple[str, str]]] | None = None,
        agent_answer: Callable[[int, str], tuple[str, list[dict[str, str]]]] | None = None,
    ):
        self.build_digest = build_digest
        self.find_person = find_person
        self.agent_answer = agent_answer
        self.allowed = allowed_chat_ids
        self.site_cfg = site_cfg
        self.tz = ZoneInfo(site_cfg.site.timezone)
        self.camera_names = {c.id: c.name for c in site_cfg.cameras}
        self.get_clip_path = get_clip_path
        self.save_feedback = save_feedback
        self.media_root: Path | None = None  # выставляет main — для фото из инструментов агента
        # отправленные алерт-карточки: event_id → [(chat_id, message_id, caption)]
        # нужно VLM-воркеру, чтобы дописать описание в уже отправленную карточку
        self._alert_msgs: dict[uuid.UUID, list[tuple[int, int, str]]] = {}

        self.bot = Bot(token)
        self.dp = Dispatcher()
        self.dp.include_router(self._router())
        self.loop = asyncio.new_event_loop()
        self._thread = threading.Thread(target=self._run_loop, name="tg-bot", daemon=True)

    # --- жизненный цикл -------------------------------------------------

    def start(self) -> None:
        self._thread.start()
        log.info("telegram bot: on (%d chats in allowlist)", len(self.allowed))

    def stop(self) -> None:
        async def _shutdown() -> None:
            await self.dp.stop_polling()

        # останавливаемся в любом случае — падение шатдауна не должно ронять пайплайн
        with contextlib.suppress(Exception):
            asyncio.run_coroutine_threadsafe(_shutdown(), self.loop).result(timeout=10)

    def _run_loop(self) -> None:
        asyncio.set_event_loop(self.loop)
        self.loop.run_until_complete(self.dp.start_polling(self.bot, handle_signals=False))

    # --- вход из пайплайна (любой поток) ----------------------------------

    def notify_event(self, ev: RuleEvent) -> None:
        if ev.severity not in PUSH_SEVERITIES:
            return
        photo: bytes | None = None
        frame = render_event_image(ev)
        if frame is not None:
            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ok:
                photo = buf.tobytes()
        asyncio.run_coroutine_threadsafe(self._send_alert(ev, photo), self.loop)

    def _recipients(self, ev: RuleEvent) -> set[int]:
        """Чаты организации события + чаты владельца платформы.

        Раньше карточка уходила во ВСЕ чаты из .env — в мультиаренде это
        отправило бы тревогу одного клиента другому.
        """
        from pragmata.services.telegram_service import recipients_for_site

        try:
            return recipients_for_site(getattr(ev, "site_id", None))
        except Exception:  # noqa: BLE001 — недоступная БД не должна глушить алерты
            log.exception("не удалось определить получателей, шлю владельцу")
            return set(self.allowed)

    async def _send_alert(self, ev: RuleEvent, photo: bytes | None) -> None:
        caption = self._caption(ev)
        kb = _keyboard(ev.id) if ev.track is not None else None
        sent: list[tuple[int, int, str]] = []
        for chat_id in self._recipients(ev):
            try:
                if photo is not None:
                    msg = await self.bot.send_photo(
                        chat_id,
                        BufferedInputFile(photo, filename="event.jpg"),
                        caption=caption,
                        reply_markup=kb,
                    )
                else:
                    msg = await self.bot.send_message(chat_id, caption, reply_markup=kb)
                sent.append((chat_id, msg.message_id, caption))
            except Exception:  # noqa: BLE001 — один недоступный чат не роняет рассылку
                log.exception("telegram send failed chat=%s", chat_id)
        if sent:
            self._alert_msgs[ev.id] = sent
            while len(self._alert_msgs) > 300:  # не копим бесконечно
                self._alert_msgs.pop(next(iter(self._alert_msgs)))

    def attach_description(self, event_id: uuid.UUID, description: str, fp_hint: bool) -> None:
        """VLM дописывает описание в уже отправленную карточку. Любой поток."""

        async def _edit() -> None:
            suffix = f"\n🧠 {description}"
            if fp_hint:
                suffix += "\n🤖 возможно ложное срабатывание (нет людей в кадре?)"
            for chat_id, message_id, caption in self._alert_msgs.get(event_id, []):
                try:
                    await self.bot.edit_message_caption(
                        chat_id=chat_id,
                        message_id=message_id,
                        caption=f"{caption}{suffix}"[:1024],
                        reply_markup=_keyboard(event_id),
                    )
                except Exception:  # noqa: BLE001 — старые/удалённые сообщения
                    log.exception("caption edit failed event=%s chat=%s", event_id, chat_id)

        asyncio.run_coroutine_threadsafe(_edit(), self.loop)

    def broadcast_text(self, text: str) -> None:
        """Текст всем чатам allowlist (дайджест по расписанию). Любой поток."""

        async def _send() -> None:
            for chat_id in self.allowed:
                try:
                    await self.bot.send_message(chat_id, text)
                except Exception:  # noqa: BLE001
                    log.exception("telegram broadcast failed chat=%s", chat_id)

        asyncio.run_coroutine_threadsafe(_send(), self.loop)

    def _resolve_media(self, path: str) -> Path | None:
        if not path:
            return None
        full = (
            self.media_root / path
            if self.media_root and not Path(path).is_absolute()
            else Path(path)
        )
        return full if full.exists() else None

    def _caption(self, ev: RuleEvent) -> str:
        title = texts.EVENT_TITLES.get(ev.type, ev.type)
        when = datetime.fromtimestamp(ev.t_end, tz=self.tz).strftime("%H:%M:%S")
        cam = self.camera_names.get(ev.camera_id, ev.camera_id)
        lines = [title, f"📷 {cam} · 🕒 {when}"]
        if ev.zone:
            lines.append(f"Зона: {ev.zone}")
        people = ev.meta.get("people_in_zone", 0)
        if people > 1:
            lines.append(f"Людей в зоне: {people}")
        return "\n".join(lines)

    # --- хэндлеры ---------------------------------------------------------

    def _router(self) -> Router:
        router = Router()

        @router.message(CommandStart())
        async def start(msg: Message) -> None:
            if msg.chat.id in self.allowed:
                await msg.answer(texts.START_OK.format(chat_id=msg.chat.id))
            else:
                await msg.answer(texts.NOT_ALLOWED.format(chat_id=msg.chat.id))

        @router.message(Command("bind"))
        async def bind(msg: Message) -> None:
            """/bind КОД — привязать этот чат к организации клиента.

            Так клиент подключает свой чат сам, не дожидаясь, пока владелец
            платформы впишет его chat_id в .env руками.
            """
            from pragmata.services.telegram_service import bind_chat

            parts = (msg.text or "").split(maxsplit=1)
            if len(parts) < 2:
                await msg.answer(texts.BIND_USAGE)
                return
            site_id = await asyncio.to_thread(
                bind_chat, parts[1], msg.chat.id, msg.chat.title or msg.chat.full_name
            )
            await msg.answer(texts.BIND_OK if site_id else texts.BIND_BAD_CODE)

        @router.message(Command("digest"))
        async def digest(msg: Message) -> None:
            if msg.chat.id not in self.allowed or self.build_digest is None:
                return
            await msg.answer(await asyncio.to_thread(self.build_digest))

        @router.message(Command("find"))
        async def find(msg: Message) -> None:
            if msg.chat.id not in self.allowed or self.find_person is None:
                return
            query = (msg.text or "").removeprefix("/find").strip()
            if not query:
                await msg.answer(texts.FIND_USAGE)
                return
            from pragmata.investigation import has_negation

            if has_negation(query):
                await msg.answer(texts.FIND_NEGATION)
                return
            results = await asyncio.to_thread(self.find_person, query)
            if not results:
                await msg.answer(texts.FIND_EMPTY)
                return
            for path, caption in results[:5]:
                if Path(path).exists():
                    await self.bot.send_photo(msg.chat.id, FSInputFile(path), caption=caption)

        @router.message(F.text & ~F.text.startswith("/"))
        async def free_text(msg: Message) -> None:
            if msg.chat.id not in self.allowed or not msg.text:
                return
            if self.agent_answer is None:
                await msg.answer(texts.AGENT_OFF)
                return
            await self.bot.send_chat_action(msg.chat.id, "typing")
            try:
                text, evidence = await asyncio.to_thread(self.agent_answer, msg.chat.id, msg.text)
            except Exception:  # noqa: BLE001 — ошибка LLM не должна молчать
                log.exception("agent failed")
                await msg.answer(texts.AGENT_ERROR)
                return
            await msg.answer(text)
            clips_sent = 0
            for item in evidence[:5]:
                photo = self._resolve_media(item.get("photo", ""))
                if photo is not None:
                    await self.bot.send_photo(
                        msg.chat.id, FSInputFile(str(photo)), caption=item.get("caption")
                    )
                clip = self._resolve_media(item.get("clip", ""))
                if clip is not None and clips_sent < 2:  # видео тяжёлые — максимум пара
                    clips_sent += 1
                    await self.bot.send_video(
                        msg.chat.id, FSInputFile(str(clip)), caption=item.get("caption")
                    )

        @router.callback_query(F.data.startswith("clip:"))
        async def cb_clip(q: CallbackQuery) -> None:
            if not isinstance(q.message, Message) or q.message.chat.id not in self.allowed:
                await q.answer()
                return
            event_id = uuid.UUID(str(q.data).split(":", 1)[1])
            path = await asyncio.to_thread(self.get_clip_path, event_id)
            if path is None:
                await q.answer(texts.CLIP_NOT_READY, show_alert=True)
                return
            if not Path(path).exists():
                await q.answer(texts.CLIP_MISSING, show_alert=True)
                return
            await self.bot.send_video(q.message.chat.id, FSInputFile(path))
            await q.answer()

        @router.callback_query(F.data.startswith(("fp:", "ok:")))
        async def cb_feedback(q: CallbackQuery) -> None:
            if not isinstance(q.message, Message) or q.message.chat.id not in self.allowed:
                await q.answer()
                return
            kind, raw_id = str(q.data).split(":", 1)
            verdict = "false_positive" if kind == "fp" else "confirmed"
            await asyncio.to_thread(
                self.save_feedback, uuid.UUID(raw_id), q.message.chat.id, verdict
            )
            mark = texts.MARK_FALSE if kind == "fp" else texts.MARK_OK
            try:
                caption = (q.message.caption or q.message.text or "").split("\n—")[0]
                await q.message.edit_caption(
                    caption=f"{caption}\n— {mark}", reply_markup=q.message.reply_markup
                )
            except Exception:  # noqa: BLE001 — текстовые карточки/повторные нажатия
                pass
            await q.answer(texts.FEEDBACK_FALSE_SAVED if kind == "fp" else texts.FEEDBACK_OK_SAVED)

        return router
