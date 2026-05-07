-- Migration 008: Security RLS hardening (audit 2026-05-06).
-- Fixes four critical/high findings from the security audit:
--   C-1: invitations anon-update had no email predicate (any anon could accept/decline any invitation)
--   C-2: invitations auth-manage was FOR ALL TO authenticated USING(true) (cross-tenant destruction)
--   C-3: player_accounts had no scoped UPDATE policy (any auth user could self-grant billing_status='comped')
--   H-5: players had no admin-update policy (tournament_admins members couldn't toggleAdmin)
--   H-6: scores had anon INSERT/UPDATE with no player match (any anon could overwrite any score)

BEGIN;

-- ── INVITATIONS ──────────────────────────────────────────────────────────────
-- Drop the dangerous migration-005 policies
DROP POLICY IF EXISTS "anon update own invitation" ON invitations;
DROP POLICY IF EXISTS "anon read invitations"       ON invitations;
DROP POLICY IF EXISTS "auth manage invitations"     ON invitations;

-- Invitee can only update their own row, and only to accepted/declined
DROP POLICY IF EXISTS "invitee update own invitation" ON invitations;
CREATE POLICY "invitee update own invitation" ON invitations
  FOR UPDATE TO authenticated
  USING (email = auth.email())
  WITH CHECK (email = auth.email() AND status = ANY (ARRAY['accepted','declined']));

-- Only owner or admin can read all invitations for a tournament
DROP POLICY IF EXISTS "auth read invitations" ON invitations;
CREATE POLICY "auth read invitations" ON invitations
  FOR SELECT TO authenticated
  USING (
    email = auth.email()
    OR auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (SELECT 1 FROM tournament_admins ta WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email())
  );

-- Only owner or admin can insert invitations
DROP POLICY IF EXISTS "admin insert invitations" ON invitations;
CREATE POLICY "admin insert invitations" ON invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (SELECT 1 FROM tournament_admins ta WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email())
  );

-- Only owner or admin can update invitations (admin-side edits)
DROP POLICY IF EXISTS "admin update invitations" ON invitations;
CREATE POLICY "admin update invitations" ON invitations
  FOR UPDATE TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (SELECT 1 FROM tournament_admins ta WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email())
  )
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (SELECT 1 FROM tournament_admins ta WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email())
  );

-- Only owner or admin can delete invitations
DROP POLICY IF EXISTS "admin delete invitations" ON invitations;
CREATE POLICY "admin delete invitations" ON invitations
  FOR DELETE TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = tournament_id)
    OR EXISTS (SELECT 1 FROM tournament_admins ta WHERE ta.tournament_id = invitations.tournament_id AND ta.email = auth.email())
  );

-- ── PLAYER_ACCOUNTS ──────────────────────────────────────────────────────────
-- Remove any permissive authenticated write policies; billing status written only via service_role
DROP POLICY IF EXISTS "auth manage player_accounts"  ON player_accounts;
DROP POLICY IF EXISTS "anon read player_accounts"    ON player_accounts;

-- Players can only read their own account row
DROP POLICY IF EXISTS "owner read own account" ON player_accounts;
CREATE POLICY "owner read own account" ON player_accounts
  FOR SELECT TO authenticated
  USING (email = auth.email());

-- ── PLAYERS ──────────────────────────────────────────────────────────────────
-- Tournament admins (not just owner) can update players in their tournament
DROP POLICY IF EXISTS "admin update players" ON players;
CREATE POLICY "admin update players" ON players
  FOR UPDATE TO authenticated
  USING  (tournament_id IN (SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()))
  WITH CHECK (tournament_id IN (SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()));

-- ── SCORES ───────────────────────────────────────────────────────────────────
-- Remove anon insert/update; replace with auth-scoped player-owns-score policies
DROP POLICY IF EXISTS "Anon insert scores scoped to valid tournament" ON scores;
DROP POLICY IF EXISTS "Anon update scores scoped to valid tournament" ON scores;

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

DROP POLICY IF EXISTS "player update own scores" ON scores;
CREATE POLICY "player update own scores" ON scores
  FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM players p WHERE p.id = scores.player_id AND p.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM players p WHERE p.id = scores.player_id AND p.email = auth.email()));

-- Admin full access to scores
DROP POLICY IF EXISTS "admin manage scores" ON scores;
CREATE POLICY "admin manage scores" ON scores
  FOR ALL TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()
    )
  );

COMMIT;
