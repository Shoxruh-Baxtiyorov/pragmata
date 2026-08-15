"""Коннекторы к турникету. Абстракция ``open()`` — «открыть проход».

Универсальный путь — сухой контакт через IP/HTTP-реле (RelayConnector): работает
почти с любым турникетом, у которого есть вход «открыть». Вендорные SDK
(Hikvision/ZKTeco/…) добавляются как новые коннекторы, не меняя вызывающий код.
"""

from __future__ import annotations

import logging
from typing import Any, Protocol

log = logging.getLogger(__name__)


class TurnstileConnector(Protocol):
    def open(self, reason: str) -> bool:
        """Открыть проход. True — команда доставлена. Не бросает исключений."""
        ...


class NullConnector:
    """Лог-онли: физически ничего не открывает (monitor-режим и тесты)."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config

    def open(self, reason: str) -> bool:
        log.info("turnstile NULL open (%s)", reason)
        return True


class RelayConnector:
    """Сухой контакт через HTTP/IP-реле: запрос на config['url'] замыкает
    вход «открыть». config: {url, method?=POST, token?, timeout_s?=4}."""

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config

    def open(self, reason: str) -> bool:
        import httpx

        url = str(self.config.get("url") or "").strip()
        if not url:
            log.warning("relay open: пустой url в config")
            return False
        method = str(self.config.get("method") or "POST").upper()
        headers: dict[str, str] = {}
        token = self.config.get("token")
        if token:
            headers["Authorization"] = f"Bearer {token}"
        try:
            timeout = float(self.config.get("timeout_s") or 4)
        except (TypeError, ValueError):
            timeout = 4.0
        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.request(method, url, headers=headers)
            ok = resp.status_code < 400
            log.info("relay open %s → %s (%s)", url, resp.status_code, reason)
            return ok
        except Exception as err:  # noqa: BLE001 — сеть/таймаут не должны ронять API
            log.warning("relay open failed (%s): %s", url, err)
            return False


def make_connector(kind: str, config: dict[str, Any]) -> TurnstileConnector:
    if kind == "relay":
        return RelayConnector(config)
    return NullConnector(config)
