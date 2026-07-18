"""Динамический конфиг в БД (зоны/правила/настройки камер/рабочие часы) + watchlist

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-18

"""
from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- site: рабочие часы + время дайджеста ---
    op.add_column("sites", sa.Column("working_hours", postgresql.JSONB(), nullable=True))
    op.add_column("sites", sa.Column("digest_time", sa.String(8), server_default="20:00", nullable=False))

    # --- config version (одна строка, bump = перезагрузка пайплайна) ---
    op.create_table(
        "config_version",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("version", sa.BigInteger(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.execute("INSERT INTO config_version (id, version) VALUES (1, 1)")

    # --- camera: параметры обработки ---
    op.add_column("cameras", sa.Column("enabled", sa.Boolean(), server_default="true", nullable=False))
    op.add_column("cameras", sa.Column("process_fps", sa.Float(), server_default="5", nullable=False))
    op.add_column("cameras", sa.Column("detect_conf", sa.Float(), server_default="0.35", nullable=False))
    op.add_column("cameras", sa.Column("detect_imgsz", sa.Integer(), server_default="640", nullable=False))
    op.add_column("cameras", sa.Column("motion", postgresql.JSONB(), server_default="{}", nullable=False))
    op.add_column("cameras", sa.Column("clips", postgresql.JSONB(), server_default="{}", nullable=False))

    # --- zones ---
    op.create_table(
        "zones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("camera_id", sa.String(64), sa.ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("type", sa.String(32), server_default="restricted", nullable=False),
        sa.Column("polygon", postgresql.JSONB(), nullable=False),
        sa.Column("rules", postgresql.JSONB(), server_default="{}", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_zones_camera", "zones", ["camera_id"])

    # --- persons (watchlist) ---
    op.create_table(
        "persons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("watch", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("clip_emb", Vector(512), nullable=True),
        sa.Column("ref_photo_path", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.add_column(
        "tracks",
        sa.Column(
            "person_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("persons.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("tracks", "person_id")
    op.drop_table("persons")
    op.drop_index("ix_zones_camera", table_name="zones")
    op.drop_table("zones")
    for c in ("clips", "motion", "detect_imgsz", "detect_conf", "process_fps", "enabled"):
        op.drop_column("cameras", c)
    op.drop_table("config_version")
    op.drop_column("sites", "digest_time")
    op.drop_column("sites", "working_hours")
