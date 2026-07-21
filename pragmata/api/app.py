"""Dashboard API — бэкенд веб-фронта (и будущего приложения).

Запуск:  make api  (uv run uvicorn pragmata.api.app:app --port 8088)
OpenAPI: http://127.0.0.1:8088/docs  ·  контракт для фронта = /openapi.json

Раскладка по стандарту iqbola-backend (адаптирована к нашему single-tenant
on-prem): routers/ (тонкие) → services/ (логика) → db/ (модели/запросы),
core/ (rate-limit), middleware (security-заголовки). Мультитенантность/RLS/RBAC
из Iqbola здесь НЕ нужны — один объект, один админ.

Отдельный процесс от пайплайна: живые кадры берёт из data/live/*.jpg
(пайплайн пишет их атомарно раз в ~2с), события/медиа — из Postgres и data/.
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pragmata.api.middleware import AuditMiddleware, SecurityHeadersMiddleware
from pragmata.api.routers import (
    agent,
    archive,
    auth,
    backoffice,
    cameras,
    events,
    insights,
    users,
    watchlist,
)
from pragmata.config import get_settings

app = FastAPI(
    title="Pragmata AI API",
    version="0.1.0",
    description="AI Security Copilot — dashboard backend",
)

_settings = get_settings()
# порядок важен: audit добавляется первым → выполняется ПОСЛЕ CORS-обработки,
# поэтому preflight-OPTIONS в журнал не попадают
app.add_middleware(AuditMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _settings.api_cors_origins.split(",") if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (
    auth.router,
    cameras.router,
    events.router,
    insights.router,
    agent.router,
    watchlist.router,
    users.router,
    archive.router,
    backoffice.router,
):
    app.include_router(r)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
