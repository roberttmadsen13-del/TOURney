-- Migration 007: Replace hardcoded day1/day2/day3 with a proper rounds table.
-- Unblocks Architecture A+ (round naming flexibility) and the recap page (Sprint F5).
--
-- Strategy:
--   1. Create rounds table — ordinal-keyed, per-tournament.
--   2. Backfill from existing settings (round_day1, round_day2, ..., pars_day1, ..., round_formats).
--   3. Migrate scores.round (TEXT 'day1') → scores.round_id UUID FK while keeping the legacy column
--      until the application is fully cut over. The legacy column can be dropped in a later migration.
--   4. RLS: rounds inherits the same scope as settings (public read, owner-or-admin write).

BEGIN;

CREATE TABLE IF NOT EXISTS rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  ordinal       int  NOT NULL,                    -- 1, 2, 3, ... — display order
  legacy_key    text,                              -- 'day1' / 'day2' for migration compatibility
  name          text NOT NULL,                    -- 'Day 1' or 'Friday Stableford' or 'Round of 16'
  format        text NOT NULL DEFAULT 'stroke',   -- stroke | scramble | best_ball | shambles | nassau | skins | alt_shot
  state         text NOT NULL DEFAULT 'pending',  -- pending | open | closed | final
  pars          int[] DEFAULT NULL,                -- 18-element par array, or null to inherit course default
  course_id     uuid,                              -- optional course pointer (set when courses table exists)
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (tournament_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_rounds_tournament ON rounds (tournament_id);
CREATE INDEX IF NOT EXISTS idx_rounds_legacy_key ON rounds (tournament_id, legacy_key);

-- Backfill from existing settings.
DO $$
DECLARE
  t RECORD;
  i INT;
  legacy TEXT;
  state_val TEXT;
  pars_val TEXT;
  formats_val TEXT;
  format_for_round TEXT;
BEGIN
  FOR t IN SELECT id FROM tournaments LOOP
    -- Read round_formats JSON if present (e.g. {"day1":"stroke","day2":"scramble"})
    SELECT value INTO formats_val
      FROM settings
      WHERE tournament_id = t.id AND key = 'round_formats';

    FOR i IN 1..6 LOOP
      legacy := 'day' || i;

      SELECT value INTO state_val
        FROM settings
        WHERE tournament_id = t.id AND key = 'round_' || legacy;

      -- If no setting exists for this round number, stop adding rounds for this tournament.
      EXIT WHEN state_val IS NULL;

      SELECT value INTO pars_val
        FROM settings
        WHERE tournament_id = t.id AND key = 'pars_' || legacy;

      -- Pull format from the JSON map if present, else default to 'stroke'.
      format_for_round := COALESCE(
        (formats_val::jsonb ->> legacy),
        'stroke'
      );

      INSERT INTO rounds (tournament_id, ordinal, legacy_key, name, format, state, pars)
      VALUES (
        t.id,
        i,
        legacy,
        'Day ' || i,
        format_for_round,
        state_val,
        CASE WHEN pars_val IS NOT NULL
          THEN string_to_array(pars_val, ',')::int[]
          ELSE NULL
        END
      )
      ON CONFLICT (tournament_id, ordinal) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Add round_id column to scores. Keep legacy 'round' TEXT column in place for now —
-- the application will migrate to round_id incrementally. Drop legacy in migration 008+ once safe.
ALTER TABLE scores ADD COLUMN IF NOT EXISTS round_id uuid REFERENCES rounds(id) ON DELETE CASCADE;

UPDATE scores s
SET round_id = r.id
FROM rounds r
WHERE r.tournament_id = s.tournament_id
  AND r.legacy_key = s.round
  AND s.round_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_scores_round_id ON scores (round_id);

-- RLS: same shape as settings — public read, owner-or-admin write.
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read rounds"
  ON rounds FOR SELECT USING (true);

CREATE POLICY "owner or admin write rounds"
  ON rounds FOR ALL TO authenticated
  USING (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = rounds.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = rounds.tournament_id AND ta.email = auth.email()
    )
  )
  WITH CHECK (
    auth.email() = (SELECT owner_email FROM tournaments WHERE id = rounds.tournament_id)
    OR EXISTS (
      SELECT 1 FROM tournament_admins ta
      WHERE ta.tournament_id = rounds.tournament_id AND ta.email = auth.email()
    )
  );

COMMIT;
