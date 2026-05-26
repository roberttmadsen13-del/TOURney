-- Migration 018: Allow any authenticated user to upsert push subscriptions.
-- "player upsert push_subscriptions" (from push_subscriptions_upsert_fix) scopes
-- INSERT to users who are in the players table. Tournament owners, admins, and
-- spectators are blocked → 403 on every page that loads pwa.js.
-- Push endpoints are device-keyed with no PII risk — any authed user can subscribe.

DROP POLICY IF EXISTS "player upsert push_subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "player update own subscription" ON push_subscriptions;

CREATE POLICY "auth insert push subscription" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth update push subscription" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
