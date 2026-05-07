-- Migration 010: Tighten push_subscriptions RLS + restrict tournament_admins to authenticated reads.
--
-- push_subscriptions: old policies used auth.role()='authenticated' with no row scoping —
--   any auth user could read all subscription endpoints or delete others' subs.
--   Fix: scope to own player_id (via players.email = auth.email()) + admin read access.
--
-- tournament_admins: public read USING(true) exposed admin email roster to anon clients.
--   Fix: require authenticated role.

-- ── PUSH_SUBSCRIPTIONS ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "auth insert subscription"  ON push_subscriptions;
DROP POLICY IF EXISTS "auth read subscription"    ON push_subscriptions;
DROP POLICY IF EXISTS "auth update subscription"  ON push_subscriptions;
DROP POLICY IF EXISTS "auth delete subscription"  ON push_subscriptions;

CREATE POLICY "player insert own subscription" ON push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = push_subscriptions.player_id
        AND p.email = auth.email()
    )
  );

CREATE POLICY "player read own subscription" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = push_subscriptions.player_id
        AND p.email = auth.email()
    )
    OR tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()
    )
  );

CREATE POLICY "player update own subscription" ON push_subscriptions
  FOR UPDATE TO authenticated
  USING  (EXISTS (SELECT 1 FROM players p WHERE p.id = push_subscriptions.player_id AND p.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM players p WHERE p.id = push_subscriptions.player_id AND p.email = auth.email()));

CREATE POLICY "player delete own subscription" ON push_subscriptions
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM players p WHERE p.id = push_subscriptions.player_id AND p.email = auth.email()));

-- ── TOURNAMENT_ADMINS ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "public read tournament_admins" ON tournament_admins;

CREATE POLICY "auth read tournament_admins" ON tournament_admins
  FOR SELECT TO authenticated
  USING (true);
