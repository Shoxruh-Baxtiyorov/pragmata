"""persons.category/position + person_photos — реестр людей (сотрудники и т.д.)

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-19

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import UUID

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "persons",
        sa.Column("category", sa.String(32), nullable=False, server_default="other"),
    )
    op.add_column("persons", sa.Column("position", sa.String(200), nullable=True))
    op.create_table(
        "person_photos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "person_id",
            UUID(as_uuid=True),
            sa.ForeignKey("persons.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("path", sa.String(500), nullable=False),
        sa.Column("face_emb", Vector(512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_person_photos_person_id", "person_photos", ["person_id"])


def downgrade() -> None:
    op.drop_index("ix_person_photos_person_id", table_name="person_photos")
    op.drop_table("person_photos")
    op.drop_column("persons", "position")
    op.drop_column("persons", "category")
