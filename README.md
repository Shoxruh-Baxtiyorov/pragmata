# Soqchi AI (ishchi nom / рабочее название)

AI Security Copilot — mavjud kameralar ustidagi AI-agent: o'zi kuzatadi, Telegramga o'zi doklad qiladi, uz/ru savollarga javob beradi, odamni tavsif bo'yicha topadi.

Loyiha President AI Award 2026 uchun. Muddatlar: early bird **15.08.2026**, final **30.09.2026**.

## Hujjatlar / Документация

- [docs/DESIGN.uz.md](docs/DESIGN.uz.md) — to'liq dizayn-hujjat (o'zbekcha)
- [docs/DESIGN.ru.md](docs/DESIGN.ru.md) — полный дизайн-док (русский)
- [docs/VISION.uz.md](docs/VISION.uz.md) — vizyon va kelajak rejalari (o'zbekcha)
- [docs/VISION.ru.md](docs/VISION.ru.md) — видение и дальнейшие планы (русский)
- [docs/PITCH_DECK.md](docs/PITCH_DECK.md) — скелет питч-деки (12 слайдов, конкурс)
- [docs/VIDEO_SCRIPT.md](docs/VIDEO_SCRIPT.md) — посекундный сценарий 3-мин видео + план съёмки

## Quickstart (dev-стенд, неделя 1)

```bash
uv sync                          # зависимости (torch CPU; для GPU см. pyproject → pytorch index)
./scripts/dev_stand.sh           # сэмпл-видео + YuNet + docker (postgres:5433, mediamtx:8554) + миграции
./scripts/publish_sample.sh &    # зацикленный сэмпл → rtsp://127.0.0.1:8554/cam1
uv run python -m soqchi.main --config config/dev.yaml
```

События падают в Postgres (`events`, `tracks`) + кропы в `data/media/`. Без БД:
`--sink jsonl` (события в `data/events.jsonl`). Тесты: `uv run pytest`.

**Dashboard API** (бэкенд веб-фронта): `uv run uvicorn soqchi.api.app:app --port 8088`
→ OpenAPI на `/docs`. Нужны `SECRET_KEY` и `ADMIN_PASSWORD` в `.env` (fail-closed).
Промт для фронта: [docs/FRONTEND_PROMPT.md](docs/FRONTEND_PROMPT.md); код фронта — в `web/`.

Пайплайн: `VideoSource (RTSP/mp4/MJPEG) → MotionGate → YOLO11n → ByteTrack →
RuleEngine (zone_intrusion / loitering / after_hours / entered / exited / camera_offline)
→ Postgres + кропы (L0-лица YuNet) → клипы из кольцевого буфера → Telegram-алерты`.

**Telegram:** токен от @BotFather в `TELEGRAM_BOT_TOKEN` (.env), свои chat_id — в
`TELEGRAM_CHAT_IDS` (бот подскажет id на /start). Алерты приходят карточкой с фото и
кнопками [🎬 Клип] [⚠️ Ложное] [✅ Ок]; клип (10с до + 20с после события) готов ~через
30с после алерта.

**Телефон как камера:** Android → приложение IP Webcam → Start server → в конфиг
`url: "http://<ip-телефона>:8080/video"` (пример в `config/site.example.yaml`).

## Holat

2-hafta yakunlandi (2026-07-13): ring buffer kliplari (ffmpeg `-c copy`, 2s segmentlar)
+ Telegram-alertlar (kartochka: foto + tugmalar, FP-feedback bazaga) + after_hours va
camera_offline/online qoidalari. Keyingi: hafta 3 — agent (SQL-first tools) + kechki
digest + VLM tavsiflari.
