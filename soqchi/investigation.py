"""Investigation Mode: поиск человека по описанию с контрастным порогом.

Абсолютная косинусная близость у CLIP не отделяет «есть такой человек» от
«ближайший из имеющихся»: все кропы — люди в одном помещении, любой запрос
даёт ~0.24-0.30. Работает контраст: кандидат проходит, только если запрос
похож на него ЗАМЕТНО сильнее, чем нейтральное «a photo of a person»
(калибровка 2026-07-14: реальные совпадения +0.05, отсутствующие ≤ −0.007).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session, sessionmaker

    from soqchi.db.models import Track
    from soqchi.perception.embedder import ClipEmbedder

BASELINE_PROMPT = "a photo of a person"
CANDIDATE_POOL = 20  # столько ближайших забираем из БД до контраст-фильтра


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=True))


def rank_candidates[T](
    items: list[tuple[T, list[float]]],
    query_emb: list[float],
    baseline_emb: list[float],
    min_margin: float,
    limit: int,
) -> list[tuple[T, float]]:
    """Контраст-фильтр: sim(запрос) − sim(«просто человек») ≥ min_margin.

    Возвращает (объект, similarity) по убыванию похожести. Пусто = «не найдено».
    """
    passed = []
    for obj, emb in items:
        sim_q = _dot(emb, query_emb)
        if sim_q - _dot(emb, baseline_emb) >= min_margin:
            passed.append((obj, sim_q))
    passed.sort(key=lambda p: -p[1])
    return passed[:limit]


def build_query_prompt(query: str) -> str:
    q = query.strip()
    return q if q.lower().startswith("a photo") else f"a photo of {q}"


def find_people(
    session_factory: sessionmaker[Session],
    embedder: ClipEmbedder,
    query: str,
    hours: int = 48,
    limit: int = 5,
    min_margin: float = 0.025,
) -> list[tuple[Track, float]]:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from soqchi.db.models import Track

    query_emb = embedder.embed_text(build_query_prompt(query))
    baseline_emb = embedder.embed_text(BASELINE_PROMPT)
    since = datetime.now(UTC) - timedelta(hours=hours)
    with session_factory() as s:
        tracks = (
            s.execute(
                select(Track)
                .where(Track.clip_emb.is_not(None), Track.started_at >= since)
                .order_by(Track.clip_emb.cosine_distance(query_emb))
                .limit(CANDIDATE_POOL)
            )
            .scalars()
            .all()
        )
    items = [(t, list(t.clip_emb)) for t in tracks if t.clip_emb is not None]
    return rank_candidates(items, query_emb, baseline_emb, min_margin, limit)
