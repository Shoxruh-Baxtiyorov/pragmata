# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read `AGENTS.md` first** — canonical agent guide (Russian) with the hard rules. This file adds verified architecture detail and gotchas; if they diverge, AGENTS.md wins.

## Working rules (owner directives, 2026-07-18)

- **Frontend work: Claude is orchestrator only** — subagents write the code; the main thread plans, routes, verifies, reviews.
- **Model routing for agents**: planning → Opus 4.8 (`opus`); simple/mechanical tasks → Sonnet 5 (`sonnet`); complex tasks → Opus 4.8; extreme tasks and reviews → Fable 5 (`fable`).
- **UI languages**: en / uz (latin) / ru are first-class from the start; **default = uz**. UI copy is plain language only — no backend jargon ("tracks", "VLM", "false positive" → say "wrong alarms" etc.).
- **One component set**: every screen reuses `web/src/shared/ui` primitives — one Button for the whole platform, never per-page variants.
- **Contract-first UI**: before building any screen, curl the real endpoint (or read `openapi.json` — never guess paths) and use the actual response fields. No invented data.
- **Backend changes need owner approval** before touching `soqchi/`.
- **No over-engineering/over-design**: dashboard follows ONE chosen B2B reference; smallest thing that works.
- **On mistakes**: record the lesson here or in AGENTS.md so future sessions don't repeat it.

## What this is

Soqchi AI — single-tenant, on-prem, offline-first AI Security Copilot over existing CCTV: person detection → deterministic rule events (zone_intrusion, loitering, after_hours_presence, person_entered/exited, camera_offline/online) → evidence clips → Telegram alerts → LLM agent (uz/ru Q&A) → VLM descriptions → appearance search. All AI can run locally (Ollama / any OpenAI-compatible endpoint). No multitenancy, RLS, or RBAC — one site, one admin; do not add them. Comments and docstrings are in Russian — keep that convention.

## Commands (always `uv`, never pip)

| Task | Command |
|---|---|
| Install deps + dev tools | `make dev` |
| Lint / format | `make lint` · `make format` (ruff) |
| Typecheck (mypy strict) | `make typecheck` |
| Fast tests | `make test` — golden excluded via `addopts = "-m 'not golden'"` |
| Single test | `APP_ENV=test uv run pytest tests/test_rules.py -k <name> -q` |
| Golden (full pipeline, slow) | `make golden` — needs `data/samples/people.mp4` or it silently skips |
| Migrations | `make migrate` · `make migration msg="..."` · `make heads` (must be exactly one head) |
| OpenAPI contract | `make api-schema` (regenerate) · `make api-schema-check` (CI) |
| Dashboard API | `make api` (:8088, /docs) |
| Camera pipeline | `make pipeline` (default config/dev-multi.yaml) · dev stand: `make stand` |
| Web frontend | `make front-dev` or `cd web && npm run dev` (:5175) / `build` / `typecheck` / `lint` (oxlint) |

Gates before handoff: `make lint` · `make typecheck` · `make test` (+ `make api-schema-check` if API changed) — all green. Dev bootstrap: `./scripts/dev_stand.sh` (downloads sample + YuNet, starts docker postgres/mediamtx, migrates) — **uses GNU `stat -c%s` and `sed -i`; breaks on macOS/BSD**, run pieces manually or fix flags.

## Architecture

Two processes share one sync SQLAlchemy session factory → Postgres (**host port 5433**, `pgvector/pgvector:pg16`):

### 1. Camera pipeline (`soqchi/main.py` → `soqchi/pipeline.py`)

