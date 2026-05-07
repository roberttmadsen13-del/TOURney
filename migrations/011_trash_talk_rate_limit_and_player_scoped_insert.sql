-- Migration 011: Trash talk INSERT scoping + 30-second rate limit.
--
-- Bug: "trash_talk insert" policy only checked auth.role()='authenticated' and valid tournament_id.
--   Any auth user could post as any player_id (impersonation).
--   No rate limit — open to spam flooding.
--
-- Fix 1: Scope INSERT to own player_id (player.email = auth.email()).
-- Fix 2: Add last_trash_talk_at to players; enforce via BEFORE INSERT trigger.

-- Add rate-limit timestamp column
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_trash_talk_at TIMESTAMPTZ;

-- Trigger function: check rate limit + update timestamp atomically
CREATE OR REPLACE FUNCTION check_trash_talk_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last TIMESTAMPTZ;
BEGIN
  SELECT last_trash_talk_at INTO v_last
  FROM players
  WHERE id = NEW.player_id;

  IF v_last IS NOT NULL AND NOW() - v_last < INTERVAL '30 seconds' THEN
    RAISE EXCEPTION 'Rate limit: wait 30 seconds between posts';
  END IF;

  UPDATE players SET last_trash_talk_at = NOW() WHERE id = NEW.player_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trash_talk_rate_limit ON trash_talk;
CREATE TRIGGER trash_talk_rate_limit
  BEFORE INSERT ON trash_talk
  FOR EACH ROW EXECUTE FUNCTION check_trash_talk_rate_limit();

-- Fix INSERT policy: require player_id belongs to auth user in same tournament
DROP POLICY IF EXISTS "trash_talk insert" ON trash_talk;
CREATE POLICY "trash_talk insert" ON trash_talk
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players p
      WHERE p.id = player_id
        AND p.email = auth.email()
        AND p.tournament_id = tournament_id
    )
  );
