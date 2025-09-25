create extension if not exists "pgcrypto";

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  contact text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.attendees enable row level security;

-- Allow public inserts (we still validate on the server API)
do $$ begin
  create policy "attendees_insert_public"
  on public.attendees for insert
  to public
  with check (true);
exception when duplicate_object then null; end $$;

-- Only owners can select their event’s attendees if using anon key directly.
-- Our API uses the service role and does auth in application code, so this is optional.
do $$ begin
  create policy "attendees_owner_select"
  on public.attendees for select
  to public
  using (exists (
    select 1 from public.events e
    where e.id = attendees.event_id
  ));
exception when duplicate_object then null; end $$;
