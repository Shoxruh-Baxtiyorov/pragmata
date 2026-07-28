"""Тепловая карта: копим, где стоят/ходят люди. Foot-точки треков ложатся в
сетку GRID_W×GRID_H на камеру; периодически прибавляем накопленное к файлу на
диске (переживает перезапуск). Эндпоинт отдаёт сетку — фронт рисует наложение.
"""

from __future__ import annotations

import json
import logging
import os
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

log = logging.getLogger("pragmata.heatmap")

GRID_W, GRID_H = 48, 27  # ~16:9
_FLUSH_S = 20.0


def _zeros() -> list[list[float]]:
    return [[0.0] * GRID_W for _ in range(GRID_H)]


class HeatmapAccumulator:
    """Копит foot-точки в сетку на камеру; периодически прибавляет к файлу."""

    def __init__(self, media_root: Path):
        self.root = media_root / "heatmap"
        self._grids: dict[str, list[list[float]]] = {}
        self._last_flush: dict[str, float] = {}

    def add(self, camera_id: str, fx: float, fy: float) -> None:
        """fx, fy — нормализованные (0..1) координаты стопы."""
        g = self._grids.setdefault(camera_id, _zeros())
        cx = min(max(int(fx * GRID_W), 0), GRID_W - 1)
        cy = min(max(int(fy * GRID_H), 0), GRID_H - 1)
        g[cy][cx] += 1.0

    def maybe_flush(self, camera_id: str, ts: float) -> None:
        if ts - self._last_flush.get(camera_id, 0.0) < _FLUSH_S:
            return
        self._last_flush[camera_id] = ts
        self.flush(camera_id)

    def flush(self, camera_id: str) -> None:
        """Прибавить накопленный инкремент к файлу и обнулить память."""
        g = self._grids.pop(camera_id, None)
        if g is None:
            return
        try:
            self.root.mkdir(parents=True, exist_ok=True)
            path = self.root / f"{camera_id}.json"
            existing = _zeros()
            if path.exists():
                data = json.loads(path.read_text())
                old = data.get("grid")
                if isinstance(old, list) and len(old) == GRID_H:
                    existing = old
            for y in range(GRID_H):
                for x in range(GRID_W):
                    existing[y][x] += g[y][x]
            tmp = path.with_suffix(".tmp")
            tmp.write_text(json.dumps({"w": GRID_W, "h": GRID_H, "grid": existing}))
            os.replace(tmp, path)
        except Exception:  # noqa: BLE001 — тепловая карта не должна ронять камеру
            log.exception("heatmap flush failed cam=%s", camera_id)
