"""persons.category → nullable + очистка ранее засеянных дефолтных категорий

Revision ID: 0020
Revises: 0019
Create Date: 2026-08-16

Категория человека теперь необязательна (список категорий заводит сам клиент,
по умолчанию пуст). Ранее засеянные системные категории (is_system=true) удаляем,
чтобы у клиента с самого начала было чисто — как у папок.
"""

import sqlalchemy as sa

from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("persons", "category", existing_type=sa.String(32), nullable=True)
    # убрать дефолтные категории, если их успела засеять прежняя версия 0019
    op.execute("DELETE FROM person_categories WHERE is_system = true")


def downgrade() -> None:
    op.alter_column(
        "persons",
        "category",
        existing_type=sa.String(32),
        nullable=False,
        server_default="other",
    )
