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

Бэкенд: `make api` в корне репо (нужен `SECRET_KEY` в `.env`).
Логин — пользователи из БД (username + argon2, опционально 2FA);
первого админа создаёт `scripts/create_user.py`.

## Структура

```
src/
  app/         # композиция: providers (QueryClient, 401-мост), router (auth-гейт), layout
  features/    # feature-sliced: <domain>/{index.ts, api/, pages/, components/, model/}
  shared/
    ds/        # кит iqbola-DS: Button/Card/Input/Dialog/StatusBadge/charts (shadcn-based)
    ui/        # тонкий барель-адаптер над ds/ (старые prop-API) + icons (только отсюда)
    hooks/     # useAuthedMedia (медиа требует Bearer), useTheme (data-theme)
    i18n/      # ru канонический, uz: typeof ru
    lib/       # cn, POLL (точка замены на WS), eventLabel
```

Правила: кросс-фичевые импорты только через барели `@/features/<x>`;
иконки только из `@/shared/ui/icons` (hugeicons внутри, не импортировать
`@hugeicons/*` напрямую); цвета/радиусы/тени только токенами (никаких hex
в компонентах). Все 17 фич реализованы полностью — заглушек
`PlaceholderPage` не осталось.

## Команды

`npm run dev` · `build` · `typecheck` (tsc -b) · `lint` (oxlint)
