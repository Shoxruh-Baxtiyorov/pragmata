"""Watchlist (L2): сопоставление трека с именованным человеком по CLIP-кропу.

Person↔person — тот же эмбеддинг-пространство, поэтому прямой косинус (в отличие
от text↔image в investigation, где нужен контраст-порог). Порог откалиброван под
«тот же человек в том же помещении»: сходство одежды/фигуры, не лицо.
"""

from __future__ import annotations

import logging
import threading
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

log = logging.getLogger("soqchi.watchlist")

MATCH_THRESHOLD = 0.82  # косинус кроп↔эталон; выше = тот же человек
REFRESH_S = 30.0  # как часто перечитывать watchlist из БД


def _cos(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    return dot / (na * nb) if na and nb else 0.0


class WatchlistMatcher:
    """Кэширует эталоны из БД, матчит эмбеддинг трека. Потокобезопасно."""

    def __init__(self, session_factory: sessionmaker[Session]):
        self.sf = session_factory
        self._refs: list[tuple[str, str, bool, list[float]]] = []  # (id, name, watch, emb)
        self._loaded = 0.0
        self._lock = threading.Lock()

    def _refresh(self) -> None:
        from sqlalchemy import select

        from soqchi.db.models import Person

        with self.sf() as s:
            rows = s.execute(select(Person).where(Person.clip_emb.is_not(None))).scalars().all()
            self._refs = [(str(p.id), p.name, p.watch, list(p.clip_emb)) for p in rows]  # type: ignore[arg-type]
        self._loaded = time.time()

    def match(self, emb: list[float]) -> tuple[str, str, bool] | None:
        """→ (person_id, name, watch) при совпадении, иначе None."""
        with self._lock:
            if time.time() - self._loaded > REFRESH_S:
                try:
                    self._refresh()
                except Exception:  # noqa: BLE001 — БД-глюк не должен ронять пайплайн
                    log.exception("watchlist refresh failed")
            refs = self._refs
        best: tuple[str, str, bool] | None = None
        best_sim = MATCH_THRESHOLD
        for pid, name, watch, ref in refs:
            sim = _cos(emb, ref)
            if sim >= best_sim:
                best_sim, best = sim, (pid, name, watch)
        return best
