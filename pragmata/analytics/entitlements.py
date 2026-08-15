"""Права подписки (entitlements): что открыто площадке по её тарифу.

Тариф (Site.tariff → Plan.key) несёт словарь ``Plan.entitlements``::

    {
      "modules": ["zone_intrusion", ...] | ["*"],       # ключи реестра аналитики
      "features": ["assistant", "journal", ...] | ["*"], # разделы приложения (навигация)
      "person_categories": ["employee", "watchlist"],    # под-функция Face ID
      "limits": {"cameras": 20},
    }

Правила разрешения (обратная совместимость — сегодня все получают всё):
  • нет плана / пустой словарь          → всё разрешено;
  • ключ отсутствует (например "modules") → эта ось не ограничена;
  • ["*"]                                → всё в этой оси;
  • пустой список []                     → ничего в этой оси.
Платформенный админ (scope=None) всегда видит всё.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from pragmata.analytics.registry import MODULES

ALL_MODULE_KEYS: frozenset[str] = frozenset(m.key for m in MODULES)

# Разделы приложения, которые тариф может открывать/закрывать (навигация фронта).
# Ядро (overview/live/events/kamera-zonalar) не гейтится — оно есть всегда.
APP_FEATURES: tuple[tuple[str, str], ...] = (
    ("assistant", "AI-ассистент"),
    ("journal", "Журнал входов/выходов (Face ID)"),
    ("watchlist", "Реестр людей (Face ID)"),
    ("heatmap", "Тепловая карта"),
    ("stats", "Статистика"),
    ("search", "Поиск по внешности"),
    ("archive", "Архив / форензика"),
    ("turnstile", "Турникеты (СКУД)"),
)
ALL_FEATURE_KEYS: frozenset[str] = frozenset(k for k, _ in APP_FEATURES)

# Значения Person.category (совпадает с watchlist_service.CATEGORIES).
PERSON_CATEGORIES: frozenset[str] = frozenset(
    ("employee", "visitor", "contractor", "watchlist", "banned", "other")
)


@dataclass(frozen=True)
class Entitlements:
    modules: frozenset[str]
    features: frozenset[str]
    person_categories: frozenset[str]
    limits: dict[str, int] = field(default_factory=dict)
    all_access: bool = False
    tariff: str | None = None


FULL = Entitlements(ALL_MODULE_KEYS, ALL_FEATURE_KEYS, PERSON_CATEGORIES, {}, all_access=True)


def _axis(raw: object, universe: frozenset[str]) -> frozenset[str]:
    """Разбор одной оси прав. None → вся ось; ["*"] → вся ось; список → пересечение."""
    if raw is None:
        return universe
    if not isinstance(raw, list):
        return universe
    if "*" in raw:
        return universe
    return frozenset(x for x in raw if isinstance(x, str) and x in universe)


def from_plan(entitlements: dict[str, object] | None, tariff: str | None = None) -> Entitlements:
    if not entitlements:
        # нет ограничений в тарифе → полный доступ (как сегодня)
        return Entitlements(
            ALL_MODULE_KEYS,
            ALL_FEATURE_KEYS,
            PERSON_CATEGORIES,
            {},
            all_access=True,
            tariff=tariff,
        )
    raw_limits = entitlements.get("limits")
    limits: dict[str, int] = {}
    if isinstance(raw_limits, dict):
        for k, v in raw_limits.items():
            try:
                limits[str(k)] = int(v)
            except (TypeError, ValueError):
                continue
    return Entitlements(
        modules=_axis(entitlements.get("modules"), ALL_MODULE_KEYS),
        features=_axis(entitlements.get("features"), ALL_FEATURE_KEYS),
        person_categories=_axis(entitlements.get("person_categories"), PERSON_CATEGORIES),
        limits=limits,
        all_access=False,
        tariff=tariff,
    )


def resolve(scope: int | None) -> Entitlements:
    """Права по scope запроса: None (админ/платформа) → всё; иначе по тарифу площадки."""
    if scope is None:
        return FULL
    from pragmata.api.deps import session_factory
    from pragmata.db.models import Plan, Site

    with session_factory()() as s:
        site = s.get(Site, scope)
        if site is None:
            # неизвестная площадка — не ломаем доступ (данные всё равно изолированы scope-ом)
            return FULL
        plan = s.get(Plan, site.tariff)
        return from_plan(plan.entitlements if plan else None, tariff=site.tariff)
