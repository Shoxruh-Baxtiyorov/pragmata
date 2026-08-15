"""turnstiles — конфиг турникетов/СКУД поверх площадки

Revision ID: 0018
Revises: 0017
Create Date: 2026-08-12

Турникет привязан к площадке (site_id) и, опционально, к камере входа (camera_id):
события доступа падают в общую ленту events. Открытие делает коннектор
(connector + config). Гейтится фичей подписки 'turnstile'.
"""

import sqlalchemy as sa
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "turnstiles",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "site_id",
            sa.Integer(),
            sa.ForeignKey("sites.id"),
            nullable=False,
            server_default="1",
        ),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("camera_id", sa.String(), sa.ForeignKey("cameras.id"), nullable=True),
        sa.Column("mode", sa.String(16), nullable=False, server_default="monitor"),
        sa.Column("connector", sa.String(16), nullable=False, server_default="null"),
        sa.Column("config", JSONB, nullable=False, server_default=text("'{}'::jsonb")),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_turnstiles_site", "turnstiles", ["site_id"])


def downgrade() -> None:
    op.drop_index("ix_turnstiles_site", table_name="turnstiles")
    op.drop_table("turnstiles")
