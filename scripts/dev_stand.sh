#!/usr/bin/env bash
# Dev-стенд недели 1: скачивает сэмпл и модель лица, поднимает postgres+mediamtx, накатывает миграции.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p data/samples models

SAMPLE=data/samples/people.mp4
if [ ! -s "$SAMPLE" ]; then
  echo "==> скачиваю сэмпл-видео (люди, ~4МБ)"
  curl -fsSL -o "$SAMPLE" \
    "https://github.com/intel-iot-devkit/sample-videos/raw/master/people-detection.mp4"
fi
ffprobe -v error -select_streams v -show_entries stream=codec_name -of csv=p=0 "$SAMPLE" >/dev/null \
  || { echo "сэмпл битый — удали $SAMPLE и перезапусти"; exit 1; }

YUNET=models/face_detection_yunet_2023mar.onnx
if [ ! -s "$YUNET" ] || [ "$(stat -c%s "$YUNET")" -lt 100000 ]; then
  echo "==> скачиваю YuNet (детекция лиц L0, ~2МБ)"
  curl -fsSL -o "$YUNET" \
    "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
fi

if [ ! -f .env ]; then
  echo "==> генерирую .env с ENCRYPTION_KEY"
  cp .env.example .env
  KEY=$(uv run python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
  sed -i "s|^ENCRYPTION_KEY=$|ENCRYPTION_KEY=${KEY}|" .env
fi

echo "==> docker compose: postgres + mediamtx"
docker compose -f deploy/docker-compose.yml up -d postgres mediamtx

echo "==> жду postgres..."
for i in $(seq 1 30); do
  docker compose -f deploy/docker-compose.yml exec -T postgres pg_isready -U soqchi -d soqchi >/dev/null 2>&1 && break
  sleep 1
done

echo "==> alembic upgrade head"
uv run alembic upgrade head

cat <<'EOF'

Стенд готов. Дальше в двух терминалах:
  1) ./scripts/publish_sample.sh          # цикл публикации сэмпла в rtsp://127.0.0.1:8554/cam1
  2) uv run python -m soqchi.main --config config/dev.yaml
EOF
