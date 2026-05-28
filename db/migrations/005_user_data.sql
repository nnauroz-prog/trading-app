-- 005_user_data.sql
-- Per-user key/value store backing cross-device sync of the client-side
-- localStorage stores (positions, journal, watchlist, alerts, dca, config,
-- profile, drawings). One row per (user, store_key); `data` mirrors the JSON
-- value of the corresponding localStorage entry. The sync layer upserts a row
-- on local change and pulls rows newer than its last sync on load.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) AFTER the
-- project's auth is enabled. Safe to re-run (idempotent guards throughout).

create table if not exists user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  store_key text not null,
  data jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key)
);

create index if not exists idx_user_data_updated_at on user_data (user_id, updated_at);

-- Row Level Security: a user may only ever read or write their own rows.
alter table user_data enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'user_data' and policyname = 'user_data_select_own') then
    create policy user_data_select_own on user_data for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_data' and policyname = 'user_data_insert_own') then
    create policy user_data_insert_own on user_data for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_data' and policyname = 'user_data_update_own') then
    create policy user_data_update_own on user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'user_data' and policyname = 'user_data_delete_own') then
    create policy user_data_delete_own on user_data for delete using (auth.uid() = user_id);
  end if;
end $$;

-- Keep updated_at fresh on every write so the client can pull only newer rows.
create or replace function set_user_data_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_user_data_updated_at on user_data;
create trigger trg_user_data_updated_at
  before update on user_data
  for each row execute function set_user_data_updated_at();
