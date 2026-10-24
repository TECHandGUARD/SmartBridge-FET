-- Moderator-led study call sessions with short-lived presence leases.
alter table public.peer_study_call_members add column if not exists last_seen_at timestamptz;
create or replace function smartbridge_private.peer_call_host_live(call_key uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.peer_study_calls c
  join public.peer_study_call_members m on m.call_id=c.id and m.user_id=c.host_id
  join public.peer_call_moderators a on a.room_id=c.room_id and a.moderator_id=c.host_id and a.revoked_at is null
  join public.users u on u.id=c.host_id and u.is_active and u.onboarding_complete
  where c.id=call_key and c.status in ('waiting','active') and c.expires_at>now()
   and m.left_at is null and m.last_seen_at>now()-interval '45 seconds'
   and (u.role='admin' or u.is_super_admin or (u.role in ('tutor','sace_tutor','student_tutor')
      and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active)))
 );
$$;
revoke all on function smartbridge_private.peer_call_host_live(uuid) from public,anon,authenticated;
create or replace function public.start_peer_study_call(chosen_room text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); call_key uuid;
begin
 if actor is null or not exists(
  select 1 from public.peer_call_moderators a
  join public.users u on u.id=a.moderator_id and u.is_active and u.onboarding_complete
  join public.study_rooms r on r.id=a.room_id and r.is_active
  where a.room_id=chosen_room and a.moderator_id=actor and a.revoked_at is null
   and (u.role='admin' or u.is_super_admin or (u.role in ('tutor','sace_tutor','student_tutor')
    and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active)))
 ) then raise exception 'Approved room moderator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('peer-room:'||chosen_room,0));
 select id into call_key from public.peer_study_calls
  where room_id=chosen_room and status in ('waiting','active') and expires_at>now()
  order by created_at desc limit 1;
 if call_key is not null then
  if not exists(select 1 from public.peer_study_calls where id=call_key and host_id=actor)
   then raise exception 'A moderator session already exists';end if;
  update public.peer_study_call_members set last_seen_at=now(),left_at=null where call_id=call_key and user_id=actor;
  return call_key;
 end if;
 insert into public.peer_study_calls(room_id,host_id,status) values(chosen_room,actor,'active') returning id into call_key;
 insert into public.peer_study_call_members(call_id,user_id,last_seen_at) values(call_key,actor,now());
 return call_key;
end;$$;
create or replace function public.join_peer_study_call(call_key uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.peer_study_calls; actor uuid:=auth.uid();
begin
 select * into c from public.peer_study_calls where id=call_key for update;
 if c.id is null or not smartbridge_private.peer_call_host_live(call_key) or
    not smartbridge_private.peer_study_eligible(actor,c.room_id)
 then raise exception 'Verified learner and live moderator required' using errcode='42501';end if;
 if (select count(*) from public.peer_study_call_members where call_id=call_key and left_at is null and last_seen_at>now()-interval '45 seconds')>=6
 and not exists(select 1 from public.peer_study_call_members where call_id=call_key and user_id=actor and left_at is null)
 then raise exception 'Study call is full';end if;
 insert into public.peer_study_call_members(call_id,user_id,last_seen_at)
 values(call_key,actor,now())
 on conflict(call_id,user_id) do update set last_seen_at=now(),left_at=null;
 return true;
end;$$;
create or replace function public.heartbeat_peer_study_call(call_key uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();c public.peer_study_calls;
begin
 select * into c from public.peer_study_calls where id=call_key for update;
 if c.id is null or c.status not in ('waiting','active') or c.expires_at<=now()
 then raise exception 'Call expired';end if;
 if not exists(select 1 from public.peer_study_call_members where call_id=call_key and user_id=actor and left_at is null)
 then raise exception 'Not admitted' using errcode='42501';end if;
 if actor=c.host_id then
  if not exists(select 1 from public.peer_call_moderators a join public.users u on u.id=a.moderator_id
    where a.room_id=c.room_id and a.moderator_id=actor and a.revoked_at is null and u.is_active)
  then raise exception 'Moderator no longer authorized' using errcode='42501';end if;
 else
  if not smartbridge_private.peer_study_eligible(actor,c.room_id) or not smartbridge_private.peer_call_host_live(call_key)
  then raise exception 'Call admission expired' using errcode='42501';end if;
 end if;
 update public.peer_study_call_members set last_seen_at=now() where call_id=call_key and user_id=actor;
 return true;
end;$$;
create or replace function public.leave_peer_study_call(call_key uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 update public.peer_study_call_members set left_at=now() where call_id=call_key and user_id=actor and left_at is null;
 if exists(select 1 from public.peer_study_calls where id=call_key and host_id=actor)
 then update public.peer_study_calls set status='ended',ended_at=now() where id=call_key and status<>'ended';end if;
 return true;
end;$$;
revoke all on function public.start_peer_study_call(text),public.join_peer_study_call(uuid),public.heartbeat_peer_study_call(uuid),public.leave_peer_study_call(uuid) from public,anon;
grant execute on function public.start_peer_study_call(text),public.join_peer_study_call(uuid),public.heartbeat_peer_study_call(uuid),public.leave_peer_study_call(uuid) to authenticated;
