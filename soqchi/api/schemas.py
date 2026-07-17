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
    by_type: dict[str, int]
    by_camera: dict[str, int]


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
