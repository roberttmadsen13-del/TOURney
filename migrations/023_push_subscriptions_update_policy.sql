-- Migration 023: Add UPDATE RLS policy to push_subscriptions for upsert support.
-- Context: INSERT policy exists (018) but on_conflict upsert hits UPDATE path → 403.
-- Policy may already be live (applied directly). This migration makes it idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'push_subscriptions' AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "auth update push subscription" ON push_subscriptions
      FOR UPDATE TO authenticated
      USING (
        tournament_id IN (
          SELECT tournament_id FROM players WHERE email = auth.email()
        )
      )
      WITH CHECK (
        tournament_id IN (
          SELECT tournament_id FROM players WHERE email = auth.email()
        )
      );
  END IF;
END $$;
