-- Migration 014: Version-control existing FK players.tournament_id → tournaments.id.
-- FK already exists in live DB — drop-and-recreate is safe with IF NOT EXISTS guards.

BEGIN;

ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_tournament_id_fkey;

ALTER TABLE players
  ADD CONSTRAINT players_tournament_id_fkey
    FOREIGN KEY (tournament_id)
    REFERENCES tournaments(id)
    ON DELETE CASCADE;

COMMIT;
