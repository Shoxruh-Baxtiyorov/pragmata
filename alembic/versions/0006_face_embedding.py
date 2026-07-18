"""face_emb на tracks/persons — распознавание по лицу (insightface, L2)

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-18

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("persons", sa.Column("face_emb", Vector(512), nullable=True))
    op.add_column("tracks", sa.Column("face_emb", Vector(512), nullable=True))


def downgrade() -> None:
    op.drop_column("tracks", "face_emb")
    op.drop_column("persons", "face_emb")
