from __future__ import annotations

import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import TYPE_CHECKING

import cv2

if TYPE_CHECKING:
    import numpy as np


class MediaStore:
    """Неделя 1: локальный диск. Интерфейс не меняется при переезде на MinIO (неделя 2)."""

    def __init__(self, root: Path):
        self.root = Path(root)

    def save_jpeg(self, image: np.ndarray, camera_id: str, kind: str, ts: float) -> str:
        day = datetime.fromtimestamp(ts, tz=UTC).strftime("%Y%m%d")
        rel = Path(day) / f"{kind}_{camera_id}_{int(ts)}_{uuid.uuid4().hex[:8]}.jpg"
        path = self.root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(path), image, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return str(rel)


def annotate_many(
    frame: np.ndarray,
    primary: tuple[tuple[float, float, float, float], str],
    others: list[tuple[float, float, float, float]],
) -> np.ndarray:
    """Кадр-доказательство: виновник оранжевым, остальные видимые люди — жёлтым.

    Оверлей всех, кого видит модель, — честность к пользователю: сразу ясно,
    «не среагировала» система или «не увидела».
    """
    out = annotate(frame, primary[0], primary[1])
    for i, bbox in enumerate(others, start=2):
        x0, y0, x1, y1 = (int(v) for v in bbox)
        cv2.rectangle(out, (x0, y0), (x1, y1), (0, 200, 255), 2)
        cv2.putText(
            out, f"#{i}", (x0, max(y0 - 8, 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 200, 255), 2
        )
    return out


def annotate(frame: np.ndarray, bbox: tuple[float, float, float, float], label: str) -> np.ndarray:
    out = frame.copy()
    x0, y0, x1, y1 = (int(v) for v in bbox)
    cv2.rectangle(out, (x0, y0), (x1, y1), (0, 80, 255), 2)
    cv2.putText(out, label, (x0, max(y0 - 8, 14)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 80, 255), 2)
    return out
