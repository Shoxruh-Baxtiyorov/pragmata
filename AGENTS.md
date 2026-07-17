# Soqchi AI — agent guide

Правила и карта для любого агента/разработчика в этом репо. Читай ПЕРЕД правкой.
Стандарт качества и раскладка — по образцу `iqbola-backend`, адаптированы к нашему
проекту: **single-tenant, on-prem, offline-first**. Мультитенантности/RLS/RBAC из
Iqbola здесь НЕТ (один объект, один админ) — не добавляй их без причины.

## Что это

AI Security Copilot поверх существующих камер: детекция людей → события (вход в
зону, loitering, after-hours, camera offline) → клипы-доказательства → Telegram-
алерты с кнопками → LLM-агент (вопросы на uz/ru) → VLM-описания → поиск по описанию
внешности. Весь AI работает **локально** (Ollama), интернет не обязателен.

## Стек

Python 3.12 · **uv** (никогда pip) · OpenCV · ultralytics YOLO11 + supervision
(ByteTrack) · insightface-free YuNet (L0-лица) · open_clip (поиск/классификация) ·
sync SQLAlchemy 2.0 + Postgres + **pgvector** · Alembic · aiogram 3 (бот) ·
FastAPI (Dashboard API) · Fernet (шифрование RTSP-кредов) · ruff + mypy (strict).
LLM/VLM — любой OpenAI-совместимый endpoint (Ollama локально / OpenRouter в облаке).

> Почему sync SQLAlchemy, а не async как в iqbola: нагрузка — один админ + один
> пайплайн-процесс, оба шарят sync session_factory. Async-переписка = риск без
> выигрыша при нашем профиле. Если появится многопользовательский real-time —
> пересмотреть.

## Раскладка (`soqchi/`)

- `ingest/` — источники видео (RTSP/файл/MJPEG, реконнект) + motion gate
- `perception/` — detector (YOLO), tracker (ByteTrack + best-frame + L0-лицо),
  faces (YuNet), embedder (CLIP)
- `rules/` — детерминированная фабрика событий (зоны, hysteresis, cooldown, dwell,
  after-hours). **Никакого ML здесь** — только правила
- `clips.py` — кольцевой буфер ffmpeg + нарезка клипов
- `bot/` — Telegram (сервис + тексты)
- `agent/` — LLM-агент (runner + typed tools; **SQL-first, не text-to-SQL**)
- `vlm.py` — описания alert-кадров
- `investigation.py` — поиск по описанию (контраст-порог + guard негаций)
- `digest.py` — вечерняя сводка (без LLM by design)
- `db/` — модели (SQLAlchemy), session, queries
- `api/` — Dashboard API: `routers/` (тонкие) → `services/` (логика) → `db/`;
  `deps.py` (DI-хелперы), `security.py` (JWT), `middleware.py` (заголовки),
  `schemas.py` (Pydantic)
- `core/` — encryption, redact, rate_limit
- `config.py` — Settings (.env) + модели YAML-конфига объекта
- `main.py` — сборка пайплайна (камеры + бот + VLM + дайджест)

## Команды (Makefile — всегда uv)

| Задача | Команда |
|---|---|
| установка | `make dev` |
| линт / формат | `make lint` · `make format` |
| типы | `make typecheck` (mypy strict, чисто перед хендоффом) |
| тесты | `make test` (быстрые) · `make golden` (полный пайплайн, медленно) |
| миграции | `make migrate` · `make migration msg="..."` · `make heads` (одна голова!) |
| OpenAPI | `make api-schema` (записать) · `make api-schema-check` (CI) |
| запуск API | `make api` (:8088, /docs) |
| пайплайн | `make pipeline` · стенд `make stand` |

## Правила, которые нельзя нарушать

1. **fail-closed секреты.** `ENCRYPTION_KEY` (шифрование), `SECRET_KEY`+`ADMIN_PASSWORD`
   (API-логин) — без них соответствующий модуль отвечает ошибкой, а не работает
   в открытую. Только `APP_ENV=test` разрешает детерминированные dev-значения.
2. **Секреты не коммитим.** `.env`, токены, RTSP-пароли — никогда в git. RTSP-URL
   в БД шифруются (`EncryptedString`), в логах маскируются (`redact_url`).
3. **Одна голова Alembic.** Перед миграцией `make heads` = ровно одна; `down_revision`
   = она. pgvector-колонки — через `pgvector.sqlalchemy.Vector`.
4. **SQL-first агент.** Инструменты агента — типизированные функции, НЕ генерация SQL
   моделью (защита от инъекций и выдуманных колонок). Пол/категории — только через
   `classify_people`, не «на глаз» модели.
5. **API-контракт свежий.** Изменил форму запроса/ответа → `make api-schema` в том же
   коммите (фронт генерит типы из `openapi.json`; CI ловит рассинхрон).
6. **Ворота перед хендоффом:** `make lint` · `make typecheck` · `make test` ·
   `make api-schema-check` (если API менялся) — всё зелёное.
7. **Локальность.** Не добавляй обязательных облачных зависимостей — офлайн-режим
   (весь AI на объекте) это наш козырь и требование госсектора.
8. **Калибровки — на данных.** Пороги (find_min_margin и пр.) меняем по замеру, не
   на глаз; факт калибровки — в комментарий/коммит.

## Тесты

`tests/` — юниты правил, шифрования, investigation, agent-tools, VLM, API-auth +
golden (полный пайплайн, маркер `golden`, исключён из дефолтного прогона). Golden
тянет эталонный клип в CI отдельным job'ом.

## Git

Ветка фичи → PR в `main`. Коммиты осмысленные, с co-author trailer. Push — через
SSH-ключ `~/.ssh/id_ed25519_aibot` (`core.sshCommand` уже прописан в репо).
**Local-first: пуш только по явной команде владельца.**
