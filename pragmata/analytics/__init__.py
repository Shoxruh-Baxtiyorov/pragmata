"""Каталог модулей видеоаналитики Pragmata.

Модуль — единица аналитики, которую клиент включает и настраивает под свою
задачу (как «модули аналитики» у TRASSIR/Macroscop). Реестр (registry.py) —
источник правды: описывает КАЖДЫЙ модуль (имя, категория, scope, tier,
параметры). Пайплайн, API-каталог и настройки фронта читают один и тот же
реестр, поэтому «добавить функцию» = добавить запись в реестр.
"""

from pragmata.analytics.registry import (
    CATEGORIES,
    MODULES,
    TIERS,
    Module,
    ParamSpec,
    catalog,
    module_by_key,
)

__all__ = [
    "CATEGORIES",
    "MODULES",
    "TIERS",
    "Module",
    "ParamSpec",
    "catalog",
    "module_by_key",
]
