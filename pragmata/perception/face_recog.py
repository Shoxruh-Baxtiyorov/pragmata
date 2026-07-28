"""L1: распознавание лица — insightface (buffalo_s, ArcFaceONNX, 512-d L2).

Отдельно от FaceCropper (YuNet, L0): тот ДЕТЕКТИРУЕТ лицо для доказательства,
этот считает ЭМБЕДДИНГ для watchlist по лицу (точнее одежды/фигуры). Модель
качается один раз (~90МБ) в models/insightface и дальше работает офлайн на CPU.

Degradation-first: нет insightface / модель не скачалась / не загрузилась →
available=False, пайплайн молча падает обратно на CLIP-эмбеддинг тела.
"""

from __future__ import annotations

import contextlib
import logging
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from pathlib import Path

log = logging.getLogger("pragmata.face")

# insightface-кроп берём с полями вокруг бокса человека: детектору лиц нужен
# контекст, тугой кроп по плечи режет recall.
_BBOX_MARGIN = 0.15


class FaceRecognizer:
    """Ленивая обёртка над insightface FaceAnalysis. Потокобезопасность не нужна:
    один экземпляр дергается из потоков камер по очереди через GIL на короткий
    ONNX-инференс; при желании вынести в свой воркер — интерфейс это позволит.
    """

    def __init__(self, models_dir: Path, *, enabled: bool = True):
        self._models_dir = models_dir
        self._enabled = enabled
        self._app: object | None = None
        self._tried = False
        self._min_score = 0.5  # переопределяется из конфига при _ensure

    def _ensure(self) -> None:
        if self._tried or not self._enabled:
            return
        self._tried = True
        try:
            # torch ПЕРВЫМ: грузит CUDA-либы в процесс, чтобы onnxruntime-gpu их нашёл
            # (иначе import onnxruntime падает на libcudart.so.13). На CPU-сборке — no-op.
            with contextlib.suppress(Exception):
                import torch  # noqa: F401

            from insightface.app import FaceAnalysis

            from pragmata.config import get_settings

            s = get_settings()
            self._min_score = float(s.face_min_score)
            det = int(s.face_det_size)
            root = str((self._models_dir / "insightface").resolve())
            # GPU для лиц, если стоит onnxruntime-gpu И device=cuda (250мс→~20мс,
            # важно при толпе). Нет CUDA-провайдера → тихо CPU, ничего не ломается.
            import onnxruntime as ort

            providers = ["CPUExecutionProvider"]
            gpu_ok = "CUDAExecutionProvider" in ort.get_available_providers()
            if s.torch_device == "cuda" and gpu_ok:
                providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            ctx = 0 if providers[0] == "CUDAExecutionProvider" else -1
            app = FaceAnalysis(name=s.face_model, root=root, providers=providers)
            app.prepare(ctx_id=ctx, det_size=(det, det))
            self._app = app
            log.info(
                "face recognizer: on (insightface %s, det=%d, %s)",
                s.face_model, det, "GPU" if ctx == 0 else "CPU",
            )
        except Exception:  # noqa: BLE001 — нет пакета/модели/сети → graceful off
            log.warning("face recognizer: off (insightface недоступен или модель не загрузилась)")
            self._app = None

    @property
    def available(self) -> bool:
        self._ensure()
        return self._app is not None

    def embed_largest(self, image: np.ndarray) -> list[float] | None:
        """Эмбеддинг самого крупного лица на ВСЁМ изображении (регистрация по фото)."""
        h, w = image.shape[:2]
        return self.embed(image, (0.0, 0.0, float(w), float(h)))

    def embed(
        self, frame: np.ndarray, bbox: tuple[float, float, float, float]
    ) -> list[float] | None:
        """Эмбеддинг самого крупного лица в области человека → 512-d L2 или None."""
        self._ensure()
        app = self._app
        if app is None:
            return None
        h, w = frame.shape[:2]
        x0, y0, x1, y1 = bbox
        bw, bh = x1 - x0, y1 - y0
        cx0 = max(int(x0 - bw * _BBOX_MARGIN), 0)
        cy0 = max(int(y0 - bh * _BBOX_MARGIN), 0)
        cx1 = min(int(x1 + bw * _BBOX_MARGIN), w)
        cy1 = min(int(y1 + bh * _BBOX_MARGIN), h)
        crop = frame[cy0:cy1, cx0:cx1]
        if crop.size == 0 or crop.shape[0] < 48 or crop.shape[1] < 48:
            return None
        try:
            faces = app.get(crop)  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001 — инференс не должен ронять камеру
            log.exception("face embed failed")
            return None
        if not faces:
            return None
        # гейт качества: отбрасываем неуверенные детекции (мутные/профильные/мелкие) —
        # их эмбеддинг шумный и провоцирует ложные совпадения в watchlist
        good = [f for f in faces if float(getattr(f, "det_score", 1.0)) >= self._min_score]
        if not good:
            return None
        best = max(good, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        emb = getattr(best, "normed_embedding", None)
        if emb is None:
            return None
        return [float(x) for x in np.asarray(emb, dtype=np.float32).ravel()]
