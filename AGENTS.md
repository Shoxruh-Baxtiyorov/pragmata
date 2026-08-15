# Pragmata AI — agent guide

Правила и карта для любого агента/разработчика в этом репо. Читай ПЕРЕД правкой.
Стандарт качества и раскладка — по образцу `iqbola-backend`, адаптированы к нашему
проекту: **offline-first**, работает без интернета.

**Аренда (решение 2026-07-22, отменяет прежнее «single-tenant»):** продукт
**мультиарендный**. Арендатор — строка в `sites` (организация-клиент: своё имя,
часовой пояс, рабочие часы, дайджест).

- `role='admin'` — платформа (владелец продукта). `site_id` пуст, видит ВСЕ
  организации, включая видео. Его поверхность — `/backoffice/*` за allowlist'ом
  `BACKOFFICE_USERS`.
- `role='user'` — сотрудник организации-клиента. Видит и настраивает ТОЛЬКО
  камеры своей организации: клиент обязан заводить и настраивать камеры сам,
  иначе владелец платформы становится вечным настройщиком у каждого.

Скоуп берётся из `Principal.scope` (`None` = платформа). Правила:
- фильтруй запросы по `site_id`; у клиента без организации scope = `-1`, чтобы
  дыра в данных не превратилась в утечку между арендаторами;
- чужой объект отдавай **404, а не 403** (`own_camera_or_404`,
  `own_person_or_404`): 403 подтверждает сам факт его существования;
- новые таблицы с данными клиента обязаны нести `site_id` либо скоупиться
  транзитивно (zones/tracks/archive_jobs → камера, feedback → событие,
  person_photos → человек).

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

## Раскладка (`pragmata/`)

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

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:46cd31e7 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->

<!-- bv-agent-instructions-v3 -->

---

## Beads Workflow Integration

This project uses [beads_rust](https://github.com/Dicklesworthstone/beads_rust) (`br`) for issue tracking and [beads_viewer](https://github.com/Dicklesworthstone/beads_viewer) (`bv`) for graph-aware triage. Issues are stored in `.beads/` and tracked in git. Current `br` workspaces normally export `.beads/issues.jsonl`; older `bd`/legacy workspaces may use `.beads/beads.jsonl`. `bv` auto-discovers the supported JSONL files, so agents should use `br`/`bv` commands instead of hard-coding a single filename.

### Using bv as an AI sidecar

bv is a graph-aware triage engine for Beads projects. Instead of parsing .beads/issues.jsonl / .beads/beads.jsonl directly or hallucinating graph traversal, use robot flags for deterministic, dependency-aware outputs with precomputed metrics (PageRank, betweenness, critical path, cycles, HITS, eigenvector, k-core).

**Scope boundary:** bv handles *what to work on* (triage, priority, planning). `br` handles creating, modifying, and closing beads.

**CRITICAL: Use ONLY --robot-* flags. Bare bv launches an interactive TUI that blocks your session.**

#### The Workflow: Start With Triage

**`bv --robot-triage` is your single entry point.** It returns everything you need in one call:
- `quick_ref`: at-a-glance counts + top 3 picks
- `recommendations`: ranked actionable items with scores, reasons, unblock info
- `quick_wins`: low-effort high-impact items
- `blockers_to_clear`: items that unblock the most downstream work
- `project_health`: status/type/priority distributions, graph metrics
- `commands`: copy-paste shell commands for next steps

```bash
bv --robot-triage        # THE MEGA-COMMAND: start here
bv --robot-next          # Minimal: just the single top pick + claim command

# Token-optimized output (TOON) for lower LLM context usage:
bv --robot-triage --format toon
```

Before claiming, verify current state with `br show <id> --json` or `br ready --json`. `recommendations` can include graph-important blocked or assigned work; only `quick_ref.top_picks` and non-empty `claim_command` fields represent claimable work.

#### Other bv Commands

| Command | Returns |
|---------|---------|
| `--robot-plan` | Parallel execution tracks with unblocks lists |
| `--robot-priority` | Priority misalignment detection with confidence |
| `--robot-insights` | Full metrics: PageRank, betweenness, HITS, eigenvector, critical path, cycles, k-core |
| `--robot-alerts` | Stale issues, blocking cascades, priority mismatches |
| `--robot-suggest` | Hygiene: duplicates, missing deps, label suggestions, cycle breaks |
| `--robot-diff --diff-since <ref>` | Changes since ref: new/closed/modified issues |
| `--robot-graph [--graph-format=json\|dot\|mermaid]` | Dependency graph export |

#### Scoping & Filtering

```bash
bv --robot-plan --label backend              # Scope to label's subgraph
bv --robot-insights --as-of HEAD~30          # Historical point-in-time
bv --recipe actionable --robot-plan          # Pre-filter: ready to work (no blockers)
bv --recipe high-impact --robot-triage       # Pre-filter: top PageRank scores
```

### br Commands for Issue Management

```bash
br ready --json                       # Show issues ready to work (no blockers)
br list --status=open --json          # All open issues
br show <id> --json                   # Full issue details with dependencies
br create --title="..." --type=task --priority=2 --json
br update <id> --status=in_progress --json
br close <id> --reason="Completed" --json
br close <id1> <id2> --reason="Completed" --json
br sync --flush-only                  # Export DB to JSONL after Beads mutations
```

### Workflow Pattern

1. **Triage**: Run `bv --robot-triage` to find the highest-impact actionable work
2. **Claim**: Use `br update <id> --status=in_progress --json`
3. **Work**: Implement the task
4. **Complete**: Use `br close <id> --reason="Completed" --json`
5. **Sync**: Run `br sync --flush-only` after Beads mutations so the JSONL export is current

### Key Concepts

- **Dependencies**: Issues can block other issues. `br ready --json` shows only unblocked work.
- **Priority**: P0=critical, P1=high, P2=medium, P3=low, P4=backlog (use numbers 0-4, not words)
- **Types**: task, bug, feature, epic, chore, docs, question
- **Blocking**: `br dep add <issue> <depends-on>` to add dependencies

### Git Policy

`br` never commits or pushes. Follow this repository's own git instructions before staging, committing, or pushing. If the repository says "commit only when asked," that rule overrides any generic workflow advice.

<!-- end-bv-agent-instructions -->
