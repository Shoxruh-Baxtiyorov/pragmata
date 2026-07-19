"""Юнит-тесты rule engine: hysteresis, cooldown, dwell, entered/exited — чистая логика."""

from __future__ import annotations

from pragmata.config import (
    CameraConfig,
    GlobalRules,
    LoiteringRule,
    ZoneConfig,
    ZoneIntrusionRule,
    ZoneRules,
)
from pragmata.perception.tracker import TrackState
from pragmata.rules.engine import RuleEngine

FRAME = (100, 100, 3)  # h, w — зона в долях от этого


def make_engine(
    hyst: int = 3, zi_cd: float = 60, dwell: float = 5, lo_cd: float = 60
) -> RuleEngine:
    zone = ZoneConfig(
        name="z1",
        polygon=[(0.5, 0.0), (1.0, 0.0), (1.0, 1.0), (0.5, 1.0)],  # правая половина
        rules=ZoneRules(
            zone_intrusion=ZoneIntrusionRule(hysteresis_frames=hyst, cooldown_s=zi_cd),
            loitering=LoiteringRule(dwell_s=dwell, cooldown_s=lo_cd),
        ),
    )
    cam = CameraConfig(id="test", name="t", url="x", zones=[zone])
    return RuleEngine(cam, GlobalRules(min_track_seconds=0.5, track_lost_ttl=2.0))


def track_at(
    x: float, y: float, ts: float, first_ts: float, dt: float = 0.25, tid: int = 1
) -> TrackState:
    st = TrackState(tid, "test", first_ts=first_ts, last_ts=ts)
    st.dt = dt
    st.bbox = (x - 5, y - 10, x + 5, y)  # foot = (x, y)
    return st


def step(engine: RuleEngine, st: TrackState, ts: float) -> list:
    return engine.process([st], [], ts, FRAME)


def test_zone_intrusion_fires_after_hysteresis_once() -> None:
    eng = make_engine(hyst=3)
    st = track_at(75, 50, ts=0.0, first_ts=0.0)
    fired = []
    for i in range(6):
        ts = i * 0.25
        st.last_ts = ts
        fired += [e.type for e in step(eng, st, ts)]
    assert fired.count("zone_intrusion") == 1  # ровно на 3-м кадре, cooldown гасит повтор
    assert "person_entered" in fired


def test_outside_zone_no_intrusion() -> None:
    eng = make_engine(hyst=2)
    st = track_at(25, 50, ts=0.0, first_ts=0.0)  # левая половина — вне зоны
    fired = []
    for i in range(5):
        fired += [e.type for e in step(eng, st, i * 0.25)]
    assert "zone_intrusion" not in fired


def test_hysteresis_resets_after_two_misses() -> None:
    eng = make_engine(hyst=3)
    st = track_at(75, 50, ts=0.0, first_ts=0.0)
    step(eng, st, 0.0)
    step(eng, st, 0.25)  # 2 кадра в зоне — ещё нет события
    st.bbox = (20, 40, 30, 50)  # вышел
    step(eng, st, 0.5)
    step(eng, st, 0.75)  # 2 подряд промаха → сброс
    st.bbox = (70, 40, 80, 50)  # вернулся: счётчик начинается заново
    fired = [e.type for e in step(eng, st, 1.0)]
    fired += [e.type for e in step(eng, st, 1.25)]
    assert "zone_intrusion" not in fired  # только 2 кадра после возврата


def test_single_frame_flicker_does_not_reset() -> None:
    """Перекрытие людей на один кадр не должно обнулять hysteresis (баг «двое → один алерт»)."""
    eng = make_engine(hyst=4)
    st = track_at(75, 50, ts=0.0, first_ts=0.0)
    fired: list[str] = []
    inside = (70, 40, 80, 50)
    outside = (20, 40, 30, 50)
    seq = [inside, inside, inside, outside, inside]  # фликер на 4-м кадре
    for i, bbox in enumerate(seq):
        st.bbox = bbox
        st.last_ts = i * 0.25
        fired += [e.type for e in step(eng, st, i * 0.25)]
    assert fired.count("zone_intrusion") == 1  # 4-й «внутренний» кадр добил счётчик


def test_two_people_in_zone_both_alert_with_counter() -> None:
    """Двое входят вместе → ДВА событиях, в каждом people_in_zone=2 и bbox соседа."""
    eng = make_engine(hyst=2)
    st1 = track_at(70, 50, ts=0.0, first_ts=0.0, tid=1)
    st2 = track_at(90, 50, ts=0.0, first_ts=0.0, tid=2)
    events = []
    for i in range(3):
        ts = i * 0.25
        st1.last_ts = st2.last_ts = ts
        events += eng.process([st1, st2], [], ts, FRAME)
    intrusions = [e for e in events if e.type == "zone_intrusion"]
    assert len(intrusions) == 2
    assert {e.track.track_id for e in intrusions} == {1, 2}
    assert all(e.meta["people_in_zone"] == 2 for e in intrusions)
    assert all(len(e.others) == 1 for e in intrusions)


def test_loitering_after_dwell() -> None:
    eng = make_engine(dwell=2.0)
    st = track_at(75, 50, ts=0.0, first_ts=0.0)
    fired = []
    for i in range(1, 12):
        ts = i * 0.25
        st.last_ts = ts
        st.dt = 0.25
        fired += [e.type for e in step(eng, st, ts)]
    assert fired.count("loitering") == 1  # накопил 2с dwell → одно событие (cooldown)


def test_exited_only_for_confirmed_tracks() -> None:
    eng = make_engine()
    ghost = track_at(25, 50, ts=0.1, first_ts=0.0)  # жил 0.1с < min_track_seconds
    events = eng.process([], [ghost], 0.1, FRAME)
    assert events == []

    st = track_at(25, 50, ts=0.0, first_ts=0.0)
    st.last_ts = 1.0
    step(eng, st, 1.0)  # entered
    events = eng.process([], [st], 1.0, FRAME)
    assert [e.type for e in events] == ["person_exited"]