All threads `daemon=True`, coordinated by one `stop_event`:
- **`cam-<id>` CameraWorker** (1/camera): `ingest/source` frames → live JPEG every 2s (atomic `os.replace` to `data/live/<id>.jpg`) → fps throttle → `ingest/motion` MotionGate (forced open while tracks active) → `perception/detector` YOLO11 → `perception/tracker` ByteTrack (best-frame = sharpness×area; YuNet face crop) → `rules/engine` → sinks. CLIP embedding once at track end.
- **`ring-<id>` SegmentRecorder** (1/clip-camera): own ffmpeg process per camera, 2s `.ts` segments to `data/ring/<cam>/` (`-c copy` for RTSP, transcode for files). **`stdout/stderr=DEVNULL` mandatory** — inherited pipes block shutdown.
- **`clip-worker` ClipWorker**: delayed jobs (due = t_end + post_s + 3s so the tail segment lands), concat ring segments → `data/clips/`, absolute paths in the concat listing (relative breaks).
- **`tg-bot` BotService**: own asyncio loop + aiogram polling; cross-thread via `run_coroutine_threadsafe`; blocking callbacks wrapped in `asyncio.to_thread`.
- **`vlm-worker` VlmWorker**: queue maxsize 32 (full → drop with warning), `HourBudget` cap (`VLM_MAX_PER_HOUR`, default 60); exceptions swallowed — VLM failure never crashes anything. `false_positive=true` from VLM means "no people in frames".
- **`digest` thread**: pure SQL + template, **no LLM by design** (must work without API keys).
- **main thread**: every 5s runs CameraWatchdog — `frames_read` stalled >30s (`OFFLINE_AFTER_S`) → emits `camera_offline` directly to sink, bypassing RuleEngine (`track=None`, so clip/VLM sinks skip it).

Sinks fan out in append order (`MultiSink`): Console → DbSink → [JsonlSink] → ClipSink → BotSink → VlmSink. The list is mutated only at startup before workers start — no lock, safe by ordering. Clip/Bot/Vlm sinks act only on `severity == "alert"` events with a track.

Shutdown order in `main.py` is load-bearing: `stop_event.set()` → workers.join → **recorders.join (must terminate ffmpeg children before interpreter exit)** → clip_worker.join → bot.stop().

Shared instances across camera threads: `PersonDetector` and `ClipEmbedder` have internal locks; **`FaceCropper` is shared unlocked stateful YuNet** — know this before touching `faces.py`/threading.

### 2. Dashboard API (`soqchi/api/app.py`, FastAPI)

Layering: `api/routers/` (thin: auth, cameras, events, insights, agent) → **`soqchi/services/`** (`events_service.py`, `insights_service.py`) → `db/queries.py`. `deps.py` (DI; `session_factory()` is `@lru_cache` returning the factory — call sites do `session_factory()()`), `security.py` (JWT HS256, 12h TTL, single admin), `middleware.py` (security headers), `core/rate_limit.py` (in-memory login throttle: 5 tries / 5 min → 15-min IP lockout). All routes under `/api/v1`; only `/health` is open. No WebSocket/SSE anywhere — "live" view is authed JPEG snapshots meant for polling; camera "online" = `data/live/<id>.jpg` mtime <15s (`ONLINE_STALE_S` — duplicated in both service files). If the pipeline process isn't running, all cameras show offline.

### Web frontend (`web/`)

**Current state (2026-07-18)**: `main` carries the teammate's frontend (imaktab-front design system) with UI for all 5 product features — camera management + zone editor, watchlist, PDF reports, rules-via-chat, dynamic config (migration 0005). The iqbola-DS redesign below is **parked on branch `redesign/iqbola-ds`** (full scaffold + Plausible-style dashboard, Fable-audited) — port it incrementally; do not mix the two token systems in one page.

Parked branch architecture (for the port): scaffold on the **iqbola-design system** (`iqbola-skills` marketplace: style-system-builder, variable-tokenizer, component-builder): design tokens in `src/index.css` — light + dark themes (dark mandatory, `data-theme` on `<html>`), 4pt spacing grid, radii button/input 12 / card 16 / modal 24 / pill, shadows S/M/L, type scale H1–H4/Body/Label/Caption, icons only 16/20/24/32 via `@/shared/ui/icons`. Stack: React 19 + Vite 7 (port 5175) + TS strict + Tailwind 4 via PostCSS + TanStack Query + react-router 7 + i18next (ru canonical, uz `typeof ru`). Feature-sliced `src/features/<domain>/{index.ts, api/, pages/, model/}`; cross-feature imports only through barrels. `auth` is the fully-wired reference feature (login → JWT in localStorage `soqchi_token` → router-level gate → central 401 handling); other features are `PlaceholderPage` stubs. Media needs Bearer — use `useAuthedMedia`, never plain `<img src>`. `types.ts` hand-written — sync with root `openapi.json` on API changes. Commands: `cd web && npm run dev/build/typecheck/lint` (oxlint).

