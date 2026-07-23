"""cameras.deleted — настоящее удаление камеры без сноса истории событий

Revision ID: 0014
Revises: 0013
Create Date: 2026-07-23

События ссылаются на камеру FK'ом с ON DELETE CASCADE, поэтому снести строку
камеры = потерять всю её историю. Вместо этого помечаем удалённой и прячем из
всех списков — камера исчезает из UI, события остаются.
"""
from alembic import op
import sqlalchemy as sa

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "cameras",
        sa.Column("deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_cameras_deleted", "cameras", ["deleted"])


def downgrade() -> None:
    op.drop_index("ix_cameras_deleted", table_name="cameras")
    op.drop_column("cameras", "deleted")
