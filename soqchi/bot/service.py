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

from soqchi.bot import texts
from soqchi.sinks import render_event_image

if TYPE_CHECKING:
    from collections.abc import Callable

    from soqchi.config import SiteConfig
    from soqchi.rules.engine import RuleEvent

log = logging.getLogger("soqchi.bot")

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
    ):
        self.build_digest = build_digest
        self.allowed = allowed_chat_ids
        self.site_cfg = site_cfg
        self.tz = ZoneInfo(site_cfg.site.timezone)
        self.camera_names = {c.id: c.name for c in site_cfg.cameras}
        self.get_clip_path = get_clip_path
        self.save_feedback = save_feedback

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

    async def _send_alert(self, ev: RuleEvent, photo: bytes | None) -> None:
        caption = self._caption(ev)
        kb = _keyboard(ev.id) if ev.track is not None else None
        for chat_id in self.allowed:
            try:
                if photo is not None:
                    await self.bot.send_photo(
                        chat_id,
                        BufferedInputFile(photo, filename="event.jpg"),
                        caption=caption,
                        reply_markup=kb,
                    )
                else:
                    await self.bot.send_message(chat_id, caption, reply_markup=kb)
            except Exception:  # noqa: BLE001 — один недоступный чат не роняет рассылку
                log.exception("telegram send failed chat=%s", chat_id)

    def broadcast_text(self, text: str) -> None:
        """Текст всем чатам allowlist (дайджест по расписанию). Любой поток."""

        async def _send() -> None:
            for chat_id in self.allowed:
                try:
                    await self.bot.send_message(chat_id, text)
                except Exception:  # noqa: BLE001
                    log.exception("telegram broadcast failed chat=%s", chat_id)

        asyncio.run_coroutine_threadsafe(_send(), self.loop)

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

        @router.message(Command("digest"))
        async def digest(msg: Message) -> None:
            if msg.chat.id not in self.allowed or self.build_digest is None:
                return
            await msg.answer(await asyncio.to_thread(self.build_digest))

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
