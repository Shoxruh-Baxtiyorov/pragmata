"""initial: sites, cameras, tracks, events + pgvector extension

Revision ID: 0001
Revises:
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "sites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "cameras",
        sa.Column("id", sa.String(64), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "tracks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("camera_id", sa.String(64), sa.ForeignKey("cameras.id"), nullable=False),
        sa.Column("track_id", sa.BigInteger(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("frames", sa.BigInteger(), nullable=False),
        sa.Column("best_frame_path", sa.String(500), nullable=True),
        sa.Column("face_crop_path", sa.String(500), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
    )
    op.create_index("ix_tracks_camera_started", "tracks", ["camera_id", "started_at"])

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False),
        sa.Column("camera_id", sa.String(64), sa.ForeignKey("cameras.id"), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("severity", sa.String(16), nullable=False),
        sa.Column("zone", sa.String(128), nullable=True),
        sa.Column("t_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("t_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_s", sa.Float(), nullable=False, server_default="0"),
        sa.Column("frame_path", sa.String(500), nullable=True),
        sa.Column("face_path", sa.String(500), nullable=True),
        sa.Column("clip_path", sa.String(500), nullable=True),
        sa.Column("description", sa.String(2000), nullable=True),
        sa.Column("meta", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_events_camera_tstart", "events", ["camera_id", "t_start"])
    op.create_index("ix_events_type_tstart", "events", ["type", "t_start"])
    op.create_index("ix_events_severity_tstart", "events", ["severity", "t_start"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("tracks")
    op.drop_table("cameras")
    op.drop_table("sites")
