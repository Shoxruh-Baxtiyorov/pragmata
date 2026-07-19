# Pragmata AI — команды разработки (всегда uv, никогда pip). Стандарт: iqbola-backend.
.PHONY: install dev lint format typecheck test golden migrate migration heads api-schema api-schema-check api pipeline stand front-dev help

help:
	@grep -E '^[a-zA-Z_-]+:.*?# .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?# "}{printf "  %-18s %s\n", $$1, $$2}'

install:  # зависимости (prod)
	uv sync
dev:  # зависимости + dev-инструменты
	uv sync --dev

lint:  # ruff check
	uv run ruff check pragmata/ tests/ scripts/
format:  # ruff format
	uv run ruff format pragmata/ tests/ scripts/
typecheck:  # mypy
	uv run mypy pragmata/
test:  # быстрые тесты (без golden)
	APP_ENV=test uv run pytest -q
golden:  # полный пайплайн на эталонном клипе (медленно)
	APP_ENV=test uv run pytest -m golden -q

migrate:  # накатить миграции
	uv run alembic upgrade head
migration:  # новая миграция: make migration msg="..."
	uv run alembic revision --autogenerate -m "$(msg)"
heads:  # проверка единственной головы alembic
	uv run alembic heads

api-schema:  # записать openapi.json (после изменения API)
	uv run python scripts/generate_openapi.py
api-schema-check:  # CI: openapi.json актуален
	uv run python scripts/generate_openapi.py --check

api:  # Dashboard API :8088
	uv run uvicorn pragmata.api.app:app --host 127.0.0.1 --port 8088 --reload
pipeline:  # пайплайн камер (config=... по умолчанию dev-multi)
	uv run python -m pragmata.main --config $(or $(config),config/dev-multi.yaml) --sink db
stand:  # dev-стенд: 6 камер-паблишеров
	./scripts/publish_samples.sh
front-dev:  # веб-фронт (Vite)
	cd web && npm run dev
