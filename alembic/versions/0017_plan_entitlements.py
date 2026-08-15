"""plans.entitlements — права подписки (модули/разделы/под-функции) + отраслевые пакеты

Revision ID: 0017
Revises: 0016
Create Date: 2026-08-12

Плану добавляется словарь entitlements: какие модули аналитики, разделы
приложения и под-функции (напр. категории Face ID) открыты. Пустой {} =
полный доступ (обратная совместимость: basic/pro/enterprise ничего не теряют).
Добавляем готовые отраслевые пакеты (Школа/Ритейл/Парковка/Офис/Склад) с
ограниченными наборами — как обещано в деке.
"""

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None

# key, name, price_note, ret_info, ret_alert, sort, features(display), entitlements
PACKAGES = [
    (
        "school",
        "Maktab (Школа)",
        "по числу камер",
        30,
        180,
        10,
        [
            "Зоны и вход/выход по лицу",
            "Тревоги: оружие, огонь, толпа",
            "Без категории «Гость»",
            "AI-ассистент",
        ],
        {
            "modules": [
                "zone_intrusion",
                "loitering",
                "after_hours",
                "crowd",
                "danger_zone",
                "weapon",
                "fire_smoke",
                "abandoned_object",
            ],
            "features": ["assistant", "journal", "watchlist", "stats"],
            "person_categories": ["employee", "contractor", "watchlist", "banned", "other"],
        },
    ),
    (
        "retail",
        "Riteyl (Ритейл)",
        "по числу камер",
        30,
        90,
        20,
        ["Подсчёт посетителей, очереди", "Тепловая карта", "Гигиена (VLM)", "Face ID + ассистент"],
        {
            "modules": [
                "visitor_count",
                "queue_length",
                "heatmap",
                "hygiene",
                "zone_intrusion",
                "after_hours",
                "abandoned_object",
                "crowd",
                "vehicle",
            ],
            "features": ["assistant", "journal", "watchlist", "heatmap", "stats"],
        },
    ),
    (
        "parking",
        "Avtoturargoh (Парковка)",
        "по числу камер",
        30,
        90,
        30,
        ["Автономера (LPR)", "Неправильная парковка", "Транспорт в кадре", "Без Face ID"],
        {
            "modules": ["lpr", "illegal_parking", "vehicle"],
            "features": ["stats"],
            "person_categories": [],
        },
    ),
    (
        "office",
        "Ofis (Офис/банк)",
        "по числу камер",
        60,
        180,
        40,
        [
            "Зоны, нерабочие часы",
            "Автономера + турникеты",
            "Face ID + поиск + архив",
            "AI-ассистент",
        ],
        {
            "modules": [
                "zone_intrusion",
                "after_hours",
                "loitering",
                "lpr",
                "vehicle",
                "abandoned_object",
            ],
            "features": [
                "assistant",
                "journal",
                "watchlist",
                "stats",
                "search",
                "archive",
                "turnstile",
            ],
        },
    ),
    (
        "warehouse",
        "Ombor (Склад)",
        "по числу камер",
        30,
        120,
        50,
        [
            "Загрузочные зоны, простой техники",
            "СИЗ + опасные зоны",
            "Повреждение упаковки (VLM)",
            "AI-ассистент",
        ],
        {
            "modules": [
                "loading_zone",
                "package_damage",
                "equipment_idle",
                "ppe",
                "danger_zone",
                "crowd",
                "zone_intrusion",
                "after_hours",
                "vehicle",
            ],
            "features": ["assistant", "journal", "stats"],
        },
    ),
]


def upgrade() -> None:
    op.add_column(
        "plans",
        sa.Column("entitlements", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
    )
    plans = sa.table(
        "plans",
        sa.column("key", sa.String),
        sa.column("name", sa.String),
        sa.column("price_note", sa.String),
        sa.column("retention_info_days", sa.Integer),
        sa.column("retention_alert_days", sa.Integer),
        sa.column("sort", sa.Integer),
        sa.column("active", sa.Boolean),
        sa.column("features", JSONB),
        sa.column("entitlements", JSONB),
    )
    op.bulk_insert(
        plans,
        [
            {
                "key": k,
                "name": n,
                "price_note": p,
                "retention_info_days": ri,
                "retention_alert_days": ra,
                "sort": s,
                "active": True,
                "features": f,
                "entitlements": e,
            }
            for (k, n, p, ri, ra, s, f, e) in PACKAGES
        ],
    )


def downgrade() -> None:
    keys = tuple(k for (k, *_rest) in PACKAGES)
    op.execute(
        sa.text("DELETE FROM plans WHERE key IN :keys").bindparams(
            sa.bindparam("keys", value=keys, expanding=True)
        )
    )
    op.drop_column("plans", "entitlements")
