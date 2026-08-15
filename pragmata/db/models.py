from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, Float, ForeignKey, Index, String, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from pragmata.core.encryption import EncryptedString


class Base(DeclarativeBase):
    pass


class Plan(Base):
    """Каталог тарифов (Ko'z/Nazorat/Qalqon): витрина + дефолты хранения.

    site.tariff ссылается на key. Ретенция читает site.retention_* — план даёт
    дефолты при заведении организации и цену/фичи для UI, не онлайн-зависимость.
    """

    __tablename__ = "plans"

    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    price_note: Mapped[str] = mapped_column(String(200), default="")
    retention_info_days: Mapped[int] = mapped_column(default=7)
    retention_alert_days: Mapped[int] = mapped_column(default=90)
    sort: Mapped[int] = mapped_column(default=0)
    active: Mapped[bool] = mapped_column(default=True)
    features: Mapped[list[str]] = mapped_column(JSONB, default=list)
    # права подписки: какие модули/разделы/под-функции открыты (см. analytics.entitlements)
    entitlements: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Tashkent")
    # рабочий календарь {days:[...], open:"08:00", close:"18:00"}; null = after_hours выкл
    working_hours: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    digest_time: Mapped[str] = mapped_column(String(8), default="20:00")
    # Тариф задаёт глубину архива. Рутина (info) тает быстро, улики живут долго:
    # 73% событий — info, именно они съедают диск (≈1 ГБ на камеру в сутки).
    tariff: Mapped[str] = mapped_column(String(16), default="basic")  # basic | pro
    retention_info_days: Mapped[int] = mapped_column(default=7)
    retention_alert_days: Mapped[int] = mapped_column(default=90)
    media_quota_gb: Mapped[int] = mapped_column(default=0)  # 0 = без ограничения
    media_cleaned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    # мягкое удаление: события ссылаются на камеру (FK cascade), поэтому вместо
    # сноса строки прячем её из всех списков, а историю событий сохраняем
    deleted: Mapped[bool] = mapped_column(default=False, index=True)
    process_fps: Mapped[float] = mapped_column(Float, default=5.0)
    detect_conf: Mapped[float] = mapped_column(Float, default=0.35)
    detect_imgsz: Mapped[int] = mapped_column(default=640)
    motion: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # MotionConfig
    clips: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)  # ClipConfig
    # конфиг камеро-ориентированных модулей аналитики: {module_key: {enabled, ...}}
    analytics: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
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
    """Реестр известных людей: сотрудник/гость/наблюдение/бан. Эталон лица
    (усреднён по нескольким фото) → камеры узнают по имени. watch=алертить."""

    __tablename__ = "persons"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # реестр людей принадлежит организации: он не привязан к конкретной камере
    site_id: Mapped[int | None] = mapped_column(
        ForeignKey("sites.id"), nullable=True, index=True, default=1
    )
    name: Mapped[str] = mapped_column(String(200))
    # ключ категории из person_categories этой площадки (редактируемый список).
    # Необязательна: список категорий заводит сам клиент, по умолчанию пуст.
    category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # папка/группа для организации людей (напр. класс в школе); дерево — person_folders
    folder_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("person_folders.id"), nullable=True, index=True
    )
    position: Mapped[str | None] = mapped_column(String(200), nullable=True)  # должность/отдел
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    watch: Mapped[bool] = mapped_column(default=False)  # алертить при появлении
    clip_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
    # эталон лица (insightface, L2): усреднённый по всем фото person_photos
    face_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
    ref_photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PersonFolder(Base):
    """Папка для организации людей — дерево (напр. Школа → 5-е классы → 5-А).
    parent_id=NULL → корневая. Человек привязывается к одной папке (Person.folder_id)."""

    __tablename__ = "person_folders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), default=1, index=True)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("person_folders.id"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    sort: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class PersonCategory(Base):
    """Редактируемый per-site список категорий людей (Сотрудник/Гость/…). key —
    то, что хранится в Person.category. Дефолты сеет миграция; админ добавляет свои."""

    __tablename__ = "person_categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), default=1, index=True)
    key: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(80))
    sort: Mapped[int] = mapped_column(default=0)
    is_system: Mapped[bool] = mapped_column(default=False)  # базовая (её оставляем при сбросах)

    __table_args__ = (Index("ix_person_categories_site_key", "site_id", "key", unique=True),)


