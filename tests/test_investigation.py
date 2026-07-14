"""Контраст-фильтр Investigation Mode: «не нашёл» вместо ближайшего попавшегося."""

from __future__ import annotations

from soqchi.investigation import build_query_prompt, rank_candidates

# 2-мерные "эмбеддинги" для наглядности: query по оси x, baseline по оси y
QUERY = [1.0, 0.0]
BASE = [0.0, 1.0]


def test_matching_candidate_passes_and_sorted() -> None:
    items = [
        ("weak", [0.5, 0.4]),  # margin 0.1
        ("strong", [0.9, 0.1]),  # margin 0.8
    ]
    got = rank_candidates(items, QUERY, BASE, min_margin=0.05, limit=5)
    assert [name for name, _ in got] == ["strong", "weak"]
    assert got[0][1] == 0.9  # similarity возвращается наружу


def test_generic_person_filtered_out() -> None:
    # похож на «просто человека» сильнее, чем на запрос → это НЕ совпадение
    items = [("generic", [0.3, 0.6])]
    assert rank_candidates(items, QUERY, BASE, min_margin=0.025, limit=5) == []


def test_empty_pool_means_not_found() -> None:
    assert rank_candidates([], QUERY, BASE, min_margin=0.025, limit=5) == []


def test_limit_respected() -> None:
    items = [(f"t{i}", [0.9 - i * 0.01, 0.0]) for i in range(10)]
    assert len(rank_candidates(items, QUERY, BASE, min_margin=0.0, limit=3)) == 3


def test_query_prompt_template() -> None:
    assert build_query_prompt("man in black") == "a photo of man in black"
    assert build_query_prompt("A PHOTO of a man") == "A PHOTO of a man"  # уже шаблонный
