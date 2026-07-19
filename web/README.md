# Pragmata AI — web dashboard

Скаффолд архитектуры фронта. Дизайн-система — по скиллам `iqbola-design`
(style-system-builder, variable-tokenizer, component-builder): токены в
`src/index.css`, светлая + тёмная тема (обязательна), 4pt-сетка, радиусы
button/input 12 / card 16 / modal 24 / pill, тени S/M/L, иконки 16/20/24/32.

## Запуск

```bash
npm install
echo 'VITE_API_URL=http://127.0.0.1:8088' > .env.local   # опционально, это дефолт
npm run dev        # :5175
```

Бэкенд: `make api` в корне репо (нужны `SECRET_KEY`/`ADMIN_PASSWORD` в `.env`).
Пароль логина = `ADMIN_PASSWORD`.

## Структура

```
src/
  app/         # композиция: providers (QueryClient, 401-мост), router (auth-гейт), layout
  features/    # feature-sliced: <domain>/{index.ts, api/, pages/, components/, model/}
  shared/
    api/       # client.ts (fetch + Bearer + 401), types.ts (ручные, сверять с openapi.json)
    ui/        # примитивы DS: button/input/card/badge/modal + icons (только отсюда)
    hooks/     # useAuthedMedia (медиа требует Bearer), useTheme (data-theme)
    i18n/      # ru канонический, uz: typeof ru
    lib/       # cn, POLL (точка замены на WS), eventLabel
```

Правила: кросс-фичевые импорты только через барели `@/features/<x>`;
иконки только из `@/shared/ui/icons`; цвета/радиусы/тени только токенами
(никаких hex в компонентах). Реализована фича `auth` (эталон), остальные —
заглушки `PlaceholderPage`.

## Команды

`npm run dev` · `build` · `typecheck` (tsc -b) · `lint` (oxlint)
