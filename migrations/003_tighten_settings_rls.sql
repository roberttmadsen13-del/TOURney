-- Migration 003: Scope settings writes to tournament owner or admin
-- Previously: any authenticated user could write ANY tournament's settings.
-- After: only the tournament owner (by email) or a tournament_admins member can write.

BEGIN;

-- Drop all existing write policies on settings (names from prior tighten_settings_rls migration).
-- If names differ, check pg_policies and update accordingly.
DROP POLICY IF EXISTS "authenticated can insert settings"  ON settings;
DROP POLICY IF EXISTS "authenticated can update settings"  ON settings;
DROP POLICY IF EXISTS "authenticated can delete settings"  ON settings;
DROP POLICY IF EXISTS "authenticated write settings"       ON settings;
DROP POLICY IF EXISTS "authenticated full write settings"  ON settings;
DROP POLICY IF EXISTS "admin write settings"               ON settings;

-- Scoped write: owner by email OR tournament admin by uid
CREATE POLICY "owner or admin write settings"
  ON settings
  FOR ALL
  TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = settings.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = settings.tournament_id
        AND ta.player_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = settings.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = settings.tournament_id
        AND ta.player_id = auth.uid()
    )
  );

-- Anon SELECT stays as-is (brand colors, tournament info needed on every page load).

COMMIT;
