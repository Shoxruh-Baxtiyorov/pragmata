"""users.totp_enabled — TOTP-2FA подтверждён и активен (секрет уже в 0007)

Revision ID: 0008
Revises: 0007
Create Date: 2026-07-19

"""
from alembic import op
import sqlalchemy as sa

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "totp_enabled")
