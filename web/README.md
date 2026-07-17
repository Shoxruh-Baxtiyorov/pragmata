# Soqchi AI — веб-дашборд

Рабочее место охранника/директора: живая стена камер, лента событий с
доказательствами, статистика, поиск по описанию. React 19 + Vite + TS +
Tailwind v4 + react-query + i18next (uz/ru). Бэкенд — `soqchi.api` (см. корневой README).

## Запуск (3 команды)

```bash
npm install
# API бэкенда должен работать: (из корня) make api  → http://127.0.0.1:8088
npm run dev            # http://localhost:5175
```

`.env`: `VITE_API_URL=http://127.0.0.1:8088`. Логин — пароль `ADMIN_PASSWORD` из `.env` бэкенда.

## Архитектура (feature-module, как в imaktab-front)

`app/` (composition root: providers/router/layout) → `features/<domain>/`
(auth · live · events · insights · search; каждая с `api/ pages/ components/ model/`
+ barrel `index.ts`) → `shared/` (`api/` клиент+типы, `ui/` DS, `lib/`, `i18n/`, `hooks/`).
Импорт чужой фичи — только через её barrel `@/features/<x>`.

## Команды

| | |
|---|---|
| `npm run dev` | dev-сервер (Vite, :5175) |
| `npm run typecheck` | `tsc -b` — чисто перед хендоффом |
| `npm run lint` | oxlint |
| `npm run build` | прод-сборка |

## Контракт API

Источник истины — `openapi.json` бэкенда (`http://127.0.0.1:8088/docs`).
Типы в `src/shared/api/types.ts` (TODO: генерировать через `openapi-typescript`).
Медиа (фото/клипы) требуют Bearer → грузятся через `useAuthedMedia` (fetch→blob→objectURL).

## Осознанные решения

- Только снапшоты камер (поллинг 3с), НЕ видеопотоки — WebRTC/HLS отложены.
- Поллинг вместо WebSocket (интервалы в `shared/lib/format.ts` POLL — заменим одним местом).
- Тёмная security-ops тема, единственная в MVP.
- Порт 5175 (5173/5174 заняты фронтом Iqbola на dev-машине).
