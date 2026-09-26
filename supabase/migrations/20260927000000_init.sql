-- grindset: initial schema
-- Tables: sources, entries, goals, settings, streak_freezes
-- Every row belongs to auth.users via user_id and is protected by RLS.

-- ---------------------------------------------------------------------------
-- settings (one row per user)
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
  freezes_per_month integer not null default 2 check (freezes_per_month between 0 and 31),
  amount_mode text not null default 'net' check (amount_mode in ('net', 'gross'))
);

-- ---------------------------------------------------------------------------
-- sources
-- ---------------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  type text not null default 'active' check (type in ('active', 'passive')),
  color text not null default '#16a34a' check (color ~ '^#[0-9a-fA-F]{6}$'),
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index sources_user_id_idx on public.sources (user_id);

-- ---------------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------------
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- restrict: sources with entries are archived, never deleted
  source_id uuid not null references public.sources (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  date date not null default current_date,
  minutes_spent integer check (minutes_spent is null or minutes_spent > 0),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index entries_user_id_date_idx on public.entries (user_id, date desc);
create index entries_source_id_idx on public.entries (source_id);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('monthly', 'savings')),
  title text not null check (char_length(trim(title)) between 1 and 80),
  target_amount numeric(12, 2) not null check (target_amount > 0),
  month date,
  created_at timestamptz not null default now(),
  constraint goals_month_matches_kind check (
    (kind = 'monthly' and month is not null and extract(day from month) = 1)
    or (kind = 'savings' and month is null)
  )
);

create index goals_user_id_idx on public.goals (user_id, month);
-- at most one monthly goal per month
create unique index goals_user_monthly_unique on public.goals (user_id, month) where kind = 'monthly';

-- ---------------------------------------------------------------------------
-- streak_freezes
-- ---------------------------------------------------------------------------
create table public.streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  unique (user_id, date)
);

create index streak_freezes_user_id_date_idx on public.streak_freezes (user_id, date);

-- Enforce freezes_per_month on the server as well (the UI checks it first).
create or replace function public.check_freeze_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  lim integer;
  used integer;
begin
  select coalesce(
    (select s.freezes_per_month from public.settings s where s.user_id = new.user_id),
    2
  ) into lim;

  select count(*) into used
  from public.streak_freezes f
  where f.user_id = new.user_id
    and date_trunc('month', f.date) = date_trunc('month', new.date)
    and f.id <> new.id;

  if used >= lim then
    raise exception 'Лимит заморозок на этот месяц исчерпан (%)', lim
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger streak_freezes_limit
  before insert or update on public.streak_freezes
  for each row execute function public.check_freeze_limit();

-- ---------------------------------------------------------------------------
-- First-login bootstrap: settings row + 3 default sources. Idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.ensure_user_setup()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  created boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.settings (user_id) values (uid)
  on conflict (user_id) do nothing;
  created := found;

  if created and not exists (select 1 from public.sources where user_id = uid) then
    insert into public.sources (user_id, name, type, color) values
      (uid, 'Основная работа', 'active', '#16a34a'),
      (uid, 'Подработка', 'active', '#2563eb'),
      (uid, 'Пассивный доход', 'passive', '#d97706');
  end if;
end;
$$;

grant execute on function public.ensure_user_setup() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.settings enable row level security;
alter table public.sources enable row level security;
alter table public.entries enable row level security;
alter table public.goals enable row level security;
alter table public.streak_freezes enable row level security;

-- settings
create policy "settings_select_own" on public.settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings_insert_own" on public.settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings_update_own" on public.settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "settings_delete_own" on public.settings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- sources
create policy "sources_select_own" on public.sources
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "sources_insert_own" on public.sources
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "sources_update_own" on public.sources
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "sources_delete_own" on public.sources
  for delete to authenticated using ((select auth.uid()) = user_id);

-- entries: additionally the referenced source must belong to the same user
create policy "entries_select_own" on public.entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "entries_insert_own" on public.entries
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sources s where s.id = source_id and s.user_id = (select auth.uid()))
  );
create policy "entries_update_own" on public.entries
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.sources s where s.id = source_id and s.user_id = (select auth.uid()))
  );
create policy "entries_delete_own" on public.entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- goals
create policy "goals_select_own" on public.goals
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "goals_insert_own" on public.goals
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "goals_update_own" on public.goals
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "goals_delete_own" on public.goals
  for delete to authenticated using ((select auth.uid()) = user_id);

-- streak_freezes
create policy "streak_freezes_select_own" on public.streak_freezes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "streak_freezes_insert_own" on public.streak_freezes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "streak_freezes_update_own" on public.streak_freezes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "streak_freezes_delete_own" on public.streak_freezes
  for delete to authenticated using ((select auth.uid()) = user_id);
