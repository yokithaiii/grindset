-- grindset: sign in with Telegram
-- Maps a Telegram user to a Supabase auth user. Only the telegram-auth edge function
-- (service role) reads and writes it: RLS is on and there are no policies for clients.

create table public.telegram_accounts (
  telegram_id bigint primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.telegram_accounts enable row level security;

-- To keep the data of an existing (email) account, link it BEFORE the first Telegram login:
--   insert into public.telegram_accounts (telegram_id, user_id)
--   select <your telegram id>, id from auth.users where email = 'you@example.com';
