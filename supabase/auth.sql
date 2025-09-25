-- Extensions needed
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Credentials table (separate from Supabase auth)
create table if not exists public.user_credentials (
  id uuid primary key default gen_random_uuid(),
  email citext unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- RLS hardening (function will read via SECURITY DEFINER)
alter table public.user_credentials enable row level security;

-- Ensure role column with RBAC (user/admin)
alter table public.user_credentials
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'user_credentials_role_check'
      and n.nspname = 'public'
      and t.relname = 'user_credentials'
  ) then
    alter table public.user_credentials
      add constraint user_credentials_role_check check (role in ('user','admin'));
  end if;
end
$$;

-- Ensure old versions are removed so the new ones take effect
drop function if exists public.register_user(text, text, text);
drop function if exists public.verify_login(text, text);

-- Registration function
create or replace function public.register_user(p_email text, p_password text, p_role text default 'user')
returns table (user_id uuid, email text, role text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_role text := coalesce(p_role, 'user');
begin
  if v_role not in ('user','admin') then
    raise exception 'invalid role';
  end if;

  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf'));

  insert into public.user_credentials (email, password_hash, role)
  select p_email::citext, v_hash, v_role
  on conflict on constraint user_credentials_email_key do nothing;

  return query
  select s.user_id, s.email, s.role
  from (
    select uc.id as user_id, uc.email::text as email, uc.role
    from public.user_credentials uc
    where uc.email = p_email::citext
    limit 1
  ) s;
end;
$$;

-- Login verification
create or replace function public.verify_login(p_email text, p_password text)
returns table (user_id uuid, email text, role text)
language sql
security definer
set search_path = public, extensions
as $$
  select s.user_id, s.email, s.role
  from (
    select uc.id as user_id, uc.email::text as email, uc.role
    from public.user_credentials uc
    where uc.email = p_email::citext
      and extensions.crypt(p_password, uc.password_hash) = uc.password_hash
    limit 1
  ) s;
$$;

-- Allow calling from client
grant execute on function public.verify_login(text, text) to anon, authenticated;
grant execute on function public.register_user(text, text, text) to anon, authenticated;

-- Events table for CRUD demo
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_at timestamptz not null,
  owner_id uuid not null references public.user_credentials(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_owner_id on public.events(owner_id);
create index if not exists idx_events_created_at on public.events(created_at);

-- Keep RLS simple for API-enforced auth (custom JWT). You can enable and add policies later.
alter table public.events disable row level security;
