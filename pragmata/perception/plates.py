"""Чтение номерного знака (ANPR) — best-effort, degradation-first.

Опциональный слой: генеричный OCR (easyocr) по кропу машины. Реалистично о
точности — на обычном CCTV номер часто мелкий/размытый/под углом и не читается;
поэтому это «прочитал если смог», а не гарантия. Нет easyocr/модели → available
= False, VehicleWatcher просто шлёт тип машины без номера.

Установка OCR (опционально): `uv sync --extra anpr`.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import numpy as np

log = logging.getLogger("pragmata.plate")

# номер: буквы/цифры, 5–10 символов подряд (UZ: 01A123BC и т.п.). Грубый фильтр
# мусора OCR — не строгая валидация под конкретную страну.
_PLATE_RE = re.compile(r"[A-Z0-9]{5,10}")
_MIN_OCR_CONF = 0.4


class PlateReader:
    def __init__(self, *, enabled: bool = True):
        self._enabled = enabled
        self._reader: object | None = None
        self._tried = False

    def _ensure(self) -> None:
        if self._tried or not self._enabled:
            return
        self._tried = True
        try:
            import easyocr

            self._reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            log.info("plate reader: on (easyocr, CPU)")
        except Exception:  # noqa: BLE001 — нет пакета/модели → graceful off
            log.warning("plate reader: off (easyocr недоступен)")
            self._reader = None

    @property
    def available(self) -> bool:
        self._ensure()
        return self._reader is not None

    def read(self, vehicle_crop: np.ndarray) -> str | None:
        """Кроп машины → строка номера (верхний регистр) или None, если не разобрал."""
        self._ensure()
        reader = self._reader
        if reader is None or vehicle_crop.size == 0:
            return None
        if vehicle_crop.shape[0] < 40 or vehicle_crop.shape[1] < 40:
            return None
        try:
            results = reader.readtext(vehicle_crop)  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001 — OCR не должен ронять камеру
            log.exception("plate ocr failed")
            return None
        best: tuple[str, float] | None = None
        for _box, text, conf in results:
            if conf < _MIN_OCR_CONF:
                continue
            cand = re.sub(r"[^A-Z0-9]", "", str(text).upper())
            m = _PLATE_RE.search(cand)
            if m and (best is None or conf > best[1]):
                best = (m.group(0), conf)
        return best[0] if best else None
