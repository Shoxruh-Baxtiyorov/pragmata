"""Дайджест в вебе без эмодзи: иконки рисует UI, а не текст."""

from __future__ import annotations

from pragmata.digest import strip_emoji


def test_strips_emoji_and_leftover_space() -> None:
    assert strip_emoji("📊 Dayjest · Dev Stand · 24 soat") == "Dayjest · Dev Stand · 24 soat"
    assert strip_emoji("👥 Tashrif buyuruvchilar: 0") == "Tashrif buyuruvchilar: 0"


def test_keeps_nested_indent() -> None:
    # отступ вложенных строк — часть структуры, его сохраняем
    src = "Turlar:\n  🚨 Taqiqlangan zonaga kirish — 4"
    assert strip_emoji(src) == "Turlar:\n  Taqiqlangan zonaga kirish — 4"


def test_handles_emoji_in_the_middle_and_tail() -> None:
    src = "Ogohlantirishlar: 0 · ⚠️ notoʻgʻri belgilangan: 0"
    assert strip_emoji(src) == "Ogohlantirishlar: 0 · notoʻgʻri belgilangan: 0"
    assert strip_emoji("Tinch kun ✨") == "Tinch kun"


def test_plain_text_untouched() -> None:
    src = "Kirish · Ombor · 12:30"
    assert strip_emoji(src) == src
