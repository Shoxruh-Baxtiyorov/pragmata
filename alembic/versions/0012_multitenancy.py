"""мультиарендность: sites = организация-клиент, users/persons привязаны к ней

Revision ID: 0012
Revises: 0011
Create Date: 2026-07-22

Модель: admin — платформа (владелец продукта), видит всё; user — клиент,
принадлежит организации и видит только её камеры/события/людей.

sites уже был единицей объекта (имя, часовой пояс, рабочие часы, дайджест) и
уже проставлен на cameras/events — поэтому он и становится арендатором, а не
новая параллельная сущность. Дорогого бэкфила на events не требуется.

Остальное скоупится транзитивно: zones/tracks/archive_jobs → через камеру,
feedback → через событие, person_photos → через человека.
"""
from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # NULL = платформенный админ: он не принадлежит ни одной организации
    op.add_column("users", sa.Column("site_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_users_site", "users", "sites", ["site_id"], ["id"])
    op.create_index("ix_users_site_id", "users", ["site_id"])

    # реестр людей принадлежит организации (не привязан к камере)
    op.add_column("persons", sa.Column("site_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_persons_site", "persons", "sites", ["site_id"], ["id"])
    op.create_index("ix_persons_site_id", "persons", ["site_id"])

    # существующие данные — первой организации; админы остаются без site_id
    op.execute("UPDATE persons SET site_id = 1 WHERE site_id IS NULL")
    op.execute("UPDATE users SET site_id = 1 WHERE site_id IS NULL AND role <> 'admin'")


def downgrade() -> None:
    op.drop_index("ix_persons_site_id", table_name="persons")
    op.drop_constraint("fk_persons_site", "persons", type_="foreignkey")
    op.drop_column("persons", "site_id")
    op.drop_index("ix_users_site_id", table_name="users")
    op.drop_constraint("fk_users_site", "users", type_="foreignkey")
    op.drop_column("users", "site_id")
