-- Migration 012: Restrict player_accounts anon SELECT.
-- Bug: migration 005 left "anon read player_accounts" USING(true),
--   exposing email, plan, and billing_status to all anonymous visitors.
-- Fix: drop anon policy, replace with owner-scoped authenticated read.
BEGIN;
DROP POLICY IF EXISTS "anon read player_accounts" ON player_accounts;
CREATE POLICY "auth read own player_account" ON player_accounts
  FOR SELECT TO authenticated
  USING (email = auth.email());
COMMIT;
