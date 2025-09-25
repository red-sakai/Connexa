create table if not exists public.event_admins (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  created_at timestamptz default now(),
  unique (event_id, email)
);

alter table public.event_admins enable row level security;

-- Allow public select (we gate sensitive reads in API; this helps simple checks)
do $$ begin
  create policy "event_admins_select_public"
  on public.event_admins for select
  to public
  using (true);
exception when duplicate_object then null; end $$;

-- Allow inserts from server; if you prefer client inserts, relax this:
do $$ begin
  create policy "event_admins_insert_public"
  on public.event_admins for insert
  to public
  with check (true);
exception when duplicate_object then null; end $$;

-- Optional delete policy (server uses service key anyway)
do $$ begin
  create policy "event_admins_delete_public"
  on public.event_admins for delete
  to public
  using (true);
exception when duplicate_object then null; end $$;
