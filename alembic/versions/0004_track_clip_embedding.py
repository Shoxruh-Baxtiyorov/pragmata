"""tracks.clip_emb — CLIP ViT-B/32 эмбеддинг лучшего кропа (Investigation Mode)

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-14

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tracks", sa.Column("clip_emb", Vector(512), nullable=True))


def downgrade() -> None:
    op.drop_column("tracks", "clip_emb")
