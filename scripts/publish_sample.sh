#!/usr/bin/env bash
# Публикует зацикленный сэмпл в MediaMTX как rtsp://127.0.0.1:8554/cam1 (наш «Hikvision»)
set -euo pipefail
cd "$(dirname "$0")/.."

exec ffmpeg -hide_banner -loglevel warning \
  -re -stream_loop -1 -i data/samples/people.mp4 \
  -c:v libx264 -preset veryfast -tune zerolatency -pix_fmt yuv420p -g 30 \
  -an -rtsp_transport tcp -f rtsp rtsp://127.0.0.1:8554/cam1
