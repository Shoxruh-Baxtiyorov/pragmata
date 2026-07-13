# Soqchi AI (ishchi nom / рабочее название)

AI Security Copilot — mavjud kameralar ustidagi AI-agent: o'zi kuzatadi, Telegramga o'zi doklad qiladi, uz/ru savollarga javob beradi, odamni tavsif bo'yicha topadi.

Loyiha President AI Award 2026 uchun. Muddatlar: early bird **15.08.2026**, final **30.09.2026**.

## Hujjatlar / Документация

- [docs/DESIGN.uz.md](docs/DESIGN.uz.md) — to'liq dizayn-hujjat (o'zbekcha)
- [docs/DESIGN.ru.md](docs/DESIGN.ru.md) — полный дизайн-док (русский)
- [docs/VISION.uz.md](docs/VISION.uz.md) — vizyon va kelajak rejalari (o'zbekcha)
- [docs/VISION.ru.md](docs/VISION.ru.md) — видение и дальнейшие планы (русский)

## Quickstart (dev-стенд, неделя 1)

```bash
uv sync                          # зависимости (torch CPU; для GPU см. pyproject → pytorch index)
./scripts/dev_stand.sh           # сэмпл-видео + YuNet + docker (postgres:5433, mediamtx:8554) + миграции
./scripts/publish_sample.sh &    # зацикленный сэмпл → rtsp://127.0.0.1:8554/cam1
uv run python -m soqchi.main --config config/dev.yaml
```

События падают в Postgres (`events`, `tracks`) + кропы в `data/media/`. Без БД:
`--sink jsonl` (события в `data/events.jsonl`). Тесты: `uv run pytest`.

Пайплайн недели 1: `VideoSource (RTSP/mp4/MJPEG) → MotionGate → YOLO11n → ByteTrack →
RuleEngine (zone_intrusion / loitering / entered / exited) → Postgres + кропы (L0-лица YuNet)`.

## Holat

1-hafta boshlandi (2026-07-13): pipeline skeleti ishlaydi (yuqoridagi quickstart).
Keyingi: hafta 2 — ring buffer kliplari + Telegram-alertlar (dizayn-hujjatdagi reja bo'yicha).
