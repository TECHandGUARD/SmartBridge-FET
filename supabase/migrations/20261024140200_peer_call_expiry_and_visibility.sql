-- Defence in depth: expired or ended sessions cannot expose learner call metadata.
-- This migration does not enable peer calling; the request RPC remains fail-closed.
create or replace function smartbridge_private.peer_call_is_member(chosen_call uuid, actor uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select actor = auth.uid() and exists (
   select 1 from public.peer_study_call_members m
   join public.peer_study_calls c on c.id = m.call_id
   where m.call_id = chosen_call and m.user_id = actor
     and m.left_at is null and c.ended_at is null
     and c.status in ('waiting', 'active') and c.expires_at > now()
 );
$$;
revoke all on function smartbridge_private.peer_call_is_member(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.peer_call_is_member(uuid,uuid) to authenticated;

-- Avoid leaking ended/expired session metadata even to former members.
drop policy if exists "Peer calls only visible to eligible members" on public.peer_study_calls;
create policy "Peer calls only visible to eligible members" on public.peer_study_calls
 for select to authenticated using (
   ended_at is null and expires_at > now() and status in ('waiting','active')
   and smartbridge_private.peer_study_eligible(auth.uid(),room_id)
   and smartbridge_private.peer_call_is_member(id,auth.uid())
 );

-- Keep all direct client mutations disabled until the admission RPC is implemented.
revoke insert,update,delete on public.peer_study_calls, public.peer_study_call_members from authenticated,anon;
