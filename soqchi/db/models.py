from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from soqchi.core.encryption import EncryptedString


class Base(DeclarativeBase):
    pass


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Tashkent")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)  # id из конфига объекта
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), default=1)
    name: Mapped[str] = mapped_column(String(200))
    # RTSP-URL несёт логин/пароль камеры → шифруется на уровне колонки (Fernet).
    # Ciphertext ~3–4x длиннее плейнтекста — держим запас.
    url: Mapped[str] = mapped_column(EncryptedString(512))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id: Mapped[str] = mapped_column(ForeignKey("cameras.id"))
    track_id: Mapped[int] = mapped_column(BigInteger)  # id ByteTrack внутри камеры (не глобальный)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    frames: Mapped[int] = mapped_column(BigInteger, default=0)
    best_frame_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_crop_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    __table_args__ = (Index("ix_tracks_camera_started", "camera_id", "started_at"),)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), default=1)
    camera_id: Mapped[str] = mapped_column(ForeignKey("cameras.id"))
    type: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16))
    zone: Mapped[str | None] = mapped_column(String(128), nullable=True)
    t_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    t_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    duration_s: Mapped[float] = mapped_column(Float, default=0.0)
    frame_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    face_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    clip_path: Mapped[str | None] = mapped_column(String(500), nullable=True)  # неделя 2
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)  # VLM, неделя 3
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_events_camera_tstart", "camera_id", "t_start"),
        Index("ix_events_type_tstart", "type", "t_start"),
        Index("ix_events_severity_tstart", "severity", "t_start"),
    )
