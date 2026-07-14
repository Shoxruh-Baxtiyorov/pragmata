"""CLIP-эмбеддинги кропов людей — топливо Investigation Mode.

ViT-B/32 (openai) локально на CPU: ~30 мс на кроп, один раз при завершении
трека. Текстовый энкодер английский — на неделе 3 LLM-агент переводит
uz/ru-запросы в английское описание перед поиском.
"""

from __future__ import annotations

import logging
import threading
from typing import TYPE_CHECKING, Any

import cv2

if TYPE_CHECKING:
    import numpy as np

log = logging.getLogger("soqchi.embedder")

MODEL_NAME = "ViT-B-32"
PRETRAINED = "openai"
DIM = 512


class ClipEmbedder:
    """Ленивая загрузка (первый вызов скачает ~350МБ), потокобезопасен."""

    def __init__(self, device: str = "cpu"):
        self.device = device
        self._lock = threading.Lock()
        self._model: Any = None
        self._preprocess: Any = None
        self._tokenizer: Any = None

    def _ensure(self) -> None:
        if self._model is not None:
            return
        import open_clip

        log.info("loading CLIP %s/%s (первый раз скачает веса)...", MODEL_NAME, PRETRAINED)
        model, _, preprocess = open_clip.create_model_and_transforms(
            MODEL_NAME, pretrained=PRETRAINED, device=self.device
        )
        model.eval()
        self._model = model
        self._preprocess = preprocess
        self._tokenizer = open_clip.get_tokenizer(MODEL_NAME)

    def embed_image(self, bgr: np.ndarray) -> list[float] | None:
        if bgr.size == 0 or bgr.shape[0] < 32 or bgr.shape[1] < 16:
            return None
        import torch
        from PIL import Image

        with self._lock:
            self._ensure()
            pil = Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            with torch.no_grad():
                x = self._preprocess(pil).unsqueeze(0).to(self.device)
                feat = self._model.encode_image(x)
                feat = feat / feat.norm(dim=-1, keepdim=True)
        return [float(v) for v in feat[0].cpu().tolist()]

    def embed_text(self, query: str) -> list[float]:
        import torch

        with self._lock:
            self._ensure()
            with torch.no_grad():
                tokens = self._tokenizer([query]).to(self.device)
                feat = self._model.encode_text(tokens)
                feat = feat / feat.norm(dim=-1, keepdim=True)
        return [float(v) for v in feat[0].cpu().tolist()]
