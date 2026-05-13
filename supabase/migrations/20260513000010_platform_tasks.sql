create table if not exists public.platform_tasks (
  id          uuid        primary key default gen_random_uuid(),
  source      text        not null,
  queue       text        not null,
  title       text        not null,
  body        text,
  cmd         text,
  tag         text,
  status      text        not null default 'open',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.platform_tasks enable row level security;

create policy "platform_owner_only" on public.platform_tasks
  for all to authenticated
  using (auth.email() = current_setting('app.platform_email', true))
  with check (auth.email() = current_setting('app.platform_email', true));

create table if not exists public.qa_runs (
  id         uuid        primary key default gen_random_uuid(),
  slug       text        not null,
  passed     int         not null,
  total      int         not null,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.qa_runs enable row level security;

create policy "platform_owner_qa" on public.qa_runs
  for all to authenticated
  using (auth.email() = current_setting('app.platform_email', true))
  with check (auth.email() = current_setting('app.platform_email', true));
