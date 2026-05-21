-- Migration 015: Allow authenticated players to upsert their own push subscription.
-- Bug #8: 403 on POST /rest/v1/push_subscriptions — no INSERT policy existed.

BEGIN;

DROP POLICY IF EXISTS "player upsert push_subscriptions" ON push_subscriptions;
CREATE POLICY "player upsert push_subscriptions" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    tournament_id IN (
      SELECT tournament_id FROM players WHERE email = auth.email()
    )
  );

COMMIT;
