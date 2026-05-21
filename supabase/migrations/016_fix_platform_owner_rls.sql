-- Migration 016: Fix qa_runs + platform_tasks RLS policies.
-- app.platform_email setting cannot be set via migration (Supabase permission denied).
-- Hardcode owner email directly — single-owner internal platform tool, correct approach.

DROP POLICY IF EXISTS "platform_owner_qa" ON qa_runs;
CREATE POLICY "platform_owner_qa" ON qa_runs
  FOR ALL TO authenticated
  USING (auth.email() = 'robert.t.madsen13@gmail.com')
  WITH CHECK (auth.email() = 'robert.t.madsen13@gmail.com');

DROP POLICY IF EXISTS "platform_owner_only" ON platform_tasks;
CREATE POLICY "platform_owner_only" ON platform_tasks
  FOR ALL TO authenticated
  USING (auth.email() = 'robert.t.madsen13@gmail.com')
  WITH CHECK (auth.email() = 'robert.t.madsen13@gmail.com');
