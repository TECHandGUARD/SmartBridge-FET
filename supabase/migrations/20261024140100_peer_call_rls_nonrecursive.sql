-- Avoid circular RLS checks between peer_study_calls and peer_study_call_members.
create or replace function smartbridge_private.peer_call_is_member(chosen_call uuid, actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor=auth.uid() and exists(
  select 1 from public.peer_study_call_members m where m.call_id=chosen_call and m.user_id=actor and m.left_at is null
 );
$$;
revoke all on function smartbridge_private.peer_call_is_member(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.peer_call_is_member(uuid,uuid) to authenticated;

drop policy if exists "Peer calls only visible to eligible members" on public.peer_study_calls;
create policy "Peer calls only visible to eligible members" on public.peer_study_calls
 for select to authenticated using(
  smartbridge_private.peer_study_eligible(auth.uid(),room_id)
  and smartbridge_private.peer_call_is_member(id,auth.uid())
 );
drop policy if exists "Peer call members only visible to call members" on public.peer_study_call_members;
create policy "Peer call members only visible to call members" on public.peer_study_call_members
 for select to authenticated using(
  user_id=auth.uid()
  and smartbridge_private.peer_call_is_member(call_id,auth.uid())
 );
