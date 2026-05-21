-- Migration 013: Lock invitations anon read
-- invitations had SELECT USING(true) from migration 005 — any anon can enumerate all invited emails.
-- Also drops anon UPDATE USING(true) which allowed anyone to change any invitation status.
-- push_subscriptions already locked by migration 010.
-- NOTE: Invite code check on login.html must happen post-authentication (auth.email() gate).
--       If pre-auth invite check is needed, expose a single-row RPC instead.

-- ── INVITATIONS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon read invitations"       ON invitations;
DROP POLICY IF EXISTS "anon update own invitation"  ON invitations;

-- Authenticated users can read their own invitation
CREATE POLICY "auth read own invitation" ON invitations
  FOR SELECT TO authenticated
  USING (email = auth.email());

-- Tournament owners and admins can read all invitations for their tournament
CREATE POLICY "admin read tournament invitations" ON invitations
  FOR SELECT TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()
    )
  );
