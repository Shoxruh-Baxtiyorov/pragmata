from __future__ import annotations

from typing import TYPE_CHECKING

import cv2

if TYPE_CHECKING:
    from pathlib import Path

    import numpy as np

# L0: только ДЕТЕКЦИЯ лица (кроп как доказательство события), не распознавание.
# YuNet (~2 МБ ONNX) вместо insightface — тот подключим в L1 для эмбеддингов.
YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"


class FaceCropper:
    def __init__(self, models_dir: Path):
        model_path = models_dir / YUNET_FILENAME
        self._det = None
        # валидный yunet ~230КБ; отсекаем только явно битые/LFS-pointer файлы
        if model_path.exists() and model_path.stat().st_size > 100_000:
            self._det = cv2.FaceDetectorYN.create(str(model_path), "", (320, 320), 0.7)

    @property
    def available(self) -> bool:
        return self._det is not None

    def best_face(self, person_crop: np.ndarray) -> tuple[np.ndarray, float] | None:
        """Лучшее лицо в кропе человека → (кроп лица с полями, score) или None."""
        if self._det is None or person_crop.size == 0:
            return None
        h, w = person_crop.shape[:2]
        if h < 40 or w < 40:
            return None
        self._det.setInputSize((w, h))
        _, faces = self._det.detect(person_crop)
        if faces is None or len(faces) == 0:
            return None
        # faces: [x, y, w, h, ...landmarks..., conf]
        best = max(faces, key=lambda f: float(f[2]) * float(f[3]) * float(f[-1]))
        x, y, fw, fh, conf = (
            float(best[0]),
            float(best[1]),
            float(best[2]),
            float(best[3]),
            float(best[-1]),
        )
        if fw < 24 or fh < 24:
            return None  # слишком мелкое — как доказательство бесполезно
        margin = 0.25
        x0 = max(int(x - fw * margin), 0)
        y0 = max(int(y - fh * margin), 0)
        x1 = min(int(x + fw * (1 + margin)), w)
        y1 = min(int(y + fh * (1 + margin)), h)
        crop = person_crop[y0:y1, x0:x1].copy()
        score = fw * fh * conf
        return crop, score
