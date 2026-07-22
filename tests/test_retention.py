"""Ретенция: рутина тает, улики живут, строки событий не удаляются."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

from pragmata.services.retention_service import MEDIA_FIELDS, _strip_media, _unlink


class _Ev:
    """Минимальная замена строки события: нас интересуют только пути к медиа."""

    def __init__(self, frame: str | None = None, clip: str | None = None) -> None:
        self.frame_path = frame
        self.face_path = None
        self.clip_path = clip


class _Session:
    def flush(self) -> None:  # noqa: D102 — заглушка сессии
        pass


def test_unlink_counts_freed_bytes(tmp_path: Path) -> None:
    f = tmp_path / "a.jpg"
    f.write_bytes(b"x" * 1024)
    assert _unlink(tmp_path, "a.jpg") == 1024
    assert not f.exists()


def test_unlink_missing_file_is_not_an_error(tmp_path: Path) -> None:
    # файл мог уйти раньше (ручная чистка, сбой) — уборка не должна падать
    assert _unlink(tmp_path, "нет-такого.jpg") == 0
    assert _unlink(tmp_path, None) == 0


def test_strip_media_deletes_files_but_keeps_the_row(tmp_path: Path) -> None:
    (tmp_path / "f.jpg").write_bytes(b"x" * 100)
    (tmp_path / "c.mp4").write_bytes(b"y" * 200)
    ev = _Ev(frame="f.jpg", clip="c.mp4")

    count, freed = _strip_media(_Session(), tmp_path, [ev])

    assert (count, freed) == (1, 300)
    assert not (tmp_path / "f.jpg").exists()
    assert not (tmp_path / "c.mp4").exists()
    # строка жива, но ссылок на медиа больше нет: история статистики сохраняется
    assert all(getattr(ev, f) is None for f in MEDIA_FIELDS)


def test_media_fields_cover_every_kind_of_evidence() -> None:
    # если добавится новый вид медиа, а сюда его не внесут — он утечёт мимо уборки
    assert set(MEDIA_FIELDS) == {"frame_path", "face_path", "clip_path"}
