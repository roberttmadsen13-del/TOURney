-- Migration 006: Eliminate dual admin source-of-truth.
-- AFTER this migration, tournament_admins is the ONLY admin model.
-- Apply ONLY after the application code stops reading/writing players.is_admin
-- (admin.html, create.html, course.html, champions.html, directory.html).
--
-- DO NOT APPLY THIS MIGRATION before:
--   1. All client code switched to tournament_admins lookups for admin gating.
--   2. Verification: SELECT COUNT(*) FROM players WHERE is_admin = true matches
--      COUNT(*) FROM tournament_admins (i.e., no admins lost in the cutover).
--
-- This is also the migration that closes Security review finding #4 (dual source-of-truth).

BEGIN;

-- Sanity check: every is_admin=true player must already exist in tournament_admins.
-- If this returns rows, we'd lose admin access. ABORT and reconcile first.
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM players p
  WHERE p.is_admin = true
    AND NOT EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = p.tournament_id
        AND ta.email = p.email
    );

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Refusing to drop is_admin: % players have is_admin=true but no tournament_admins row. Reconcile first.', orphan_count;
  END IF;
END $$;

-- Reconciliation pass — defensive: ensure every is_admin player has a tournament_admins row.
INSERT INTO tournament_admins (tournament_id, email)
SELECT p.tournament_id, p.email
FROM players p
WHERE p.is_admin = true
ON CONFLICT (tournament_id, email) DO NOTHING;

-- Drop the column. All client code MUST already be migrated.
ALTER TABLE players DROP COLUMN IF EXISTS is_admin;

COMMIT;
