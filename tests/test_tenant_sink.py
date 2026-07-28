"""Изоляция тенантов на записи: событие/трек штампуются site_id ВЛАДЕЛЬЦА
камеры, а не хардкодом 1. Иначе события утекают между организациями."""

from __future__ import annotations

from pragmata.sinks import DbSink


class _Cam:
    def __init__(self, site_id: int) -> None:
        self.site_id = site_id


class _Session:
    """Заглушка сессии: get(Camera, id) → заранее заданная камера (или None)."""

    def __init__(self, cam: _Cam | None, calls: list[str]) -> None:
        self._cam = cam
        self._calls = calls

    def __enter__(self) -> _Session:
        return self

    def __exit__(self, *_a: object) -> bool:
        return False

    def get(self, _model: object, camera_id: str) -> _Cam | None:
        self._calls.append(camera_id)
        return self._cam


def _sink(cam: _Cam | None, calls: list[str]) -> DbSink:
    sink = DbSink.__new__(DbSink)  # минуем __init__ (не поднимаем реальный engine)
    sink._site_by_cam = {}
    sink._session_factory = lambda: _Session(cam, calls)  # type: ignore[method-assign]
    return sink


def test_site_for_uses_camera_owner_and_caches() -> None:
    calls: list[str] = []
    sink = _sink(_Cam(site_id=4), calls)
    assert sink._site_for("cam-x") == 4  # site владельца из БД
    assert sink._site_for("cam-x") == 4  # второй раз — из кэша
    assert calls == ["cam-x"]  # БД дёрнули ровно раз


def test_site_for_unknown_camera_defaults_to_1() -> None:
    calls: list[str] = []
    sink = _sink(None, calls)
    assert sink._site_for("ghost") == 1


def test_two_cameras_do_not_share_a_tenant() -> None:
    # разные владельцы не должны схлопнуться в один site_id
    a = _sink(_Cam(site_id=2), [])
    b = _sink(_Cam(site_id=7), [])
    assert a._site_for("a") == 2
    assert b._site_for("b") == 7
