from __future__ import annotations

from typing import TYPE_CHECKING

import cv2
import numpy as np

if TYPE_CHECKING:
    from soqchi.config import MotionConfig


class MotionGate:
    """Дешёвый фильтр перед детекцией: нет движения — YOLO не запускается.

    После последнего движения «глаза» остаются открытыми ещё cooldown_s,
    а при живых треках гейт принудительно открыт (человек может замереть).
    """

    def __init__(self, cfg: MotionConfig, width: int = 320):
        self.cfg = cfg
        self.width = width
        self._prev: np.ndarray | None = None
        self._last_motion_ts: float = 0.0

    def check(self, image: np.ndarray, ts: float, force_active: bool = False) -> bool:
        if not self.cfg.enabled:
            return True
        h, w = image.shape[:2]
        scale = self.width / max(w, 1)
        small = cv2.resize(image, (self.width, max(int(h * scale), 1)))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        if self._prev is None:
            self._prev = gray
            self._last_motion_ts = ts
            return True

        diff = cv2.absdiff(self._prev, gray)
        self._prev = gray
        changed = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)[1]
        changed_pct = 100.0 * float(np.count_nonzero(changed)) / changed.size
        if changed_pct >= self.cfg.min_area_pct:
            self._last_motion_ts = ts

        return force_active or (ts - self._last_motion_ts) <= self.cfg.cooldown_s
