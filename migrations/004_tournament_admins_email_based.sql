-- Migration 004: Switch tournament_admins to email-based identity
-- Allows adding admins by email without requiring player registration.

-- Drop old PK (player_id is part of it)
ALTER TABLE tournament_admins DROP CONSTRAINT IF EXISTS tournament_admins_pkey;

-- Add email column
ALTER TABLE tournament_admins ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill email from players
UPDATE tournament_admins ta
SET email = p.email
FROM players p
WHERE ta.player_id = p.id AND ta.email IS NULL;

-- Delete orphaned rows with no email
DELETE FROM tournament_admins WHERE email IS NULL;

-- Make player_id optional, email required
ALTER TABLE tournament_admins ALTER COLUMN player_id DROP NOT NULL;
ALTER TABLE tournament_admins ALTER COLUMN email SET NOT NULL;
ALTER TABLE tournament_admins ADD PRIMARY KEY (tournament_id, email);

-- Update settings write policy to match by email
DROP POLICY IF EXISTS "owner or admin write settings" ON settings;
CREATE POLICY "owner or admin write settings"
  ON settings FOR ALL TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = settings.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = settings.tournament_id AND ta.email = auth.email()
    )
  )
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = settings.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = settings.tournament_id AND ta.email = auth.email()
    )
  );
