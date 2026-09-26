# grindset

Личный трекер ежедневного заработка: серии, рекорды, цели, аналитика.

## Запуск

1. Создайте проект на [supabase.com](https://supabase.com).
2. Примените миграцию `supabase/migrations/20260927000000_init.sql`:
   - либо вставьте её содержимое в **SQL Editor** и выполните;
   - либо `npx supabase link --project-ref <ref>` и `npx supabase db push`.
3. В Supabase: **Authentication → URL Configuration** → добавьте `http://localhost:5173` в *Site URL* / *Redirect URLs* (для magic link).
4. Скопируйте `.env.example` в `.env.local` и заполните значения из **Project Settings → API**:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. `npm install` и `npm run dev`. После изменения `.env.local` dev-сервер нужно перезапустить.

При первом входе автоматически создаются настройки и три источника по умолчанию.

## Деплой (https://grindset.kloai.ru)

Проект полностью самостоятельный: один контейнер, внутри nginx со статикой и HTTPS. Данные — в Supabase.

Порты 80/443 на `217.114.0.208` заняты nginx kloai, поэтому grindset слушает **другой IP сервера**
(посмотреть адреса: `ip -4 addr`).

1. DNS: A-запись `grindset.kloai.ru` → этот второй IP.
2. Сертификат: положить `ssl/crt.txt` (сертификат + цепочка) и `ssl/key.txt` (ключ) в корень проекта.
3. `.env` (скопировать из `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `BIND_IP`.
4. Запуск и обновление:
   ```bash
   docker compose up -d --build
   ```
5. Supabase → Authentication → URL Configuration: `https://grindset.kloai.ru` в Site URL и Redirect URLs —
   иначе ссылка из письма не вернёт в приложение.

Ключи Supabase вшиваются при сборке, поэтому после их изменения нужен `--build`.
После замены сертификата достаточно `docker compose restart`.

## Команды

- `npm run dev` — dev-сервер
- `npm test` — юнит-тесты функций статистики (`src/lib/stats`)
- `npm run build` — проверка типов и сборка
- `npm run gen:types` — перегенерировать `src/lib/database.types.ts` после `supabase link`
