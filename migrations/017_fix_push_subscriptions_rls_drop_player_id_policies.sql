-- Migration 017: Fix push_subscriptions 403s — drop player_id-based INSERT policy.
--
-- push_subscriptions_upsert_fix added "player upsert push_subscriptions" (scoped by
-- tournament_id + player email) but forgot to DROP the old "player insert own
-- subscription" (scoped by player_id). Both INSERT policies must pass (AND logic).
-- pwa.js upsert sends no player_id → player_id is NULL → old policy fails → 403.
--
-- Also replaces the player_id-based UPDATE policy with the same tournament+email
-- check so the upsert ON CONFLICT UPDATE path doesn't also 403.

DROP POLICY IF EXISTS "player insert own subscription" ON push_subscriptions;

DROP POLICY IF EXISTS "player update own subscription" ON push_subscriptions;

CREATE POLICY "player update own subscription" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (
    tournament_id IN (
      SELECT players.tournament_id FROM players WHERE players.email = auth.email()
    )
  )
  WITH CHECK (
    tournament_id IN (
      SELECT players.tournament_id FROM players WHERE players.email = auth.email()
    )
  );
