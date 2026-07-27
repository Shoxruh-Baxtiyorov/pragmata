"""Watchlist (L2): сопоставление трека с именованным человеком.

Два канала. Лицо (insightface, ArcFace) — точный, работает даже при смене
одежды; когда лицо трека видно, матчим прежде всего по нему. Фигура/одежда
(CLIP-кроп) — запасной канал, когда лица нет (спина, далеко, кепка). Оба —
косинус в едином person↔person пространстве, поэтому прямой порог (в отличие
от text↔image в investigation, где нужен контраст).
"""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

log = logging.getLogger("pragmata.watchlist")

MATCH_THRESHOLD = 0.82  # косинус кроп↔эталон (одежда/фигура); выше = тот же человек
# порог лицо↔лицо — дефолт; фактический берётся из конфига (env-тюнинг на демо)
FACE_THRESHOLD = 0.42
REFRESH_S = 30.0  # как часто перечитывать watchlist из БД


def _cos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


class WatchlistMatcher:
    """Кэширует эталоны из БД, матчит эмбеддинг трека. Потокобезопасно."""

    def __init__(self, session_factory: sessionmaker[Session]):
        from pragmata.config import get_settings

        self.sf = session_factory
        # (id, name, watch, clip_emb|None, face_emb|None)
        self._refs: list[tuple[str, str, bool, list[float] | None, list[float] | None]] = []
        self._loaded = 0.0
        self._lock = threading.Lock()
        self._face_threshold = float(get_settings().face_match_threshold)

    def _refresh(self) -> None:
        from sqlalchemy import or_, select

        from pragmata.db.models import Person

        with self.sf() as s:
            rows = (
                s.execute(
                    select(Person).where(
                        or_(Person.clip_emb.is_not(None), Person.face_emb.is_not(None))
                    )
                )
                .scalars()
                .all()
            )
            self._refs = [
                (
                    str(p.id),
                    p.name,
                    p.watch,
                    list(p.clip_emb) if p.clip_emb is not None else None,
                    list(p.face_emb) if p.face_emb is not None else None,
                )
                for p in rows
            ]
        self._loaded = time.time()

    def match(
        self, clip_emb: list[float] | None, face_emb: list[float] | None = None
    ) -> tuple[str, str, bool] | None:
        """→ (person_id, name, watch) при совпадении, иначе None. Лицо приоритетнее."""
        with self._lock:
            if time.time() - self._loaded > REFRESH_S:
                try:
                    self._refresh()
                except Exception:  # noqa: BLE001 — БД-глюк не должен ронять пайплайн
                    log.exception("watchlist refresh failed")
            refs = self._refs

        # канал 1: лицо (если у трека есть эмбеддинг лица и у кого-то из списка тоже)
        if face_emb is not None:
            best: tuple[str, str, bool] | None = None
            best_sim = self._face_threshold
            for pid, name, watch, _clip, face in refs:
                if face is None:
                    continue
                sim = _cos(face_emb, face)
                if sim >= best_sim:
                    best_sim, best = sim, (pid, name, watch)
            if best is not None:
                return best

        # канал 2: одежда/фигура (CLIP)
        if clip_emb is not None:
            best = None
            best_sim = MATCH_THRESHOLD
            for pid, name, watch, clip, _face in refs:
                if clip is None:
                    continue
                sim = _cos(clip_emb, clip)
                if sim >= best_sim:
                    best_sim, best = sim, (pid, name, watch)
            if best is not None:
                return best

        return None
