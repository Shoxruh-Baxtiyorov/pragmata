"""Категории/папки людей: дефолты, slug ключа, разрешённые категории."""

from __future__ import annotations

from pragmata.services.person_org_service import (
    DEFAULT_CATEGORIES,
    _slug,
    allowed_category_keys,
)

_DEFAULT = {"employee", "visitor", "contractor", "watchlist", "banned", "other"}


def test_default_categories_keys() -> None:
    assert {k for k, _ in DEFAULT_CATEGORIES} == _DEFAULT


def test_allowed_categories_none_site_is_defaults() -> None:
    # у платформенного админа (site=None) — базовый набор
    assert allowed_category_keys(None) == _DEFAULT


def test_slug_ascii() -> None:
    assert _slug("Security Guards") == "security_guards"
    assert _slug("5-A sinf") == "5_a_sinf"


def test_slug_non_ascii_fallback() -> None:
    # кириллица/узбекские буквы не дают ascii-slug → генерируем короткий ключ
    s = _slug("O'quvchilar")
    assert s and s.replace("_", "").isascii()
    assert _slug("Ўқувчилар").startswith("c")  # чистая кириллица → fallback c<hex>
