-- Migration 007: rounds table
-- Normalizes round_day{n} + round_formats settings into a proper table.
-- Code still reads from settings for now; this table is additive (observability first).

create table if not exists public.rounds (
  id            uuid        primary key default gen_random_uuid(),
  tournament_id uuid        not null references public.tournaments(id) on delete cascade,
  day_number    int         not null check (day_number between 1 and 5),
  status        text        not null default 'pending' check (status in ('pending','open','closed')),
  format_front  text,
  format_back   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tournament_id, day_number)
);

alter table public.rounds enable row level security;

create policy "rounds_public_read" on public.rounds
  for select using (true);

-- Backfill from existing settings rows
insert into public.rounds (tournament_id, day_number, status, format_front, format_back)
select
  s.tournament_id,
  regexp_replace(s.key, 'round_day', '')::int               as day_number,
  s.value                                                    as status,
  (rf.formats->('day' || regexp_replace(s.key, 'round_day', ''))->>'front') as format_front,
  (rf.formats->('day' || regexp_replace(s.key, 'round_day', ''))->>'back')  as format_back
from settings s
left join lateral (
  select value::jsonb as formats
  from settings
  where tournament_id = s.tournament_id and key = 'round_formats'
  limit 1
) rf on true
where s.key ~ '^round_day[0-9]+$'
on conflict (tournament_id, day_number) do nothing;
