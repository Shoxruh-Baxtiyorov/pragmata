"""person_folders (дерево) + person_categories (редактируемые) + persons.folder_id

Revision ID: 0019
Revises: 0018
Create Date: 2026-08-15

Люди теперь организуются в дерево папок (напр. Школа → 5-е классы → 5-А) и имеют
редактируемый per-site список категорий. Список категорий пуст по умолчанию —
клиент заводит свои (папки и категории строит сам, как в файловом менеджере).
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "person_folders",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False, server_default="1"),
        sa.Column("parent_id", UUID(as_uuid=True), sa.ForeignKey("person_folders.id"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_person_folders_site", "person_folders", ["site_id"])
    op.create_index("ix_person_folders_parent", "person_folders", ["parent_id"])

    op.create_table(
        "person_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False, server_default="1"),
        sa.Column("key", sa.String(40), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("sort", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        "ix_person_categories_site_key", "person_categories", ["site_id", "key"], unique=True
    )

    op.add_column(
        "persons",
        sa.Column("folder_id", UUID(as_uuid=True), sa.ForeignKey("person_folders.id"), nullable=True),
    )
    op.create_index("ix_persons_folder", "persons", ["folder_id"])


def downgrade() -> None:
    op.drop_index("ix_persons_folder", table_name="persons")
    op.drop_column("persons", "folder_id")
    op.drop_index("ix_person_categories_site_key", table_name="person_categories")
    op.drop_table("person_categories")
    op.drop_index("ix_person_folders_parent", table_name="person_folders")
    op.drop_index("ix_person_folders_site", table_name="person_folders")
    op.drop_table("person_folders")
