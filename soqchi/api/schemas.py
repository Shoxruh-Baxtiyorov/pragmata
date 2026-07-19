"""Pydantic-схемы Dashboard API (контракт для фронта — см. /docs)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    # username пуст → break-glass вход по ADMIN_PASSWORD (совместимость + бутстрап)
    username: str | None = None
    password: str
    code: str | None = None  # TOTP-код второго фактора (если 2FA включена)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str = "admin"
    username: str = "admin"
    # True → пароль верный, но нужен TOTP-код: клиент повторяет логин с code
    mfa_required: bool = False


class TotpSetupOut(BaseModel):
    secret: str  # для ручного ввода, если QR не отсканировать
    otpauth_uri: str
    qr_svg: str  # data:image/svg+xml;base64,... — можно сразу в <img src>


class TotpCode(BaseModel):
    code: str


class TotpStatus(BaseModel):
    enabled: bool


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "user"  # user | admin
    full_name: str | None = None
    email: str | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    is_active: bool
    full_name: str | None
    email: str | None
    last_login_at: datetime | None
    locked: bool


class UserPatch(BaseModel):
    role: str | None = None
    full_name: str | None = None
    is_active: bool | None = None


class PasswordChange(BaseModel):
    new_password: str


class ZoneOut(BaseModel):
    id: uuid.UUID | None = None
    name: str
    type: str
    polygon: list[tuple[float, float]]
    rules: dict[str, object] = {}


class CameraOut(BaseModel):
    id: str
    name: str
    online: bool
    snapshot_url: str | None
    zones: list[ZoneOut]
    enabled: bool = True


class CameraIn(BaseModel):
    id: str
    name: str
    url: str
    process_fps: float = 4.0
    detect_conf: float = 0.35
    detect_imgsz: int = 640
    clips_enabled: bool = False


class CameraPatch(BaseModel):
    name: str | None = None
    url: str | None = None
    enabled: bool | None = None
    process_fps: float | None = None
    detect_conf: float | None = None
    detect_imgsz: int | None = None
    clips_enabled: bool | None = None


class ZoneIn(BaseModel):
    name: str
    type: str = "restricted"
    polygon: list[tuple[float, float]]
    zone_intrusion: bool = True
    hysteresis_frames: int = 6
    intrusion_cooldown_s: float = 300.0
    loitering: bool = False
    dwell_s: float = 60.0


class EventOut(BaseModel):
    id: uuid.UUID
    camera_id: str
    camera: str
    type: str
    severity: str
    zone: str | None
    t_start: datetime
    t_end: datetime
    duration_s: float
    description: str | None
    people_in_zone: int | None
    photo_url: str | None
    face_url: str | None
    clip_url: str | None


class EventsPage(BaseModel):
    total: int
    items: list[EventOut]


class StatsOut(BaseModel):
    hours: float
    visitors_entered: int
    alerts: int
    false_positives: int
    by_type: dict[str, int]
    by_camera: dict[str, int]


class HourBucket(BaseModel):
    hour: str  # "14:00"
    events: int
    alerts: int


class OverviewOut(BaseModel):
    visitors_today: int
    alerts_today: int
    cameras_online: int
    cameras_total: int
    false_positives_today: int
    hourly: list[HourBucket]
    recent_alerts: list["EventOut"]


class SystemCamera(BaseModel):
    id: str
    name: str
    online: bool
    last_event: datetime | None
    events_24h: int


class SystemOut(BaseModel):
    site_name: str
    timezone: str
    cameras: list[SystemCamera]
    yolo_model: str
    agent_enabled: bool
    vlm_enabled: bool
    face_recognition: bool
    weapon_detection: bool
    vehicle_detection: bool
    offline_mode: bool  # весь AI локальный
    media_dir: str
    events_total: int


class PersonAppearance(BaseModel):
    time: datetime
    camera: str
    type: str
    photo_url: str | None


class DigestOut(BaseModel):
    text: str


class FeedbackIn(BaseModel):
    verdict: str  # false_positive | confirmed


class FindItem(BaseModel):
    time: datetime
    camera: str
    similarity: float
    photo_url: str | None


class OkOut(BaseModel):
    ok: bool = True


class AgentAsk(BaseModel):
    question: str
    session_id: str = "web"


class MediaEvidence(BaseModel):
    caption: str
    photo_url: str | None = None
    clip_url: str | None = None


class AgentAnswer(BaseModel):
    text: str
    evidence: list[MediaEvidence]


class PersonOut(BaseModel):
    id: uuid.UUID
    name: str
    note: str | None
    watch: bool
    photo_url: str | None
    seen_count: int


class PersonCreate(BaseModel):
    name: str
    note: str | None = None
    watch: bool = False
    track_id: uuid.UUID  # взять эталонный эмбеддинг+фото у этого трека


class PersonPatch(BaseModel):
    name: str | None = None
    note: str | None = None
    watch: bool | None = None
