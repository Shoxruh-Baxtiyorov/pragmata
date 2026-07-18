"""События: лента с фильтрами, медиа-доказательства, feedback."""

from __future__ import annotations

import uuid  # noqa: TC003 — uuid.UUID в сигнатурах роутов резолвит FastAPI в рантайме

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response  # noqa: TC002 — FastAPI резолвит в рантайме

from soqchi.api.schemas import EventsPage, FeedbackIn, OkOut
from soqchi.api.security import require_auth
from soqchi.services import events_service as svc

router = APIRouter(prefix="/api/v1", tags=["events"])


@router.get("/events/report.pdf")
def report(
    hours: float = Query(24, gt=0, le=24 * 30),
    camera_id: str | None = None,
    severity: str | None = None,
    _: str = Depends(require_auth),
) -> Response:
    from soqchi.services.report_service import build_report_pdf

    pdf = build_report_pdf(hours, camera_id, severity)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="soqchi-report.pdf"'},
    )


@router.get("/events", response_model=EventsPage)
def events(
    hours: float = Query(24, gt=0, le=24 * 30),
    camera_id: str | None = None,
    type: str | None = None,  # noqa: A002 — имя из контракта API
    severity: str | None = None,
    zone: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _: str = Depends(require_auth),
) -> EventsPage:
    return svc.list_events(hours, camera_id, type, severity, zone, limit, offset)


@router.get("/events/{event_id}/photo")
def event_photo(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return svc.event_media(event_id, "photo")


@router.get("/events/{event_id}/face")
def event_face(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return svc.event_media(event_id, "face")


@router.get("/events/{event_id}/clip")
def event_clip(event_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return svc.event_media(event_id, "clip")


@router.post("/events/{event_id}/feedback", response_model=OkOut)
def event_feedback(
    event_id: uuid.UUID, payload: FeedbackIn, _: str = Depends(require_auth)
) -> OkOut:
    if payload.verdict not in ("false_positive", "confirmed"):
        raise HTTPException(422, "verdict: false_positive | confirmed")
    svc.save_feedback(event_id, payload.verdict)
    return OkOut()


@router.get("/tracks/{track_id}/photo")
def track_photo(track_id: uuid.UUID, _: str = Depends(require_auth)) -> FileResponse:
    return svc.track_photo(track_id)
