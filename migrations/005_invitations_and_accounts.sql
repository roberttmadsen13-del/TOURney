-- Migration 005: Player invitations + player accounts

-- ── INVITATIONS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  email         text NOT NULL,
  message       text,
  status        text NOT NULL DEFAULT 'pending', -- pending / accepted / declined
  invited_by    text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (tournament_id, email)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read invitations"
  ON invitations FOR SELECT TO anon USING (true);

CREATE POLICY "anon update own invitation"
  ON invitations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "auth manage invitations"
  ON invitations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── PLAYER ACCOUNTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text UNIQUE NOT NULL,
  plan                text NOT NULL DEFAULT 'free',         -- free / player / pro
  billing_status      text NOT NULL DEFAULT 'inactive',     -- active / inactive / cancelled / trial
  billing_expires_at  timestamptz,
  billing_ref         text,                                 -- external payment ref (processor-agnostic)
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE player_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read player_accounts"
  ON player_accounts FOR SELECT TO anon USING (true);

CREATE POLICY "auth manage player_accounts"
  ON player_accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
