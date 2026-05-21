-- Migration 013: Tighten RLS on invitations + push_subscriptions.
-- invitations: anon SELECT was USING(true) — restrict to authenticated only.
-- push_subscriptions: anon SELECT was USING(true) — restrict to owner-or-admin.

BEGIN;

-- invitations: authenticated read only (was: public read)
DROP POLICY IF EXISTS "public read invitations" ON invitations;
CREATE POLICY "authenticated read invitations" ON invitations
  FOR SELECT TO authenticated
  USING (true);

-- push_subscriptions: restrict SELECT to tournament owner/admin
DROP POLICY IF EXISTS "public read push_subscriptions" ON push_subscriptions;
CREATE POLICY "owner or admin read push_subscriptions" ON push_subscriptions
  FOR SELECT TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM tournaments WHERE owner_email = auth.email()
      UNION
      SELECT ta.tournament_id FROM tournament_admins ta WHERE ta.email = auth.email()
    )
  );

COMMIT;