Agent (`soqchi/agent/`): SQL-first — typed tools (`search_events`, `stats`, `find_person`, `classify_people`, `camera_status`) building parameterized SQLAlchemy selects; the LLM never sees SQL. Max 5 tool rounds; inline tool-call parser fallback for local models that emit calls as text; evidence (photos/clips, cap 5) taken only from the **last** evidence-tool call. Person gender/categories only via `classify_people`.

Investigation (`investigation.py`): CLIP contrast margin — candidate passes only if `sim(query) − sim("a photo of a person") ≥ min_margin`; pgvector `cosine_distance` prefilter of 20 (`CANDIDATE_POOL`) then re-rank in Python. Negation queries (no/not/without, без/не/нет, yo'q/emas) rejected — CLIP ignores negation.

### DB (`soqchi/db/models.py`)

`sites`, `cameras` (String PK = YAML camera id; `url` is `EncryptedString`), `tracks` (UUID PK; per-camera ByteTrack `track_id`, not global; `clip_emb Vector(512)`), `events` (type/severity/zone, media paths, VLM `description`, `meta` JSONB holding `track_id`), `chats`, `feedback` (verdict = `false_positive | confirmed`). Timestamps UTC `DateTime(timezone=True)`; convert to site tz only at display. Alembic gets the URL from `Settings.database_url` at runtime, not from alembic.ini.

## Conventions

- Python: `from __future__ import annotations` everywhere; PEP 604 unions; aggressive `TYPE_CHECKING` + lazy in-function imports for heavy deps (torch, open_clip, ultralytics, db); pydantic only at config/env boundary (`config.py`), plain `@dataclass` for runtime state; `log = logging.getLogger("soqchi.<area>")`, per-camera `[%s]` prefix; boundary errors: `except Exception:  # noqa: BLE001` + `log.exception` + continue (pipeline must not crash); `EventSink` is a `typing.Protocol` (structural, no inheritance).
- Config split: secrets / endpoints / feature flags → `.env` (`Settings`, `@lru_cache get_settings()`); physical site (cameras, zones with normalized 0..1 polygons, schedules) → YAML (`SITE_CONFIG`, default `config/dev.yaml`). Dev YAML variants: `dev-file` (no MediaMTX), `dev-degraded`/`dev-night-tuned` (quality tuning), `dev-fight` (tracker stress), `dev-multi` (6-cam stand), `golden` (CI baseline 8/8/3). `scripts/zone_tool.py` generates zone YAML from a live frame.
- Tools return `{"error": ...}` dicts, never raise (agent must tolerate); routers/services raise `HTTPException` with short Russian messages.

## Gotchas

**Fail-closed secrets (exact behavior):**
- `SECRET_KEY` empty → every authed endpoint 503. `ADMIN_PASSWORD` empty → login 503. **No test escape hatch for either** — tests must set them (and `get_settings.cache_clear()` before AND after; the user's real `.env` leaks into tests otherwise, see `tests/test_api.py`).
- `ENCRYPTION_KEY` empty → `RuntimeError` at first use; **`APP_ENV=test` (or `TESTING=1`) escape hatch applies to encryption only**. Losing the key = losing every stored RTSP URL. Fernet instance is `@lru_cache` — key change needs process restart.
- `LLM_API_KEY` empty is graceful: `/agent/ask` → 501, digest/stats still work. `/find` additionally needs `API_ENABLE_FIND=1` (loads CLIP ~600MB into the API process).

**Calibrations & thresholds:**
- `find_min_margin`: `Settings` default **0.032** (live value, always passed) vs `find_people()` param default 0.025 — recalibrate as a pair if the embedder changes; changes go with a measurement noted in commit (AGENTS.md rule).
- Zone intrusion fires on **exact equality** `zone_hits == hysteresis_frames` (engine.py), cooldown set only then; loitering uses `>=` throttled by cooldown. Zone reset only after ≥2 consecutive out-of-zone frames (single-frame flicker tolerated — regression-tested).
- Cooldown key is `(rule, zone, track_id)` — ByteTrack ID reassignment after loss resets cooldown → possible duplicate alert.
- `PUSH_SEVERITIES = {"alert"}` in bot: **loitering is `warning` severity and never pushes to Telegram** by design. Severity map: `rules/engine.py` `SEVERITY` table is the single source.

**Cross-file invariants (update all or drift silently):**
- Alert types tuple `("zone_intrusion", "after_hours_presence", "camera_offline")` is hardcoded in `agent/tools.py` (stats), `digest.py`, and `services/insights_service.py` — but alert *lists* filter on `severity == "alert"`. Adding an alert type means updating all three files.
- `ONLINE_STALE_S = 15.0` duplicated in `events_service.py` and `insights_service.py`.
- Changing API request/response shapes: `make api-schema` in the same commit (CI enforces `openapi.json` freshness).

**Tests:**
- `uv run pytest` runs fast tests only (addopts excludes `golden`); all fast tests are pure in-memory — no Postgres needed. Golden spawns a subprocess (`--offline --no-bot --sink jsonl`), asserts event-count *ranges* (CPU drift ±1-2), and reads JSONL from **`MEDIA_DIR.parent/events.jsonl`** (sink derives the path from media dir's parent).
- `--no-bot` matters: two aiogram pollers on one token conflict. `--offline` makes file sources run faster than wall-clock.

**Infra:**
- Ports: Postgres **5433** in docker-compose, **but this dev machine has no container runtime** — dev DB is brew `postgresql@16` on **5432** (pgvector 0.8.5 built from source against pg16; role/db `soqchi`/`soqchi`), `DATABASE_URL` in `.env` points at 5432. API 8088, MediaMTX RTSP 8554, web dev 5175. Everything binds 127.0.0.1. Backend CORS origins from `API_CORS_ORIGINS`.
- Lesson (2026-07-18): API paths were guessed once (`/api/v1/insights/*` — wrong) — always read `openapi.json` for real paths/schemas first.
- Lesson (2026-07-18): the owner's terminal switches branches in the main checkout mid-session — builder agents once landed on the wrong tree. **Multi-agent build work runs in a dedicated `git worktree`**, never the shared checkout; give every builder a wrong-tree guard ("verify anchor content, else STOP").
- Lesson (2026-07-18): "boshqa page'larni qilib tugat" was misread as a design-system port and a whole planning/build wave went the wrong direction. Before launching multi-agent work, restate the goal in one sentence ("N pages on branch X") and check it against what the owner is currently looking at (their checked-out branch = what they see in Vite). The owner works on `redesign/iqbola-ds`; that tree is the product surface unless they say otherwise. The token-port work sits in the scratchpad worktree (branch feat/iqbola-ds-port, 2 open audit findings: white modal scrim in dark, low-contrast badge text in dark).
- `.env` changes are invisible to a running `make api` — `get_settings` is cached per process and `--reload` only watches `.py` files; `touch soqchi/api/app.py` forces the worker to restart and re-read `.env`.
- Migration `0002` wipes `cameras.url` (plaintext → unreadable by new decrypt code; cameras rebuilt from YAML on start). Don't run on data you care about.
- `make stand` (6-cam publisher) needs 5 extra sample files that nothing auto-downloads — missing ones are skipped, stand comes up partial. `dev_stand.sh` fetches only `people.mp4`.
- `make_source` dispatches by `Path(url).exists()`: existing local path → FileSource, else CvSource (RTSP over TCP, 1→60s reconnect backoff). Frame timestamps are server clock, camera clocks distrusted.
- `FaceCropper.available` requires YuNet file >100 KB (rejects LFS pointers/truncated downloads).

## Git

Feature branch → PR to `main`. Push only on the owner's explicit command (local-first). SSH via `~/.ssh/id_ed25519_aibot` (`core.sshCommand` already set in repo).
