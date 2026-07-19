"""Watchlist-матчер: два канала (лицо приоритетнее одежды) + пороги."""

from __future__ import annotations

from pragmata.watchlist import WatchlistMatcher

Ref = tuple[str, str, bool, list[float] | None, list[float] | None]


def _matcher(refs: list[Ref]) -> WatchlistMatcher:
    m = WatchlistMatcher(session_factory=None)  # type: ignore[arg-type]
    m._refs = refs
    m._loaded = 1e18  # никогда не «протухает» → _refresh не дёргает БД в тесте
    return m


def test_face_channel_wins() -> None:
    m = _matcher([("p1", "Санжар", True, [0.0, 1.0, 0.0], [1.0, 0.0, 0.0])])
    # лицо совпадает (cos=1), одежда — нет; матч по лицу
    hit = m.match(clip_emb=[0.0, 1.0, 0.0], face_emb=[1.0, 0.0, 0.0])
    assert hit == ("p1", "Санжар", True)


def test_face_miss_falls_back_to_clip() -> None:
    m = _matcher([("p1", "Санжар", True, [1.0, 0.0, 0.0], [1.0, 0.0, 0.0])])
    # лицо чужое (cos=0 < 0.42), но одежда совпадает (cos=1 ≥ 0.82)
    hit = m.match(clip_emb=[1.0, 0.0, 0.0], face_emb=[0.0, 1.0, 0.0])
    assert hit == ("p1", "Санжар", True)


def test_no_match_returns_none() -> None:
    m = _matcher([("p1", "Санжар", True, [1.0, 0.0, 0.0], [1.0, 0.0, 0.0])])
    assert m.match(clip_emb=[0.0, 1.0, 0.0], face_emb=[0.0, 1.0, 0.0]) is None


def test_clip_only_person_matched_by_body() -> None:
    # у человека нет эталона лица — матч только по одежде
    m = _matcher([("p1", "Гость", False, [1.0, 0.0, 0.0], None)])
    hit = m.match(clip_emb=[1.0, 0.0, 0.0], face_emb=[0.5, 0.5, 0.7])
    assert hit == ("p1", "Гость", False)
