create or replace function delete_tournament(p_id uuid)
returns void language plpgsql security definer as $$
begin
  delete from push_subscriptions  where tournament_id = p_id;
  delete from scores               where tournament_id = p_id;
  delete from trash_talk           where tournament_id = p_id;
  delete from tournament_admins    where tournament_id = p_id;
  delete from invitations          where tournament_id = p_id;
  delete from players              where tournament_id = p_id;
  delete from settings             where tournament_id = p_id;
  delete from rounds               where tournament_id = p_id;
  delete from tournaments          where id = p_id;
end;
$$;
