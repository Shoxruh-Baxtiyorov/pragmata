"""Разметка запретной зоны по живому кадру камеры.

GUI-режим (по умолчанию, нужен экран):
    uv run python scripts/zone_tool.py "rtsp://user:pass@ip:554/Streaming/Channels/101"
  клики мышью — вершины полигона; S/Enter — напечатать YAML-блок для конфига,
  R — начать заново, Q/Esc — выход.

Без экрана (--grid): сохраняет кадр с координатной сеткой 0..1 в
data/zone_snapshot.jpg — точки полигона снимаешь глазами и пишешь в YAML руками.
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import cv2
import numpy as np

os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|stimeout;5000000")


def grab_frame(url: str) -> np.ndarray:
    backend = cv2.CAP_FFMPEG if url.startswith(("rtsp://", "http")) else cv2.CAP_ANY
    cap = cv2.VideoCapture(url, backend)
    if not cap.isOpened():
        raise SystemExit(f"не открылся источник: {url}")
    frame = None
    for _ in range(15):  # пропускаем серые первые кадры декодера
        ok, f = cap.read()
        if ok:
            frame = f
    cap.release()
    if frame is None:
        raise SystemExit("кадры не читаются (камера офлайн?)")
    return frame


def yaml_block(points: list[tuple[int, int]], w: int, h: int) -> str:
    poly = ", ".join(f"[{x / w:.3f}, {y / h:.3f}]" for x, y in points)
    return (
        "    zones:\n"
        "      - name: my-zone\n"
        f"        polygon: [{poly}]\n"
        "        rules:\n"
        "          zone_intrusion: { hysteresis_frames: 8, cooldown_s: 300 }\n"
        "          loitering: { dwell_s: 60, cooldown_s: 300 }"
    )


def grid_mode(frame: np.ndarray, out: Path) -> None:
    h, w = frame.shape[:2]
    img = frame.copy()
    for i in range(1, 10):
        x, y = int(w * i / 10), int(h * i / 10)
        cv2.line(img, (x, 0), (x, h), (0, 255, 255), 1)
        cv2.line(img, (0, y), (w, y), (0, 255, 255), 1)
        cv2.putText(
            img, f"{i / 10:.1f}", (x + 3, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1
        )
        cv2.putText(
            img, f"{i / 10:.1f}", (3, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1
        )
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), img)
    print(f"кадр с сеткой: {out}")
    print("координаты точек читаются по сетке (доли кадра 0..1), пример блока:")
    print(
        yaml_block(
            [
                (int(w * 0.3), int(h * 0.2)),
                (int(w * 0.7), int(h * 0.2)),
                (int(w * 0.7), int(h * 0.9)),
                (int(w * 0.3), int(h * 0.9)),
            ],
            w,
            h,
        )
    )


def gui_mode(frame: np.ndarray) -> None:
    h, w = frame.shape[:2]
    points: list[tuple[int, int]] = []
    win = "zone_tool — клики: вершины | S: YAML | R: сброс | Q: выход"

    def on_mouse(event: int, x: int, y: int, *_args: object) -> None:
        if event == cv2.EVENT_LBUTTONDOWN:
            points.append((x, y))

    cv2.namedWindow(win, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(win, on_mouse)
    while True:
        img = frame.copy()
        if points:
            pts = np.array(points, dtype=np.int32)
            if len(points) >= 3:
                overlay = img.copy()
                cv2.fillPoly(overlay, [pts], (0, 80, 255))
                img = cv2.addWeighted(overlay, 0.25, img, 0.75, 0)
            cv2.polylines(img, [pts], len(points) >= 3, (0, 80, 255), 2)
            for p in points:
                cv2.circle(img, p, 4, (0, 255, 255), -1)
        cv2.imshow(win, img)
        key = cv2.waitKey(30) & 0xFF
        if key in (ord("q"), 27):
            break
        if key == ord("r"):
            points.clear()
        if key in (ord("s"), 13) and len(points) >= 3:
            print("\n--- вставь в конфиг камеры: ---")
            print(yaml_block(points, w, h))
            print("--- (Q — выход, R — новая зона) ---\n")
    cv2.destroyAllWindows()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("url", help="rtsp://... | http://phone:4747/video | путь к mp4")
    ap.add_argument("--grid", action="store_true", help="без GUI: сохранить кадр с сеткой")
    args = ap.parse_args()

    frame = grab_frame(args.url)
    if args.grid or not os.environ.get("DISPLAY"):
        grid_mode(frame, Path("data/zone_snapshot.jpg"))
    else:
        gui_mode(frame)


if __name__ == "__main__":
    main()
