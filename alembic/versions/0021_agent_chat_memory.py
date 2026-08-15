"""AI-ассистент: сохраняемые диалоги (agent_conversations/agent_messages) + память

Revision ID: 0021
Revises: 0020
Create Date: 2026-08-16

Чат ассистента теперь персистится, а `agent_memory` даёт долговременную память
(факты про объект), которую ассистент читает перед ответом и пополняет —
так он «помнит и учится» между сессиями.
"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_conversations",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False, server_default="1"),
        sa.Column("title", sa.String(200), nullable=False, server_default="Yangi suhbat"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agent_conversations_site", "agent_conversations", ["site_id"])
    op.create_index("ix_agent_conversations_updated", "agent_conversations", ["updated_at"])

    op.create_table(
        "agent_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "conversation_id",
            UUID(as_uuid=True),
            sa.ForeignKey("agent_conversations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("evidence", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agent_messages_conversation", "agent_messages", ["conversation_id"])
    op.create_index("ix_agent_messages_created", "agent_messages", ["created_at"])

    op.create_table(
        "agent_memory",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("site_id", sa.Integer(), sa.ForeignKey("sites.id"), nullable=False, server_default="1"),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("source", sa.String(16), nullable=False, server_default="user"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_agent_memory_site", "agent_memory", ["site_id"])


def downgrade() -> None:
    op.drop_index("ix_agent_memory_site", table_name="agent_memory")
    op.drop_table("agent_memory")
    op.drop_index("ix_agent_messages_created", table_name="agent_messages")
    op.drop_index("ix_agent_messages_conversation", table_name="agent_messages")
    op.drop_table("agent_messages")
    op.drop_index("ix_agent_conversations_updated", table_name="agent_conversations")
    op.drop_index("ix_agent_conversations_site", table_name="agent_conversations")
    op.drop_table("agent_conversations")
