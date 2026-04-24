-- Migration 001: Add multi-tenant tournaments layer
-- Run in Supabase SQL editor. Execute in one transaction.
-- Safe to run: all changes additive until final NOT NULL enforcement.

BEGIN;

-- ── Anchor table ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  short_name  TEXT,
  logo_url    TEXT,
  owner_email TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Scoped admin membership (replaces players.is_admin global flag) ───────────
CREATE TABLE IF NOT EXISTS tournament_admins (
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, player_id)
);

-- ── Add tournament_id FK columns (nullable for safe backfill) ─────────────────
ALTER TABLE players  ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id);
ALTER TABLE scores   ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id);

-- ── Backfill: seed Bova 2026 as first tenant ──────────────────────────────────
DO $$
DECLARE
  bova_id UUID;
  bova_logo TEXT;
BEGIN
  -- Get existing logo from settings if set
  SELECT value INTO bova_logo FROM settings WHERE key = 'logo_url' LIMIT 1;

  INSERT INTO tournaments (slug, name, short_name, logo_url, owner_email)
  VALUES (
    'bova-2026',
    COALESCE((SELECT value FROM settings WHERE key = 'tournament_name'), 'Bova Invitational 2026'),
    COALESCE((SELECT value FROM settings WHERE key = 'short_name'), 'BOVA'),
    bova_logo,
    'robert.t.madsen13@gmail.com'
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO bova_id;

  -- If already inserted via conflict, look it up
  IF bova_id IS NULL THEN
    SELECT id INTO bova_id FROM tournaments WHERE slug = 'bova-2026';
  END IF;

  -- Backfill all existing rows
  UPDATE players  SET tournament_id = bova_id WHERE tournament_id IS NULL;
  UPDATE scores   SET tournament_id = bova_id WHERE tournament_id IS NULL;
  UPDATE settings SET tournament_id = bova_id WHERE tournament_id IS NULL;

  -- Seed tournament_admins from existing is_admin = true players
  INSERT INTO tournament_admins (tournament_id, player_id)
  SELECT bova_id, id
  FROM players
  WHERE is_admin = true
    AND tournament_id = bova_id
  ON CONFLICT DO NOTHING;
END $$;

-- ── Enforce NOT NULL after backfill ───────────────────────────────────────────
ALTER TABLE players  ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE scores   ALTER COLUMN tournament_id SET NOT NULL;
ALTER TABLE settings ALTER COLUMN tournament_id SET NOT NULL;

-- ── Fix settings PK: global key → (tournament_id, key) ───────────────────────
-- settings.key was TEXT PRIMARY KEY — change to composite
ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (tournament_id, key);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_tournament  ON players  (tournament_id);
CREATE INDEX IF NOT EXISTS idx_scores_tournament   ON scores   (tournament_id);
CREATE INDEX IF NOT EXISTS idx_scores_player       ON scores   (player_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE tournaments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_admins ENABLE ROW LEVEL SECURITY;

-- Tournaments: public read, only owner can insert/update
CREATE POLICY "public read tournaments"
  ON tournaments FOR SELECT USING (true);

CREATE POLICY "owner manage tournament"
  ON tournaments FOR ALL USING (
    auth.email() = owner_email
  );

-- Tournament admins: public read (scoreboards need to show admin actions)
CREATE POLICY "public read tournament_admins"
  ON tournament_admins FOR SELECT USING (true);

-- Players/scores/settings: existing permissive policies stay in place.
-- Tighten in migration 002 once all query-side filtering is confirmed working.

COMMIT;
