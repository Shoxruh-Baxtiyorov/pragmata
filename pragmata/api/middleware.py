"""Security-заголовки на все ответы (паттерн middleware/security_headers.py в iqbola)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("pragmata.audit")

if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

    from starlette.requests import Request
    from starlette.responses import Response

_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Resource-Policy": "same-site",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        for k, v in _HEADERS.items():
            response.headers.setdefault(k, v)
        return response


# GET'ы, которые всё равно надо аудитить: выгрузка доказательств наружу.
# Остальные чтения не пишем — иначе журнал утонет в поллинге дашборда.
_AUDITED_GET = ("/api/v1/media", "/report.pdf", "/image", "/snapshot")
_MUTATING = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _is_audited(method: str, path: str) -> bool:
    if not path.startswith("/api/v1/"):
        return False
    if method in _MUTATING:
        return True
    return method == "GET" and any(path.endswith(s) or s in path for s in _AUDITED_GET)


class AuditMiddleware(BaseHTTPMiddleware):
    """Пишет журнал действий на КАЖДЫЙ изменяющий запрос и выгрузку медиа.

    Аудит именно здесь, а не по месту вызова: новый эндпоинт нельзя забыть
    зааудитить. Тело запроса НЕ читаем — в нём пароли; хватает кто/что/куда/итог.
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        method, path = request.method, request.url.path
        if not _is_audited(method, path):
            return response
        try:
            self._write(request, method, path, response.status_code)
        except Exception:  # noqa: BLE001 — аудит никогда не должен ронять запрос
            log.exception("не удалось записать аудит %s %s", method, path)
        return response

    @staticmethod
    def _write(request: Request, method: str, path: str, status: int) -> None:
        import uuid as _uuid

        from pragmata.api.deps import session_factory
        from pragmata.api.security import peek_token
        from pragmata.db.models import AuditLog

        sub, actor = peek_token(request.headers.get("authorization"))
        actor_id: _uuid.UUID | None = None
        if sub:
            try:
                actor_id = _uuid.UUID(sub)
            except ValueError:
                actor_id = None
        with session_factory()() as s:
            s.add(
                AuditLog(
                    actor_id=actor_id,
                    actor=actor[:64],
                    method=method,
                    path=path[:300],
                    status_code=status,
                    ip=request.client.host if request.client else None,
                )
            )
            s.commit()
