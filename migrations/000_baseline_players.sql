-- Baseline snapshot of the players table as it exists in production.
-- Applied directly to Supabase before migration versioning began.
-- Safe to run on a fresh DB (IF NOT EXISTS guards) or replay on existing schema.

CREATE TABLE IF NOT EXISTS public.players (
  id             uuid          NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz            DEFAULT now(),
  first_name     text          NOT NULL,
  last_name      text          NOT NULL,
  email          text          NOT NULL,
  handicap       text          NOT NULL,
  available_dates text[]                DEFAULT '{}'::text[],
  why_me         text,
  trash_talk     text,
  hat            boolean                DEFAULT false,
  note           text,
  phone_number   text,
  has_account    boolean                DEFAULT false,
  tournament_id  uuid          NOT NULL,
  last_trash_talk_at timestamptz,
  PRIMARY KEY (id)
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Anon read: any player row belonging to a valid tournament is publicly readable.
DROP POLICY IF EXISTS "Anon read players scoped to valid tournament" ON public.players;
CREATE POLICY "Anon read players scoped to valid tournament"
  ON public.players FOR SELECT
  USING (tournament_id IN (SELECT id FROM public.tournaments));

-- Anon insert: anyone can register as a player for a valid tournament.
DROP POLICY IF EXISTS "Anon insert players scoped to valid tournament" ON public.players;
CREATE POLICY "Anon insert players scoped to valid tournament"
  ON public.players FOR INSERT
  WITH CHECK (tournament_id IN (SELECT id FROM public.tournaments));

-- Auth update own: authenticated users can update their own player record.
DROP POLICY IF EXISTS "Auth update own player record" ON public.players;
CREATE POLICY "Auth update own player record"
  ON public.players FOR UPDATE
  USING (
    tournament_id IN (SELECT id FROM public.tournaments)
    AND email = auth.email()
  )
  WITH CHECK (
    tournament_id IN (SELECT id FROM public.tournaments)
    AND email = auth.email()
  );

-- Tournament owner update: owner can update any player in their tournament.
DROP POLICY IF EXISTS "Tournament owner update any player" ON public.players;
CREATE POLICY "Tournament owner update any player"
  ON public.players FOR UPDATE
  USING (
    tournament_id IN (
      SELECT id FROM public.tournaments WHERE owner_email = auth.email()
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT id FROM public.tournaments WHERE owner_email = auth.email()
    )
  );

-- Tournament owner delete: owner can delete any player in their tournament.
DROP POLICY IF EXISTS "Tournament owner delete players" ON public.players;
CREATE POLICY "Tournament owner delete players"
  ON public.players FOR DELETE
  USING (
    tournament_id IN (
      SELECT id FROM public.tournaments WHERE owner_email = auth.email()
    )
  );

-- Admin update: tournament admins can update any player in their tournament.
DROP POLICY IF EXISTS "admin update players" ON public.players;
CREATE POLICY "admin update players"
  ON public.players FOR UPDATE
  USING (
    tournament_id IN (
      SELECT tournament_id FROM public.tournament_admins WHERE email = auth.email()
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT tournament_id FROM public.tournament_admins WHERE email = auth.email()
    )
  );
