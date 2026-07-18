"""Pydantic-схемы Dashboard API (контракт для фронта — см. /docs)."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ZoneOut(BaseModel):
    name: str
    type: str
    polygon: list[tuple[float, float]]


class CameraOut(BaseModel):
    id: str
    name: str
    online: bool
    snapshot_url: str | None
    zones: list[ZoneOut]


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
