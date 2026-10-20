-- First entry closes at start + five minutes; admitted users keep access/reconnect.
alter table public.virtual_meeting_participants add column first_joined_at timestamptz;
create or replace function smartbridge_private.can_join_meeting(meeting_key uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.meeting_adult(actor) and exists(
 select 1 from public.virtual_meetings m join public.virtual_meeting_participants p on p.meeting_id=m.id
 where m.id=meeting_key and p.user_id=actor and p.response='accepted' and m.status='scheduled'
 and m.ends_at>=now()-interval '30 minutes' and smartbridge_private.meeting_adult(m.host_id)
 and ((m.host_id=actor and m.starts_at<=now()+interval '20 minutes')
 or (m.host_id<>actor and (p.first_joined_at is not null or now() between m.starts_at and m.starts_at+interval '5 minutes'))))
$$;
create or replace function smartbridge_private.virtual_meeting_details(meeting_key uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.meeting_member(meeting_key) then raise exception 'This meeting is available to invited participants only';end if;
 return (select to_jsonb(m)||jsonb_build_object('can_join',smartbridge_private.can_join_meeting(m.id,auth.uid()),'participants',(
 select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',u.full_name,'role',u.role,'response',p.response,'first_joined_at',p.first_joined_at) order by p.user_id)
 from public.virtual_meeting_participants p join public.users u on u.id=p.user_id where p.meeting_id=m.id)) from public.virtual_meetings m where m.id=meeting_key);
end $$;
create function smartbridge_private.join_virtual_meeting(meeting_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.virtual_meetings;p public.virtual_meeting_participants;
begin
 if not smartbridge_private.meeting_member(meeting_key) then raise exception 'Your meeting invitation is required';end if;
 select * into m from public.virtual_meetings where id=meeting_key for update;
 select * into p from public.virtual_meeting_participants where meeting_id=meeting_key and user_id=auth.uid() for update;
 if m.status<>'scheduled' or m.ends_at<now()-interval '30 minutes' or not smartbridge_private.meeting_adult(m.host_id) then raise exception 'This meeting has ended or is unavailable';end if;
 if p.response='declined' then raise exception 'Accept your declined invitation before joining';end if;
 if m.host_id=auth.uid() then
  if m.starts_at>now()+interval '20 minutes' then raise exception 'The host can prepare the room 20 minutes before the start';end if;
 elsif p.first_joined_at is null and (now()<m.starts_at or now()>m.starts_at+interval '5 minutes') then
  raise exception 'Invitees can first join from the scheduled start until five minutes afterwards';
 end if;
 if p.response='invited' then perform smartbridge_private.respond_virtual_meeting(meeting_key,'accepted');end if;
 update public.virtual_meeting_participants set first_joined_at=coalesce(first_joined_at,now()) where meeting_id=meeting_key and user_id=auth.uid();
 return smartbridge_private.virtual_meeting_details(meeting_key);
end $$;
create function public.join_virtual_meeting(meeting_key uuid) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.join_virtual_meeting($1)$$;
revoke all on function smartbridge_private.join_virtual_meeting(uuid),public.join_virtual_meeting(uuid) from public,anon;
grant execute on function smartbridge_private.join_virtual_meeting(uuid),public.join_virtual_meeting(uuid) to authenticated;
