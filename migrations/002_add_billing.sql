-- Migration 002: Add billing/subscription columns to tournaments
-- Run in Supabase SQL editor after 001_add_tournaments.sql

BEGIN;

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter', 'pro', 'club')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS carry_forward_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending_payment', 'active', 'suspended'));

-- Seed existing live tournaments as Club/active so Bova etc. keep all features
UPDATE tournaments
SET
  tier = 'club',
  stripe_status = 'active',
  carry_forward_enabled = true
WHERE status = 'active';

-- Index for subscription lookups (webhook needs this fast)
CREATE INDEX IF NOT EXISTS idx_tournaments_stripe_sub
  ON tournaments (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Index for status filter (tourney-init.js queries by slug + status)
CREATE INDEX IF NOT EXISTS idx_tournaments_slug_status
  ON tournaments (slug, status);

COMMIT;
