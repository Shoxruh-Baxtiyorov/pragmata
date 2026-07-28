"""Реестр модулей видеоаналитики — единый источник правды.

Tier — честная осуществимость на текущем стеке:
  A — работает сейчас (YOLO11 person/vehicle + трекинг + детерминированные правила);
  B — работает через VLM (промпт по кропу, как детекция оружия) — точность средняя;
  C — нужна отдельная модель (открытая/бесплатная, но +вес на диск), пока заглушка.

Scope — где живёт конфиг модуля:
  site   — весь объект (Site);
  camera — камера (Camera.analytics JSON);
  zone   — зона (Zone.rules JSON).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Scope = Literal["site", "camera", "zone"]
Tier = Literal["A", "B", "C"]
Category = Literal["retail", "security", "construction", "logistics", "general"]
ParamType = Literal["bool", "int", "float", "text", "select"]

# человекочитаемые метки для фронта (порядок = порядок вкладок)
CATEGORIES: tuple[tuple[Category, str], ...] = (
    ("general", "Базовые"),
    ("retail", "Ритейл и общепит"),
    ("security", "Безопасность и СКУД"),
    ("construction", "Стройка и промышленность"),
    ("logistics", "Логистика и склады"),
)

TIERS: dict[Tier, str] = {
    "A": "Работает",
    "B": "Через ИИ-зрение (VLM)",
    "C": "Нужна модель",
}


@dataclass(frozen=True)
class ParamSpec:
    key: str
    label: str
    type: ParamType
    default: object
    min: float | None = None
    max: float | None = None
    options: tuple[str, ...] | None = None
    unit: str | None = None


@dataclass(frozen=True)
class Module:
    key: str
    name: str
    category: Category
    scope: Scope
    tier: Tier
    description: str
    params: tuple[ParamSpec, ...] = ()
    event_type: str | None = None  # тип события, которое порождает модуль
    requires_model: str | None = None  # для tier C — какая модель нужна


# ── Каталог ──────────────────────────────────────────────────────────────────

MODULES: tuple[Module, ...] = (
    # ─ Базовые (уже в движке) ─
    Module(
        "zone_intrusion", "Вторжение в зону", "general", "zone", "A",
        "Тревога, когда человек заходит в запретную зону.",
        params=(
            ParamSpec("hysteresis_frames", "Кадров для срабатывания", "int", 6, 1, 60),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="zone_intrusion",
    ),
    Module(
        "loitering", "Долгое присутствие", "general", "zone", "A",
        "Тревога, если человек находится в зоне дольше порога.",
        params=(
            ParamSpec("dwell_s", "Порог присутствия", "int", 60, 5, 3600, unit="с"),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="loitering",
    ),
    Module(
        "after_hours", "Присутствие вне рабочих часов", "general", "site", "A",
        "Тревога о людях на объекте вне рабочего календаря (настраивается в «Настройках»).",
        event_type="after_hours_presence",
    ),
    Module(
        "vehicle", "Транспорт в кадре", "general", "camera", "A",
        "Фиксация авто/грузовиков/мотоциклов (YOLO).",
        params=(ParamSpec("conf", "Порог уверенности", "float", 0.3, 0.1, 0.9),),
        event_type="vehicle_seen",
    ),
    # ─ Ритейл и общепит ─
    Module(
        "visitor_count", "Подсчёт посетителей", "retail", "camera", "A",
        "Счётчик вошедших; при распознавании лиц — уникальные посетители.",
        params=(ParamSpec("unique_by_face", "Считать уникальных (по лицу)", "bool", True),),
        event_type="person_entered",
    ),
    Module(
        "queue_length", "Контроль очереди", "retail", "zone", "A",
        "Тревога, когда в зоне кассы/стойки скапливается очередь дольше порога.",
        params=(
            ParamSpec("threshold", "Людей в очереди", "int", 4, 2, 50),
            ParamSpec("wait_s", "Держится дольше", "int", 30, 5, 1800, unit="с"),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="queue_buildup",
    ),
    Module(
        "heatmap", "Тепловая карта", "retail", "camera", "A",
        "Накопление зон активности посетителей — где ходят/задерживаются.",
        params=(ParamSpec("window_min", "Окно накопления", "int", 60, 5, 1440, unit="мин"),),
    ),
    Module(
        "hygiene", "Гигиена: перчатки/шапочка", "retail", "zone", "B",
        "ИИ-зрение проверяет персонал на кухне: есть ли перчатки и шапочка.",
        params=(
            ParamSpec(
                "items", "Что проверять", "select", "gloves_hat",
                options=("gloves", "hat", "gloves_hat"),
            ),
            ParamSpec("max_per_hour", "Лимит проверок в час", "int", 60, 1, 600),
        ),
        event_type="hygiene_violation",
    ),
    # ─ Безопасность и СКУД ─
    Module(
        "abandoned_object", "Оставленные предметы", "security", "zone", "A",
        "Тревога о бесхозной сумке/рюкзаке/чемодане, стоящем без владельца.",
        params=(
            ParamSpec("dwell_s", "Стоит без движения", "int", 30, 5, 1800, unit="с"),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="abandoned_object",
    ),
    Module(
        "weapon", "Оружие", "security", "camera", "B",
        "ИИ-зрение проверяет каждого входящего на видимое оружие.",
        params=(ParamSpec("max_per_hour", "Лимит проверок в час", "int", 120, 1, 1000),),
        event_type="weapon_detected",
    ),
    Module(
        "fire_smoke", "Огонь и дым", "security", "camera", "B",
        "ИИ-зрение фиксирует огонь/задымление. Дополнение к датчикам, не замена.",
        params=(ParamSpec("max_per_hour", "Лимит проверок в час", "int", 60, 1, 600),),
        event_type="fire_smoke",
    ),
    Module(
        "lpr", "Автономера (LPR)", "security", "camera", "C",
        "Распознавание госномеров для шлагбаумов и белых списков.",
        params=(ParamSpec("whitelist", "Белый список номеров", "text", ""),),
        event_type="plate_recognized",
        requires_model="ALPR (детектор номера + OCR)",
    ),
    Module(
        "illegal_parking", "Неправильная парковка", "security", "zone", "A",
        "Транспорт, стоящий в запретной зоне (под знаком, на газоне) дольше порога.",
        params=(
            ParamSpec("idle_s", "Стоит дольше", "int", 120, 10, 7200, unit="с"),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="illegal_parking",
    ),
    # ─ Стройка и промышленность ─
    Module(
        "ppe", "СИЗ: каска и жилет", "construction", "zone", "B",
        "ИИ-зрение проверяет наличие каски/жилета у людей в зоне работ.",
        params=(
            ParamSpec(
                "items", "Что проверять", "select", "helmet_vest",
                options=("helmet", "vest", "helmet_vest"),
            ),
            ParamSpec("max_per_hour", "Лимит проверок в час", "int", 90, 1, 600),
        ),
        event_type="ppe_violation",
    ),
    Module(
        "danger_zone", "Опасная зона (присутствие)", "construction", "zone", "A",
        "Тревога о человеке в опасной зоне (у механизмов, под краном).",
        params=(ParamSpec("cooldown_s", "Пауза между тревогами", "int", 120, 5, 3600, unit="с"),),
        event_type="zone_intrusion",
    ),
    Module(
        "equipment_idle", "Простой техники", "construction", "camera", "A",
        "Фиксация транспорта/техники, стоящей без движения дольше порога.",
        params=(ParamSpec("idle_s", "Простой дольше", "int", 300, 30, 7200, unit="с"),),
        event_type="equipment_idle",
    ),
    # ─ Логистика и склады ─
    Module(
        "loading_zone", "Контроль загрузочной зоны", "logistics", "zone", "A",
        "Присутствие транспорта в зоне погрузки/разгрузки и время простоя.",
        params=(ParamSpec("dwell_s", "Порог простоя", "int", 120, 10, 7200, unit="с"),),
        event_type="loading_activity",
    ),
    Module(
        "crowd", "Скопление людей", "logistics", "zone", "A",
        "Тревога, когда в зоне одновременно больше порога людей.",
        params=(
            ParamSpec("threshold", "Порог людей", "int", 8, 2, 100),
            ParamSpec("cooldown_s", "Пауза между тревогами", "int", 300, 5, 3600, unit="с"),
        ),
        event_type="crowd_gathering",
    ),
    Module(
        "package_damage", "Повреждение упаковки", "logistics", "camera", "B",
        "ИИ-зрение отмечает повреждённые коробки/паллеты (экспериментально).",
        params=(ParamSpec("max_per_hour", "Лимит проверок в час", "int", 30, 1, 300),),
        event_type="package_damage",
    ),
)


_BY_KEY: dict[str, Module] = {m.key: m for m in MODULES}


def module_by_key(key: str) -> Module | None:
    return _BY_KEY.get(key)


def _param_dict(p: ParamSpec) -> dict[str, object]:
    d: dict[str, object] = {"key": p.key, "label": p.label, "type": p.type, "default": p.default}
    if p.min is not None:
        d["min"] = p.min
    if p.max is not None:
        d["max"] = p.max
    if p.options is not None:
        d["options"] = list(p.options)
    if p.unit is not None:
        d["unit"] = p.unit
    return d


def catalog() -> dict[str, object]:
    """Сериализованный каталог для API/фронта: категории, tier-метки, модули."""
    return {
        "categories": [{"key": k, "label": v} for k, v in CATEGORIES],
        "tiers": [{"key": k, "label": v} for k, v in TIERS.items()],
        "modules": [
            {
                "key": m.key,
                "name": m.name,
                "category": m.category,
                "scope": m.scope,
                "tier": m.tier,
                "description": m.description,
                "event_type": m.event_type,
                "requires_model": m.requires_model,
                "params": [_param_dict(p) for p in m.params],
            }
            for m in MODULES
        ],
    }
