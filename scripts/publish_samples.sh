#!/usr/bin/env bash
# Мульти-камерный стенд: каждый сэмпл — своя «камера» rtsp://127.0.0.1:8554/camN.
# ultrafast + даунскейл до 768w + 12fps cap — щадим CPU ноутбука (6 энкодеров разом).
set -euo pipefail
cd "$(dirname "$0")/.."

declare -A MAP=(
  [cam1]=people.mp4
  [cam2]=one-by-one-person-detection.mp4
  [cam3]=store-aisle-detection.mp4
  [cam4]=person-bicycle-car-detection.mp4
  [cam5]=face-demographics-walking-and-pause.mp4
  [cam6]=classroom.mp4
)

# kill 0 валит всю процесс-группу: и обёртки-циклы, и сами ffmpeg
trap 'kill 0' EXIT

for cam in "${!MAP[@]}"; do
  f="data/samples/${MAP[$cam]}"
  [ -s "$f" ] || { echo "skip $cam: нет $f"; continue; }
  (
    # ffmpeg умирает (сеть/EOF-глюк) → перезапуск через 2с, камера не «умирает навсегда»
    while true; do
      ffmpeg -hide_banner -loglevel error \
        -re -stream_loop -1 -i "$f" \
        -vf "scale='min(768,iw)':-2,fps=12" \
        -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 24 \
        -an -rtsp_transport tcp -f rtsp "rtsp://127.0.0.1:8554/${cam}" || true
      echo "restart ${cam}" >&2
      sleep 2
    done
  ) &
  echo "publish ${MAP[$cam]} → ${cam}"
done
wait
