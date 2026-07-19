"""Brute-force lockout для логина (паттерн iqbola-backend, in-memory).

Single-node on-prem → память процесса достаточно (в Iqbola это Redis из-за
многих воркеров; у нас один uvicorn). Ключ — IP клиента.
"""

from __future__ import annotations

import threading
import time

MAX_ATTEMPTS = 5
WINDOW_S = 300.0  # 5 попыток за 5 минут
LOCKOUT_S = 900.0  # затем блок на 15 минут


class LoginThrottle:
    def __init__(
        self,
        max_attempts: int = MAX_ATTEMPTS,
        window_s: float = WINDOW_S,
        lockout_s: float = LOCKOUT_S,
    ):
        self.max_attempts = max_attempts
        self.window_s = window_s
        self.lockout_s = lockout_s
        self._fails: dict[str, list[float]] = {}
        self._locked_until: dict[str, float] = {}
        self._lock = threading.Lock()

    def locked_for(self, key: str, now: float | None = None) -> float:
        """Сколько секунд ещё заблокировано (0 = не заблокировано)."""
        now = time.time() if now is None else now
        with self._lock:
            return max(0.0, self._locked_until.get(key, 0.0) - now)

    def record_failure(self, key: str, now: float | None = None) -> None:
        now = time.time() if now is None else now
        with self._lock:
            fails = [t for t in self._fails.get(key, []) if now - t < self.window_s]
            fails.append(now)
            self._fails[key] = fails
            if len(fails) >= self.max_attempts:
                self._locked_until[key] = now + self.lockout_s
                self._fails[key] = []

    def reset(self, key: str) -> None:
        with self._lock:
            self._fails.pop(key, None)
            self._locked_until.pop(key, None)
