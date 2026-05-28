-- P2: Add courses + course_holes to delete_tournament() RPC
-- Previous version omitted courses/course_holes — tournament delete left orphaned rows.
-- course_holes cascade-deletes when courses deleted (FK ON DELETE CASCADE).

CREATE OR REPLACE FUNCTION delete_tournament(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM push_subscriptions  WHERE tournament_id = p_id;
  DELETE FROM scores               WHERE tournament_id = p_id;
  DELETE FROM trash_talk           WHERE tournament_id = p_id;
  DELETE FROM tournament_admins    WHERE tournament_id = p_id;
  DELETE FROM invitations          WHERE tournament_id = p_id;
  DELETE FROM players              WHERE tournament_id = p_id;
  DELETE FROM settings             WHERE tournament_id = p_id;
  DELETE FROM rounds               WHERE tournament_id = p_id;
  -- course_holes cascade-deletes when courses deleted (FK ON DELETE CASCADE)
  DELETE FROM courses              WHERE tournament_id = p_id;
  DELETE FROM tournaments          WHERE id = p_id;
END;
$$;
