"""Кольцевой буфер видео и нарезка клипов-доказательств.

SegmentRecorder держит отдельный ffmpeg-процесс на камеру: пишет 2-секундные
MPEG-TS сегменты (RTSP — `-c copy`, без транскода; file/MJPEG — libx264) в
data/ring/<cam>/<unix_ts>.ts и чистит хвост старше ring_minutes.

Клип события = склейка сегментов, накрывающих [t_start − pre_s, t_end + post_s].
Хвост клипа лежит в будущем относительно события, поэтому ClipWorker нарезает
с отложенным due_ts, а кнопка «Клип» в боте отдаёт файл, когда тот готов.
"""

from __future__ import annotations

import logging
import queue
import subprocess
import threading
import time
from pathlib import Path
from typing import TYPE_CHECKING

from soqchi.core.redact import redact_url

if TYPE_CHECKING:
    import uuid
    from collections.abc import Callable

    from soqchi.config import CameraConfig

log = logging.getLogger("soqchi.clips")

SEGMENT_SECONDS = 2


class SegmentRecorder(threading.Thread):
    """ffmpeg-писатель кольцевого буфера одной камеры (с рестартом при падении)."""

    def __init__(self, camera: CameraConfig, ring_dir: Path, stop_event: threading.Event):
        super().__init__(name=f"ring-{camera.id}", daemon=True)
        self.camera = camera
        self.dir = ring_dir / camera.id
        self.stop_event = stop_event
        self._proc: subprocess.Popen[bytes] | None = None

    def _command(self) -> list[str]:
        url = self.camera.url
        cmd = ["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error"]
        if url.startswith("rtsp://"):
            cmd += ["-rtsp_transport", "tcp", "-i", url, "-c:v", "copy"]
        else:
            # файл (dev) или MJPEG-телефон: copy невозможен, кодируем дёшево
            if Path(url).exists():
                cmd += ["-re", "-stream_loop", "-1"]
            cmd += ["-i", url, "-c:v", "libx264", "-preset", "veryfast", "-g", "24"]
        cmd += [
            "-an",
            "-f",
            "segment",
            "-segment_time",
            str(SEGMENT_SECONDS),
            "-reset_timestamps",
            "1",
            "-strftime",
            "1",
            str(self.dir / "%s.ts"),
        ]
        return cmd

    def run(self) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)
        backoff = 1.0
        last_cleanup = 0.0
        while not self.stop_event.is_set():
            log.info("[%s] ring recorder start (%s)", self.camera.id, redact_url(self.camera.url))
            # DEVNULL обязателен: унаследованный stdout не даёт закрыться пайпам родителя
            self._proc = subprocess.Popen(
                self._command(), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            while not self.stop_event.is_set():
                if self._proc.poll() is not None:
                    break
                now = time.time()
                if now - last_cleanup > 30:
                    self._cleanup(now)
                    last_cleanup = now
                time.sleep(1)
            if self._proc.poll() is None:
                self._proc.terminate()
                try:
                    self._proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self._proc.kill()
                return
            log.warning(
                "[%s] ring recorder died (rc=%s), restart in %.0fs",
                self.camera.id,
                self._proc.returncode,
                backoff,
            )
            self.stop_event.wait(backoff)
            backoff = min(backoff * 2, 60.0)

    def _cleanup(self, now: float) -> None:
        horizon = now - self.camera.clips.ring_minutes * 60
        for seg in self.dir.glob("*.ts"):
            try:
                if int(seg.stem) < horizon - SEGMENT_SECONDS:
                    seg.unlink(missing_ok=True)
            except ValueError:
                continue


def pick_segments(names: list[int], t_start: float, t_end: float) -> list[int]:
    """Имена сегментов (unix-старт), накрывающих окно [t_start, t_end]."""
    return sorted(n for n in names if t_start - SEGMENT_SECONDS < n < t_end)


def extract_clip(
    ring_dir: Path, camera_id: str, t_start: float, t_end: float, out_dir: Path
) -> Path | None:
    seg_dir = ring_dir / camera_id
    names: list[int] = []
    for seg in seg_dir.glob("*.ts"):
        try:
            names.append(int(seg.stem))
        except ValueError:
            continue
    chosen = pick_segments(names, t_start, t_end)
    if not chosen:
        return None

    out_dir.mkdir(parents=True, exist_ok=True)
    out = (out_dir / f"clip_{camera_id}_{int(t_start)}.mp4").resolve()
    listing = (out_dir / f".concat_{camera_id}_{int(t_start)}.txt").resolve()
    # только абсолютные пути: относительные ffmpeg резолвит от каталога листинга
    seg_abs = seg_dir.resolve()
    listing.write_text(
        "".join(f"file '{seg_abs / f'{n}.ts'}'\n" for n in chosen), encoding="utf-8"
    )
    try:
        res = subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(listing),
                "-c",
                "copy",
                "-movflags",
                "+faststart",
                str(out),
            ],
            capture_output=True,
            timeout=60,
        )
    finally:
        listing.unlink(missing_ok=True)
    if res.returncode != 0 or not out.exists():
        log.warning(
            "clip concat failed cam=%s rc=%s %s",
            camera_id,
            res.returncode,
            res.stderr.decode(errors="replace")[-200:],
        )
        return None
    return out


class ClipWorker(threading.Thread):
    """Отложенная нарезка: событие в t, хвост клипа готов только к t+post_s."""

    def __init__(
        self,
        ring_dir: Path,
        clips_dir: Path,
        stop_event: threading.Event,
        persist: Callable[[uuid.UUID, str], None],
    ):
        super().__init__(name="clip-worker", daemon=True)
        self.ring_dir = ring_dir
        self.clips_dir = clips_dir
        self.stop_event = stop_event
        self.persist = persist
        self._q: queue.Queue[tuple[float, uuid.UUID, str, float, float]] = queue.Queue()

    def schedule(
        self,
        event_id: uuid.UUID,
        camera_id: str,
        t_start: float,
        t_end: float,
        pre_s: float,
        post_s: float,
    ) -> None:
        due = t_end + post_s + SEGMENT_SECONDS + 1  # хвост должен успеть лечь на диск
        self._q.put((due, event_id, camera_id, t_start - pre_s, t_end + post_s))

    def run(self) -> None:
        while not self.stop_event.is_set():
            try:
                due, event_id, camera_id, t0, t1 = self._q.get(timeout=1)
            except queue.Empty:
                continue
            wait = due - time.time()
            if wait > 0 and self.stop_event.wait(wait):
                return
            path = extract_clip(self.ring_dir, camera_id, t0, t1, self.clips_dir)
            if path is not None:
                self.persist(event_id, str(path))
                log.info("clip ready event=%s → %s", event_id, path.name)
