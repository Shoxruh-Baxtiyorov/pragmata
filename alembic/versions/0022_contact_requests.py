"""contact_requests — заявки с публичного лендинга (форма «Связаться»)

Revision ID: 0022
Revises: 0021
Create Date: 2026-08-16
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "contact_requests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("contact", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False, server_default=""),
        sa.Column("handled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contact_requests_created", "contact_requests", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_contact_requests_created", table_name="contact_requests")
    op.drop_table("contact_requests")
