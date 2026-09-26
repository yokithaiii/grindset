# grindset

Личный трекер ежедневного заработка: серии, рекорды, цели, аналитика.

## Запуск

1. Создайте проект на [supabase.com](https://supabase.com).
2. Примените миграцию `supabase/migrations/20260927000000_init.sql`:
   - либо вставьте её содержимое в **SQL Editor** и выполните;
   - либо `npx supabase link --project-ref <ref>` и `npx supabase db push`.
3. Для входа по почте в dev: **Authentication → URL Configuration** → `http://localhost:5173` в *Redirect URLs*.
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
2. `.env` (скопировать из `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TELEGRAM_BOT_USERNAME`, `BIND_IP`.
3. Сборка: `docker compose build`
4. Сертификат Let's Encrypt (certbot слушает порт 80 только на `BIND_IP`, сертификаты kloai не трогает;
   файлы кладутся в `ssl/crt.txt` и `ssl/key.txt`, контейнер запускается автоматически):
   ```bash
   sudo apt install -y certbot
   sudo bash scripts/issue-cert.sh you@example.com --dry-run   # тест
   sudo bash scripts/issue-cert.sh you@example.com             # настоящий
   ```
   Продление автоматическое (`certbot.timer`), проверка: `sudo certbot renew --cert-name grindset.kloai.ru --dry-run`.
   Обновление приложения: `docker compose up -d --build`.
5. Вход через Telegram — см. раздел ниже.

Ключи Supabase вшиваются при сборке, поэтому после их изменения нужен `--build`.
После замены сертификата достаточно `docker compose restart`.

## Вход через Telegram

- В Telegram Mini App вход автоматический: подписанные данные `initData` проверяются на сервере.
- В вебе — кнопка Telegram Login Widget.
- Проверку делает Supabase Edge Function `supabase/functions/telegram-auth`: токен бота хранится только в ней.

Настройка (один раз):

1. Примените миграцию `supabase/migrations/20260927010000_telegram_auth.sql` (SQL Editor).
2. **Сохраните свои данные.** Если вы уже входили по почте, свяжите этот аккаунт со своим Telegram ID
   **до первого входа через Telegram** (ID можно узнать у [@userinfobot](https://t.me/userinfobot)):
   ```sql
   insert into public.telegram_accounts (telegram_id, user_id)
   select 123456789, id from auth.users where email = 'you@example.com';
   ```
   Если уже вошли через Telegram и увидели пустой аккаунт — перепривяжите:
   ```sql
   update public.telegram_accounts
   set user_id = (select id from auth.users where email = 'you@example.com')
   where telegram_id = 123456789;
   ```
3. Секреты и деплой функции:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase secrets set TELEGRAM_BOT_TOKEN=123:ABC ALLOWED_TELEGRAM_IDS=123456789
   npm run deploy:auth
   ```
   `ALLOWED_TELEGRAM_IDS` — через запятую, кому разрешён вход. Без него войти сможет любой пользователь Telegram
   (получит свой пустой аккаунт; чужие данные закрыты RLS).
4. @BotFather → `/setdomain` → `grindset.kloai.ru` (нужно для кнопки входа в вебе).
5. `.env`: `VITE_TELEGRAM_BOT_USERNAME=имя_бота` (без @), затем `docker compose up -d --build`.

Провайдер Email в Supabase (Authentication → Providers) должен оставаться включённым: функция выдаёт
одноразовый токен входа через него, но писем не отправляет.

Локально (`npm run dev`) кнопка Telegram не работает — домен не совпадает, поэтому в dev-сборке под ней есть вход по почте.

## Команды

- `npm run dev` — dev-сервер
- `npm test` — юнит-тесты функций статистики (`src/lib/stats`)
- `npm run build` — проверка типов и сборка
- `npm run deploy:auth` — задеплоить функцию входа через Telegram
- `npm run gen:types` — перегенерировать `src/lib/database.types.ts` после `supabase link`
