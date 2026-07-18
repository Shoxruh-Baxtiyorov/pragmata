from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
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
    # рабочий календарь {days:[...], open:"08:00", close:"18:00"}; null = after_hours выкл
    working_hours: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    digest_time: Mapped[str] = mapped_column(String(8), default="20:00")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ConfigVersion(Base):
    """Один ряд (id=1). Bump version при любой правке конфига → пайплайн перезагружается."""

    __tablename__ = "config_version"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    version: Mapped[int] = mapped_column(BigInteger, default=1)
    updated_at: Mapped[datetime] = mapped_column(
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
    enabled: Mapped[bool] = mapped_column(default=True)
    process_fps: Mapped[float] = mapped_column(Float, default=5.0)
    detect_conf: Mapped[float] = mapped_column(Float, default=0.35)
    detect_imgsz: Mapped[int] = mapped_column(default=640)
    motion: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # MotionConfig
    clips: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # ClipConfig
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    camera_id: Mapped[str] = mapped_column(ForeignKey("cameras.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(128))
    type: Mapped[str] = mapped_column(String(32), default="restricted")
    polygon: Mapped[list[list[float]]] = mapped_column(JSONB)  # [[x,y],...] нормализ. 0..1
    rules: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # ZoneRules
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("ix_zones_camera", "camera_id"),)


class Person(Base):
    """Watchlist: именованный человек с эталонным CLIP-эмбеддингом (L2)."""

    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    watch: Mapped[bool] = mapped_column(default=False)  # алертить при появлении
    clip_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
    ref_photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
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
    # CLIP ViT-B/32 эмбеддинг лучшего кропа — поиск человека по текстовому описанию
    clip_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
    # watchlist-совпадение (L2): к какому именованному человеку отнесён трек
    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True
    )
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    __table_args__ = (Index("ix_tracks_camera_started", "camera_id", "started_at"),)


class Chat(Base):
    __tablename__ = "chats"

    chat_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    role: Mapped[str] = mapped_column(String(16), default="viewer")
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("events.id"))
    chat_id: Mapped[int] = mapped_column(BigInteger)
    verdict: Mapped[str] = mapped_column(String(16))  # false_positive | confirmed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (Index("ix_feedback_event", "event_id"),)


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
