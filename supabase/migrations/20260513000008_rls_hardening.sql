-- Migration 008: RLS hardening
-- 1. Lock down tournament_players (legacy table, no active code paths)
-- 2. Restrict settings pairing_% writes from anon → authenticated
--    (scorecard.html requires auth before pairing writes occur)

-- ── tournament_players ────────────────────────────────────────────
drop policy if exists "anon insert tournament_players"  on public.tournament_players;
drop policy if exists "anon read tournament_players"    on public.tournament_players;
drop policy if exists "auth manage tournament_players"  on public.tournament_players;

-- Owner/admin read only — no public write surface
create policy "tp_owner_admin_read" on public.tournament_players
  for select
  to authenticated
  using (
    tournament_id in (
      select id from public.tournaments where owner_email = auth.email()
      union
      select tournament_id from public.tournament_admins where email = auth.email()
    )
  );

create policy "tp_owner_admin_write" on public.tournament_players
  for all
  to authenticated
  using (
    tournament_id in (
      select id from public.tournaments where owner_email = auth.email()
      union
      select tournament_id from public.tournament_admins where email = auth.email()
    )
  )
  with check (
    tournament_id in (
      select id from public.tournaments where owner_email = auth.email()
      union
      select tournament_id from public.tournament_admins where email = auth.email()
    )
  );

-- ── settings pairing_% ───────────────────────────────────────────
drop policy if exists "anon insert pairing keys" on public.settings;
drop policy if exists "anon update pairing keys" on public.settings;

create policy "auth insert pairing keys" on public.settings
  for insert
  to authenticated
  with check (
    tournament_id in (select id from public.tournaments)
    and key like 'pairing_%'
  );

create policy "auth update pairing keys" on public.settings
  for update
  to authenticated
  using (
    tournament_id in (select id from public.tournaments)
    and key like 'pairing_%'
  )
  with check (
    tournament_id in (select id from public.tournaments)
    and key like 'pairing_%'
  );
