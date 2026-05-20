-- Originally applied as 006 alongside 006_drop_is_admin. Renamed to 006b for ordering clarity.
-- Migration 006b: Allow players to join multiple tournaments
-- Problem: players.email had a global UNIQUE constraint, so one person
--          could only register once across ALL tournaments.
-- Fix: drop global email uniqueness, enforce (email, tournament_id) uniqueness
--      so the same person can have a row per tournament.
-- Also backfills any players with NULL tournament_id to the bova-2026 tenant.
--
-- Safe to run on live DB — all ops are additive or constraint replacements.

BEGIN;

-- ── Backfill any orphaned rows (tournament_id IS NULL) ────────────────────────
DO $$
DECLARE bova_id UUID;
BEGIN
  SELECT id INTO bova_id FROM tournaments WHERE slug = 'bova-2026';
  IF bova_id IS NOT NULL THEN
    UPDATE players SET tournament_id = bova_id WHERE tournament_id IS NULL;
    UPDATE scores  SET tournament_id = bova_id WHERE tournament_id IS NULL;
  END IF;
END $$;

-- ── Drop old global email uniqueness (if it exists) ───────────────────────────
-- Constraint may be named differently depending on how the table was created;
-- we try both common names and also drop any single-column email unique index.
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_email_key;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_email_unique;
DROP INDEX IF EXISTS players_email_idx;

-- ── Add scoped uniqueness: one row per (email, tournament) ────────────────────
ALTER TABLE players
  ADD CONSTRAINT players_email_tournament_key
  UNIQUE (email, tournament_id);

-- ── Index for fast email+tournament lookups (login, profile matching) ─────────
CREATE INDEX IF NOT EXISTS idx_players_email_tournament
  ON players (email, tournament_id);

COMMIT;
