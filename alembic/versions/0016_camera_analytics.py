"""cameras.analytics — конфиг камеро-ориентированных модулей аналитики

Revision ID: 0016
Revises: 0015
Create Date: 2026-07-27

Модули аналитики со scope=camera (подсчёт посетителей, тепловая карта, оружие,
огонь/дым, LPR, простой техники, повреждение упаковки) хранят свою настройку
здесь: {module_key: {"enabled": bool, ...параметры}}. Зон-ориентированные модули
живут в zones.rules (уже есть).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cameras",
        sa.Column(
            "analytics",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("cameras", "analytics")