class PersonPhoto(Base):
    """Фото человека при регистрации; per-фото эмбеддинг лица → усредняем в Person."""

    __tablename__ = "person_photos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), index=True
    )
    path: Mapped[str] = mapped_column(String(500))
    face_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
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
    # эмбеддинг лица трека (insightface) — watchlist по лицу, если лицо видно
    face_emb: Mapped[list[float] | None] = mapped_column(Vector(512), nullable=True)
    # watchlist-совпадение (L2): к какому именованному человеку отнесён трек
    person_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True
    )
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)

    __table_args__ = (Index("ix_tracks_camera_started", "camera_id", "started_at"),)


class Chat(Base):
    __tablename__ = "chats"

    chat_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    # один бот на всех, но чат принадлежит организации: иначе тревога одного
    # клиента улетит в чат другого. bind_code — одноразовый код привязки.
    site_id: Mapped[int | None] = mapped_column(ForeignKey("sites.id"), nullable=True)
    bind_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
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
    # live = реальный поток; archive = ретро-анализ записи (форензика) — чтобы не
    # мешать статистику поста разбором старого архива
    source: Mapped[str] = mapped_column(String(16), default="live")
    meta: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        Index("ix_events_camera_tstart", "camera_id", "t_start"),
        Index("ix_events_type_tstart", "type", "t_start"),
        Index("ix_events_severity_tstart", "severity", "t_start"),
    )


class Turnstile(Base):
    """Турникет/СКУД поверх площадки: события доступа падают в общую ленту, а в
    режиме face_open — открытие по распознанному лицу. Гейтится фичей подписки
    'turnstile' (см. analytics.entitlements)."""

    __tablename__ = "turnstiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id"), default=1)
    name: Mapped[str] = mapped_column(String(120))
    # камера, смотрящая на вход — для сопоставления лиц и попадания событий в ленту
    camera_id: Mapped[str | None] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    # monitor = только события доступа; face_open = открывать по лицу (actuation, off by default)
    mode: Mapped[str] = mapped_column(String(16), default="monitor")
    connector: Mapped[str] = mapped_column(String(16), default="null")  # null | relay
    config: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb")
    )
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class User(Base):
    """Пользователь дашборда. Заводит админ; логин по username (не email).

    Задел под Google 2FA: поля email/totp_secret nullable — заполнятся, когда
    привяжем внешний вход, без новой миграции. Локаут per-account (в дополнение
    к IP-throttle): failed_attempts + locked_until.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # хранится в lower
    password_hash: Mapped[str] = mapped_column(String(255))
    # admin = платформа (видит всё, site_id пуст); user = клиент своей организации
    role: Mapped[str] = mapped_column(String(16), default="user")  # user | admin
    site_id: Mapped[int | None] = mapped_column(
        ForeignKey("sites.id"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    # 2FA (TOTP): секрет base32 (Fernet-шифрован), enabled=подтверждён кодом и активен
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    totp_secret: Mapped[str | None] = mapped_column(EncryptedString(255), nullable=True)
    totp_enabled: Mapped[bool] = mapped_column(default=False)
    # per-account brute-force
    failed_attempts: Mapped[int] = mapped_column(default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ArchiveJob(Base):
    """Задача ретро-анализа записи (форензика): статус фоновой обработки файла."""

    __tablename__ = "archive_jobs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename: Mapped[str] = mapped_column(String(300))
    file_path: Mapped[str] = mapped_column(String(500))
    camera_id: Mapped[str] = mapped_column(String(64))  # к какой камере относится запись
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))  # старт записи
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending|running|done|err
    progress: Mapped[float] = mapped_column(Float, default=0.0)  # 0..1
    events_found: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AuditLog(Base):
    """Кто/что/когда/откуда изменил или выгрузил. Требование госсектора.

    Пишется middleware'ом на КАЖДЫЙ изменяющий запрос — не по месту вызова,
    чтобы новый эндпоинт нельзя было забыть зааудитить. Имя актора хранится
    копией: запись должна пережить удаление пользователя.
    """

    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ts: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    actor: Mapped[str] = mapped_column(String(64), default="anonymous")  # копия username
    method: Mapped[str] = mapped_column(String(8))
    path: Mapped[str] = mapped_column(String(300))
    status_code: Mapped[int] = mapped_column()
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
