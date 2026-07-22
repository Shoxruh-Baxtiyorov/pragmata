"""ретенция по тарифу организации + привязка Telegram-чата к организации

Revision ID: 0013
Revises: 0012
Create Date: 2026-07-22

Ретенция (решение владельца): срок зависит от важности события и от тарифа
организации. Рутина (info) тает быстро, улики (alert/warning) живут долго.
Удаляются ТОЛЬКО файлы — строка события остаётся, чтобы история статистики
за год не пропадала: 3656 строк весят байты, а 38k кадров — 2.9 ГБ.

Telegram: один бот на всех, но чат привязан к организации, иначе тревога
одного клиента улетит в чат другого. bind_code — одноразовый код привязки.
"""
from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None

# базовый тариф: рутина неделю, улики три месяца
DEFAULT_INFO_DAYS = 7
DEFAULT_ALERT_DAYS = 90


def upgrade() -> None:
    op.add_column(
        "sites",
        sa.Column("tariff", sa.String(16), nullable=False, server_default="basic"),
    )
    op.add_column(
        "sites",
        sa.Column(
            "retention_info_days",
            sa.Integer(),
            nullable=False,
            server_default=str(DEFAULT_INFO_DAYS),
        ),
    )
    op.add_column(
        "sites",
        sa.Column(
            "retention_alert_days",
            sa.Integer(),
            nullable=False,
            server_default=str(DEFAULT_ALERT_DAYS),
        ),
    )
    # аварийный тормоз: 0 = без ограничения по объёму
    op.add_column(
        "sites",
        sa.Column("media_quota_gb", sa.Integer(), nullable=False, server_default="0"),
    )
    # чтобы не чистить одно и то же по кругу и видеть, когда прибирались
    op.add_column("sites", sa.Column("media_cleaned_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("chats", sa.Column("site_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_chats_site", "chats", "sites", ["site_id"], ["id"])
    op.add_column("chats", sa.Column("bind_code", sa.String(16), nullable=True))
    op.execute("UPDATE chats SET site_id = 1 WHERE site_id IS NULL")


def downgrade() -> None:
    op.drop_column("chats", "bind_code")
    op.drop_constraint("fk_chats_site", "chats", type_="foreignkey")
    op.drop_column("chats", "site_id")
    for col in (
        "media_cleaned_at",
        "media_quota_gb",
        "retention_alert_days",
        "retention_info_days",
        "tariff",
    ):
        op.drop_column("sites", col)
