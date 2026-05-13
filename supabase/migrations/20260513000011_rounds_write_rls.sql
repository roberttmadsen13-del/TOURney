-- Migration 011: rounds write RLS
-- Allows tournament owner + admins to insert/update/delete their own rounds rows.
-- Read-side already covered by rounds_public_read (migration 007).

create policy "rounds_owner_admin_write" on public.rounds
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
