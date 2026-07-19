# Промт для фронтенда Pragmata AI (передать AI-ассистенту Отабека)

> Как пользоваться: скопируй ВСЁ, что ниже черты, в Claude Code / Cursor в корне репозитория
> `pragmata-ai`. Бэкенд уже работает: `uv run uvicorn pragmata.api.app:app --port 8088`,
> живая OpenAPI-спека — http://127.0.0.1:8088/docs. Вопросы по API — Шохруху.

---

Ты — senior frontend-инженер. Строишь веб-дашборд для **Pragmata AI** — системы
AI-видеонаблюдения (President AI Award 2026). Бэкенд готов и работает, его НЕ трогаем.

## Контекст продукта

Pragmata AI подключается к существующим камерам, детектит людей, события
(вход в запретную зону, праздношатание, работа в нерабочее время), режет клипы-доказательства,
шлёт алерты в Telegram и отвечает на вопросы через LLM-агента. Дашборд — рабочее место
охранника/директора: живая стена камер, лента событий с доказательствами, статистика.
После веба этот же API будет использовать мобильное приложение — API-first, ничего
не хардкодить под браузер.

## Стек и структура (жёстко)

- **React 19 + Vite + TypeScript (strict) + Tailwind CSS**
- Данные: **@tanstack/react-query** (поллинг), роутинг: **react-router**
- i18n: **react-i18next**, локали `uz` (латиница) и `ru`, ru — дефолт; ВСЕ строки через t()
- Структура: feature-модули `src/app/ → src/features/<x>/ → src/shared/`;
  импорт чужой фичи только через её barrel (`@/features/<x>`)
- Код в папке **`web/`** этого же репозитория. `web/.env`: `VITE_API_URL=http://127.0.0.1:8088`
- Типы API: сгенерируй через `openapi-typescript` из `${VITE_API_URL}/openapi.json`
  в `src/shared/api/types.ts`; клиент — тонкая обёртка fetch с Bearer-токеном

## API (работает прямо сейчас; полная спека в /docs)

Auth: `POST /api/v1/auth/login {password}` → `{access_token}` (JWT, 12ч).
Токен → `Authorization: Bearer <token>` на всех остальных. 401 → редирект на логин.
Хранить токен в memory + localStorage (MVP допустимо), 401-интерсептор обязателен.

| Метод | Путь | Что |
|---|---|---|
| GET | `/api/v1/me` | проверка токена |
| GET | `/api/v1/cameras` | `[{id, name, online, snapshot_url, zones[{name,type,polygon[[x,y]0..1]}]}]` |
| GET | `/api/v1/cameras/{id}/snapshot` | JPEG (обновляется ~каждые 2с; Cache-Control: no-store) |
| GET | `/api/v1/events?hours&camera_id&type&severity&zone&limit&offset` | `{total, items[EventOut]}` |
| GET | `/api/v1/events/{id}/photo` \| `/face` \| `/clip` | JPEG / JPEG / MP4 |
| POST | `/api/v1/events/{id}/feedback {verdict: "false_positive"\|"confirmed"}` | кнопки Ложное/Ок |
| GET | `/api/v1/stats?hours` | `{visitors_entered, alerts, by_type{}, by_camera{}}` |
| GET | `/api/v1/digest?hours` | `{text}` — готовая текстовая сводка |
| GET | `/api/v1/find?description&hours` | Investigation; сейчас может отвечать **501** — покажи «скоро», не ломайся |

`EventOut`: `{id, camera_id, camera, type, severity(info|warning|alert), zone,
t_start, t_end, duration_s, description, people_in_zone, photo_url, face_url, clip_url}`.
Типы событий: `person_entered|person_exited|zone_intrusion|loitering|after_hours_presence|camera_offline|camera_online`.
`description` — текст от vision-модели («Мужчина в тёмной одежде…»), показывай при наличии.
ВАЖНО: медиа-URL относительные и **требуют Bearer** — грузи через fetch → blob → objectURL
(хелпер `useAuthedMedia`), `<img src>` напрямую не сработает.

## Экраны (в порядке приоритета)

1. **/login** — пароль, ошибка «неверный пароль», редирект на /live.
2. **/live — Живая стена.** Грид снапшотов всех камер (обновление каждые 3с), имя,
   бейдж online/offline (offline — приглушить + красный бейдж), поверх снапшота —
   SVG-оверлей полигонов зон (polygon в долях → умножить на размеры контейнера),
   у alert-событий последних 60с — пульсирующая рамка карточки. Клик по камере →
   /events?camera_id=…
3. **/events — Лента событий.** Фильтры: период (1ч/24ч/7д), камера, тип, severity;
   пагинация «показать ещё» (offset). Карточка: превью фото, тип с иконкой по severity
   (alert=красный, warning=янтарный, info=серый), камера, зона, время (локальное,
   HH:mm:ss), description если есть, «Людей в зоне: N» если >1. Клик → модалка:
   фото крупно, `<video controls>` если clip_url, кнопки **[⚠️ Ложное] [✅ Ок]**
   (POST feedback, оптимистичное состояние «учтено»).
4. **/stats — Статистика.** Карточки цифр (посетители, тревоги за период), разбивка
   по типам и камерам (простые бары, без тяжёлых чарт-либ — можно чистый CSS/div),
   блок «Дайджест» — текст из /digest в `<pre>` с сохранением эмодзи.
5. **/search — Investigation.** Поле «опишите человека» + период → карточки
   (фото, время, камера, сходство %). При 501 от API — плейсхолдер
   «Поиск включается на сервере (API_ENABLE_FIND)». При 422 — показать message.

## Дизайн

Тёмная «security-ops» тема, дефолт и единственная в MVP:
фон `#0b0f14`, поверхности `#121820`/`#1a222c`, текст `#e6edf3`/`#8b98a5`,
alert `#f85149`, warning `#d29922`, ok `#3fb950`, акцент `#58a6ff`.
Шрифты: Inter (UI) + JetBrains Mono (времена, id камер). Плотная информативная
вёрстка без «маркетинговых» градиентов и стоковых иллюстраций; доказательства
(фото/видео) — всегда крупно. Длинные названия камер не должны ломать сетку
(truncate + title). Адаптив: 1 колонка на мобильном (дашборд будут открывать с телефона).

## Реалтайм

WebSocket в API пока нет. Поллинг react-query: снапшоты 3с, события 5с
(`refetchInterval`), stats 30с. Вынеси интервалы в константы — при появлении WS
заменим одним местом.

## Качество / Definition of Done

- `npm run typecheck` (tsc -b) и `npm run lint` чистые; НИКАКИХ `any`
- README в `web/`: запуск за 3 команды
- Работает при пустой БД (пустые состояния экранов) и при недоступном API (баннер «нет связи»)
- i18n: переключатель uz/ru в шапке, обе локали полные
- Git: ветка `feat/web`, PR в main; коммиты осмысленные

## Чего НЕ делать

- НЕ выдумывать эндпоинты и поля — только те, что в /docs; чего-то не хватает → вопрос Шохруху
- НЕ встраивать live-видеопотоки (WebRTC/HLS) — только снапшоты, это осознанное решение
- НЕ делать редактор зон и настройки камер — v1.5
- НЕ тащить тяжёлые UI-киты (MUI/Antd) — Tailwind + свои компоненты
- НЕ хранить пароль; только токен

Начни с: каркас Vite+TS+Tailwind в `web/`, авторизация + layout с навигацией,
затем /live, затем /events. После каждого экрана — скриншот в PR.
