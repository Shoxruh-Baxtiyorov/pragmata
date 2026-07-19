FROM python:3.12-slim AS runtime

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# libgl1/libglib2.0-0 — cv2; libgomp1 — onnx/torch OpenMP; ffmpeg — клипы (неделя 2).
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libgomp1 ffmpeg curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev && uv cache clean

# Модели запекаются в образ ДО копирования кода (слой кэшируется между
# обычными правками кода; в рантайме ничего не скачивается — паттерн iqbola).
RUN mkdir -p /app/models \
    && .venv/bin/python -c "from ultralytics import YOLO; YOLO('/app/models/yolo11n.pt')" \
    && curl -fsSL -o /app/models/face_detection_yunet_2023mar.onnx \
        "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"

COPY pragmata/ pragmata/
COPY alembic/ alembic/
COPY alembic.ini conftest.py ./

RUN useradd -m -u 1000 pragmata && mkdir -p /app/data && chown -R pragmata:pragmata /app/data
USER pragmata

ENV PATH="/app/.venv/bin:$PATH" \
    MODELS_DIR=/app/models \
    MEDIA_DIR=/app/data/media

# Миграции идемпотентны и fail-closed: не накатились — контейнер не стартует.
CMD ["sh", "-c", "alembic upgrade head && exec python -m pragmata.main --config ${SITE_CONFIG:-config/dev.yaml}"]
