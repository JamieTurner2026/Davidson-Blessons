-- Davidson Blessons: one-time database setup for sign-in (name tiles + password) and progress sync.
-- Paste into Supabase > SQL Editor > New query > Run. Safe to run more than once.

create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now(),
  constraint progress_state_is_object check (jsonb_typeof(state) = 'object'),
  constraint progress_state_size check (octet_length(state::text) <= 500000)
);

-- The server stamps updated_at on every write; the browser can't set it.
create or replace function public.set_progress_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at
  before insert or update on public.progress
  for each row execute function public.set_progress_updated_at();

-- Each person can only see and change their own row. Signed-out visitors get nothing.
alter table public.progress enable row level security;

revoke all on public.progress from anon;
grant select, insert, update, delete on public.progress to authenticated;

drop policy if exists "progress_select_own" on public.progress;
drop policy if exists "progress_insert_own" on public.progress;
drop policy if exists "progress_update_own" on public.progress;
drop policy if exists "progress_delete_own" on public.progress;

create policy "progress_select_own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress_insert_own" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress_update_own" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress_delete_own" on public.progress
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Called daily by /api/keepalive so a free project doesn't pause after 7 idle days.
create or replace function public.ping()
returns boolean
language sql
stable
set search_path = ''
as $$ select true; $$;

grant execute on function public.ping() to anon, authenticated;

-- The member list behind the "tap your name" sign-in screen. It holds only a display name and the
-- placeholder sign-in address (never progress). Anyone can read it, which is how the name tiles
-- work; each member can only add, change or remove their own entry.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  username_key text not null unique,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select on public.profiles to anon;
grant select, insert, update, delete on public.profiles to authenticated;

drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);
