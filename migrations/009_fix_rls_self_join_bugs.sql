-- Migration 009: Fix two self-join bugs in RLS policies (security audit follow-up).
--
-- Bug 1: admin insert invitations — ta.tournament_id = ta.tournament_id was always true.
--   Impact: any admin of any tournament could INSERT invitations into any other tournament.
--
-- Bug 2: player insert own scores — scores.tournament_id not matched against p.tournament_id.
--   Impact: player could file a score row under a foreign tournament_id using their own player_id.

-- Fix 1
DROP POLICY IF EXISTS "admin insert invitations" ON invitations;
CREATE POLICY "admin insert invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = invitations.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = invitations.tournament_id
        AND ta.email = auth.email()
    )
  );

-- Fix 2
DROP POLICY IF EXISTS "player insert own scores" ON scores;
CREATE POLICY "player insert own scores" ON scores
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = scores.player_id
        AND p.email = auth.email()
        AND p.tournament_id = scores.tournament_id
    )
  );
