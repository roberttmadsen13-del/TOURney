-- Migration 023: Document current push_subscriptions RLS state.
-- Auth guard fix applied in pwa.js (not DB-level): _subscribePush now calls
-- sb.auth.getSession() before upserting, so unauthenticated users no longer
-- hit the INSERT RLS policy. The existing "auth insert push subscription"
-- (WITH CHECK: true) and "auth update push subscription" (USING/WITH CHECK: true)
-- policies are correct for authenticated users.
-- This migration is a no-op SQL placeholder to document the fix in the migration log.
SELECT 1; -- push_subscriptions 403 root cause: pwa.js missing auth session check (fixed in pwa.js)
