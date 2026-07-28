"""LPR: распознавание госномеров. fast-alpr = ONNX-детектор пластины + OCR
символов, крутится на нашем onnxruntime-gpu (import torch первым — он грузит
libcudart для CUDA-провайдера). Дедуп по тексту номера с cooldown, чтобы
стоящая под камерой машина не спамила журнал каждым кадром.

Белый список (whitelist из настроек модуля) — если задан, номер вне списка
даёт warning-событие plate_unlisted («чужой на шлагбауме»); всё остальное —
info-событие plate_recognized.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from pragmata.rules.engine import RuleEvent

if TYPE_CHECKING:
    import numpy as np

log = logging.getLogger("pragmata.lpr")

_MIN_CONF = 0.4  # порог OCR-уверенности
_DEDUP_S = 60.0  # тот же номер не повторяем чаще, чем раз в минуту на камеру


def _norm(text: str) -> str:
    """Нормализуем номер к сравнению: только буквы/цифры, верхний регистр."""
    return "".join(ch for ch in text.upper() if ch.isalnum())


def _parse_whitelist(raw: str) -> set[str]:
    # разделяем ТОЛЬКО по запятым/переносам/;, затем нормализуем каждую запись
    # целиком — номер «30 777 AAA» с пробелами станет «30777AAA», как у OCR
    return {n for p in re.split(r"[,\n;]+", raw) if (n := _norm(p))}


class LprReader:
    """Ленивая обёртка над fast-alpr. Модель грузится (и качается) при первом
    кадре камеры с включённым LPR — как FaceRecognizer, чтобы не платить, если
    модуль никто не включил. (Отдельно от dormant perception.plates на easyocr.)"""

    def __init__(self, device: str = "cpu"):
        self._device = device
        self._alpr: Any = None  # fast_alpr.ALPR (без стабов) — типизируем как Any
        self._seen: dict[str, dict[str, float]] = {}

    def _ensure(self) -> None:
        if self._alpr is not None:
            return
        import torch  # noqa: F401 — грузит libcudart для onnxruntime-gpu
        from fast_alpr import ALPR

        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if self._device == "cuda"
            else ["CPUExecutionProvider"]
        )
        self._alpr = ALPR(
            detector_model="yolo-v9-t-384-license-plate-end2end",
            ocr_model="global-plates-mobile-vit-v2-model",
            detector_providers=providers,
            ocr_providers=providers,
        )
        log.info("ALPR loaded (device=%s)", self._device)

    def process(
        self, camera_id: str, frame: np.ndarray, ts: float, whitelist: str
    ) -> list[RuleEvent]:
        self._ensure()
        try:
            results = self._alpr.predict(frame)
        except Exception:  # noqa: BLE001 — распознавание номера не должно ронять камеру
            log.exception("ALPR predict failed cam=%s", camera_id)
            return []

        wl = _parse_whitelist(whitelist)
        seen = self._seen.setdefault(camera_id, {})
        events: list[RuleEvent] = []
        for r in results:
            ocr = getattr(r, "ocr", None)
            if ocr is None or ocr.confidence < _MIN_CONF:
                continue
            plate = _norm(ocr.text)
            if len(plate) < 4:  # мусорные короткие распознавания отсекаем
                continue
            if ts - seen.get(plate, 0.0) < _DEDUP_S:
                continue
            seen[plate] = ts
            listed = plate in wl
            kind = "plate_recognized" if (not wl or listed) else "plate_unlisted"
            status = "" if not wl else (" ✓ в списке" if listed else " — не в списке")
            ev = RuleEvent(
                kind,
                camera_id,
                ts,
                ts,
                meta={
                    "plate": plate,
                    "conf": round(float(ocr.confidence), 2),
                    "whitelisted": listed,
                },
                description=f"Госномер {plate}{status}",
            )
            ev.frame = frame.copy()
            events.append(ev)

        # чистим старые записи дедупа, чтобы словарь не рос вечно
        self._seen[camera_id] = {p: t for p, t in seen.items() if ts - t < _DEDUP_S * 4}
        return events
