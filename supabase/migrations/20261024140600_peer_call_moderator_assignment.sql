-- Administrator-controlled moderator assignment. Does not activate calling.
create or replace function public.assign_peer_call_moderator(chosen_room text, chosen_moderator uuid, enable_assignment boolean default true)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid := auth.uid();
begin
 if actor is null or not exists (
  select 1 from public.users u where u.id=actor and u.is_active
   and (u.role='admin' or u.is_super_admin)
 ) then raise exception 'Administrator authorization required' using errcode='42501'; end if;
 if not exists(select 1 from public.study_rooms r where r.id=chosen_room and r.is_active) then
  raise exception 'Active study room required'; end if;
 if not exists(
  select 1 from public.users u where u.id=chosen_moderator and u.is_active and u.onboarding_complete
   and (u.role='admin' or u.is_super_admin or (
    u.role in ('tutor','sace_tutor','student_tutor') and exists(
     select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active
    )
   ))
 ) then raise exception 'An active administrator or verified tutor is required'; end if;
 if enable_assignment then
  insert into public.peer_call_moderators(room_id,moderator_id,assigned_by,revoked_at)
  values(chosen_room,chosen_moderator,actor,null)
  on conflict(room_id,moderator_id) do update set assigned_by=excluded.assigned_by,assigned_at=now(),revoked_at=null;
 else
  update public.peer_call_moderators set revoked_at=now()
  where room_id=chosen_room and moderator_id=chosen_moderator and revoked_at is null;
 end if;
 return true;
end;
$$;
revoke all on function public.assign_peer_call_moderator(text,uuid,boolean) from public,anon;
grant execute on function public.assign_peer_call_moderator(text,uuid,boolean) to authenticated;
