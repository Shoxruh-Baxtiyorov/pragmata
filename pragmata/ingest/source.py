from __future__ import annotations

import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import cv2

if TYPE_CHECKING:
    from collections.abc import Callable, Iterator

    import numpy as np

# RTSP по TCP (UDP теряет кадры) + таймаут сокета 5с — до первого open
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;5000000")


@dataclass
class Frame:
    image: np.ndarray
    ts: float  # unix-секунды по часам сервера (часам камер не верим)
    index: int


class VideoSource(ABC):
    @abstractmethod
    def frames(self) -> Iterator[Frame]: ...

    def close(self) -> None:  # noqa: B027 — переопределение опционально (FileSource закрывается сам)
        pass


class CvSource(VideoSource):
    """Реалтайм-источники: RTSP / HTTP MJPEG / USB. Живёт вечно, переподключается сам."""

    def __init__(self, url: str, stop_check: Callable[[], bool] = lambda: False):
        self.url = url
        self._stop_check = stop_check
        self._cap: cv2.VideoCapture | None = None

    def _open(self) -> None:
        backend = (
            cv2.CAP_FFMPEG if self.url.startswith(("rtsp://", "rtmp://", "http")) else cv2.CAP_ANY
        )
        self._cap = cv2.VideoCapture(self.url, backend)

    def frames(self) -> Iterator[Frame]:
        idx = 0
        backoff = 1.0
        while not self._stop_check():
            if self._cap is None or not self._cap.isOpened():
                self._open()
                if self._cap is None or not self._cap.isOpened():
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 60.0)
                    continue
                backoff = 1.0
            ok, image = self._cap.read()
            if not ok:
                self.close()
                time.sleep(backoff)
                backoff = min(backoff * 2, 60.0)
                continue
            idx += 1
            yield Frame(image, time.time(), idx)

    def close(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None


class FileSource(VideoSource):
    """mp4 для dev и golden-прогонов.

    realtime=True — темп реального времени (как камера);
    realtime=False — максимально быстро, с синтетическими ts по fps файла.
    """

    def __init__(
        self,
        path: str | Path,
        loop: bool = False,
        realtime: bool = True,
        stop_check: Callable[[], bool] = lambda: False,
    ):
        self.path = str(path)
        self.loop = loop
        self.realtime = realtime
        self._stop_check = stop_check

    def frames(self) -> Iterator[Frame]:
        cap = cv2.VideoCapture(self.path)
        if not cap.isOpened():
            raise RuntimeError(f"cannot open video file: {self.path}")
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        dt = 1.0 / fps
        t0 = time.time()
        idx = 0
        try:
            while not self._stop_check():
                ok, image = cap.read()
                if not ok:
                    if not self.loop:
                        return
                    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                idx += 1
                ts = t0 + idx * dt
                if self.realtime:
                    lag = ts - time.time()
                    if lag > 0:
                        time.sleep(lag)
                yield Frame(image, ts, idx)
        finally:
            cap.release()


def make_source(
    url: str,
    *,
    loop: bool = False,
    realtime: bool = True,
    stop_check: Callable[[], bool] = lambda: False,
) -> VideoSource:
    if Path(url).exists():
        return FileSource(url, loop=loop, realtime=realtime, stop_check=stop_check)
    return CvSource(url, stop_check=stop_check)
