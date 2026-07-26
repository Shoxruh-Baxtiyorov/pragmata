"""plans — редактируемый каталог тарифов (Ko'z / Nazorat / Qalqon)

Revision ID: 0015
Revises: 0014
Create Date: 2026-07-26

Тариф на организации (sites.tariff) — строка-ключ, ссылается на план из этого
каталога. План несёт глубину хранения (дефолты применяются при заведении
организации), цену и список фич. Ретенция по-прежнему читает site.retention_*,
поэтому план — источник дефолтов + витрина, а не онлайн-зависимость пайплайна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None

SEED = [
    ("basic", "Ko'z (Basic)", "40 000 сум / камера · мес", 7, 90, 10,
     ["Люди, вход/выход, тревоги", "Зоны, нерабочие часы", "Telegram-алерты", "AI-ассистент (базовый)"]),
    ("pro", "Nazorat (Pro)", "90 000 сум / камера · мес", 90, 90, 20,
     ["Всё из Basic", "Детекция оружия (VLM)", "Реестр лиц + watchlist", "Транспорт + номера (ANPR)",
      "Архив/форензика", "Поиск по внешности"]),
    ("enterprise", "Qalqon (Enterprise)", "от 150 000 сум + setup", 365, 365, 30,
     ["Всё из Pro", "Полный офлайн (air-gap)", "Аудит-лог, соответствие", "Кастомные правила + пульт",
      "Выделенный суппорт + SLA"]),
]


def upgrade() -> None:
    op.create_table(
        "plans",
        sa.Column("key", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("price_note", sa.String(200), nullable=False, server_default=""),
        sa.Column("retention_info_days", sa.Integer(), nullable=False, server_default="7"),
        sa.Column("retention_alert_days", sa.Integer(), nullable=False, server_default="90"),
        sa.Column("sort", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("features", JSONB, nullable=False, server_default="[]"),
    )
    plans = sa.table(
        "plans",
        sa.column("key", sa.String),
        sa.column("name", sa.String),
        sa.column("price_note", sa.String),
        sa.column("retention_info_days", sa.Integer),
        sa.column("retention_alert_days", sa.Integer),
        sa.column("sort", sa.Integer),
        sa.column("features", JSONB),
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
                "features": f,
            }
            for (k, n, p, ri, ra, s, f) in SEED
        ],
    )


def downgrade() -> None:
    op.drop_table("plans")
