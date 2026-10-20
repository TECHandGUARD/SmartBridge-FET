-- Initial invitees retain start+5 admission; guests added in a live room get a fresh window.
alter table public.virtual_meeting_participants add column invited_at timestamptz not null default now(),add column entry_deadline timestamptz;
create table smartbridge_private.meeting_guest_requests(
 meeting_id uuid not null references public.virtual_meetings(id) on delete cascade,request_id uuid not null,
 created_at timestamptz not null default now(),primary key(meeting_id,request_id)
);
alter table smartbridge_private.meeting_guest_requests enable row level security;
revoke all on smartbridge_private.meeting_guest_requests from public,anon,authenticated;
create function smartbridge_private.meeting_entry_open(meeting_key uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.meeting_adult(actor) and exists(
 select 1 from public.virtual_meetings m join public.virtual_meeting_participants p on p.meeting_id=m.id
 where m.id=meeting_key and p.user_id=actor and p.response<>'declined' and m.status='scheduled'
 and m.ends_at>=now()-interval '30 minutes' and smartbridge_private.meeting_adult(m.host_id)
 and ((m.host_id=actor and m.starts_at<=now()+interval '20 minutes')
 or (m.host_id<>actor and (p.first_joined_at is not null or now() between m.starts_at and coalesce(p.entry_deadline,m.starts_at+interval '5 minutes')))))
$$;
revoke all on function smartbridge_private.meeting_entry_open(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.meeting_entry_open(uuid,uuid) to authenticated;
create or replace function smartbridge_private.can_join_meeting(meeting_key uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.meeting_entry_open(meeting_key,actor) and exists(select 1 from public.virtual_meeting_participants p where p.meeting_id=meeting_key and p.user_id=actor and p.response='accepted')
$$;
create or replace function smartbridge_private.virtual_meeting_details(meeting_key uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.meeting_member(meeting_key) then raise exception 'This meeting is available to invited participants only';end if;
 return (select to_jsonb(m)||jsonb_build_object('can_join',smartbridge_private.can_join_meeting(m.id,auth.uid()),'can_attempt_join',smartbridge_private.meeting_entry_open(m.id,auth.uid()),'participants',(
 select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',u.full_name,'role',u.role,'response',p.response,'first_joined_at',p.first_joined_at,'entry_deadline',coalesce(p.entry_deadline,m.starts_at+interval '5 minutes')) order by p.user_id)
 from public.virtual_meeting_participants p join public.users u on u.id=p.user_id where p.meeting_id=m.id)) from public.virtual_meetings m where m.id=meeting_key);
end $$;
create or replace function smartbridge_private.join_virtual_meeting(meeting_key uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.virtual_meetings;p public.virtual_meeting_participants;
begin
 if not smartbridge_private.meeting_member(meeting_key) then raise exception 'Your meeting invitation is required';end if;
 select * into m from public.virtual_meetings where id=meeting_key for update;
 select * into p from public.virtual_meeting_participants where meeting_id=meeting_key and user_id=auth.uid() for update;
 if m.status<>'scheduled' or m.ends_at<now()-interval '30 minutes' or not smartbridge_private.meeting_adult(m.host_id) then raise exception 'This meeting has ended or is unavailable';end if;
 if p.response='declined' then raise exception 'Accept your declined invitation before joining';end if;
 if not smartbridge_private.meeting_entry_open(meeting_key,auth.uid()) then raise exception 'Your joining window is not open. Ask the host to send a fresh invitation if it has expired.';end if;
 if p.response='invited' then perform smartbridge_private.respond_virtual_meeting(meeting_key,'accepted');end if;
 update public.virtual_meeting_participants set first_joined_at=coalesce(first_joined_at,now()) where meeting_id=meeting_key and user_id=auth.uid();
 return smartbridge_private.virtual_meeting_details(meeting_key);
end $$;
create function smartbridge_private.invite_virtual_meeting_guests(meeting_key uuid,invite_emails text[],client_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.virtual_meetings;ids uuid[];wanted integer;person uuid;changed integer;host_name text;
begin
 if not smartbridge_private.meeting_adult(auth.uid()) or client_request_id is null then raise exception 'Host access and request ID required';end if;
 select * into m from public.virtual_meetings where id=meeting_key for update;
 if m.id is null or m.host_id<>auth.uid() or m.status<>'scheduled' or m.ends_at<=now() then raise exception 'Only the host can invite people to an active meeting';end if;
 if not exists(select 1 from public.virtual_meeting_participants where meeting_id=meeting_key and user_id=auth.uid() and first_joined_at is not null) then raise exception 'Join the room before adding a guest';end if;
 if exists(select 1 from smartbridge_private.meeting_guest_requests r where r.meeting_id=meeting_key and r.request_id=client_request_id) then return smartbridge_private.virtual_meeting_details(meeting_key);end if;
 if (select count(*) from smartbridge_private.meeting_guest_requests r where r.meeting_id=meeting_key and r.created_at>now()-interval '1 day')>=10 then raise exception 'Meeting invitation limit reached';end if;
 select count(distinct lower(btrim(e))) into wanted from unnest(invite_emails) e where btrim(e)<>'';
 if coalesce(cardinality(invite_emails),0) not between 1 and 5 or wanted not between 1 and 5 then raise exception 'Enter one to five registered account emails';end if;
 select array_agg(u.id) into ids from public.users u where lower(u.email) in(select lower(btrim(e)) from unnest(invite_emails)e) and u.id<>auth.uid() and smartbridge_private.meeting_adult(u.id);
 if coalesce(cardinality(ids),0)<>wanted then raise exception 'Guests need active parent, administrator or verified tutor accounts. Do not include yourself.';end if;
 if (select count(*) from public.virtual_meeting_participants where meeting_id=meeting_key)+(select count(*) from unnest(ids) id where not exists(select 1 from public.virtual_meeting_participants p where p.meeting_id=meeting_key and p.user_id=id))>6 then raise exception 'This room allows six people including the host';end if;
 select coalesce(nullif(full_name,''),'Your SmartBridge host') into host_name from public.users where id=auth.uid();
 insert into smartbridge_private.meeting_guest_requests(meeting_id,request_id) values(meeting_key,client_request_id);
 foreach person in array ids loop
  insert into public.virtual_meeting_participants(meeting_id,user_id,invited_at,entry_deadline)
  values(meeting_key,person,now(),greatest(now(),m.starts_at)+interval '5 minutes')
  on conflict(meeting_id,user_id) do update set invited_at=excluded.invited_at,entry_deadline=excluded.entry_deadline,
   response=case when virtual_meeting_participants.response='accepted' then 'accepted' else 'invited' end
  where virtual_meeting_participants.first_joined_at is null;
  get diagnostics changed=row_count;
  if changed>0 then perform smartbridge_private.queue_notification('virtual-meeting:'||meeting_key||':guest:'||client_request_id||':'||person,person,auth.uid(),'meeting-invitation','Join your SmartBridge meeting',host_name||' invited you to '||m.title||'. Open the meeting to accept and join. Your new joining window lasts five minutes from the invitation, or from the start if the meeting has not started.');end if;
 end loop;
 return smartbridge_private.virtual_meeting_details(meeting_key);
end $$;
create function public.invite_virtual_meeting_guests(meeting_key uuid,invite_emails text[],client_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.invite_virtual_meeting_guests($1,$2,$3)$$;
revoke all on function public.invite_virtual_meeting_guests(uuid,text[],uuid),smartbridge_private.invite_virtual_meeting_guests(uuid,text[],uuid) from public,anon;
grant execute on function public.invite_virtual_meeting_guests(uuid,text[],uuid),smartbridge_private.invite_virtual_meeting_guests(uuid,text[],uuid) to authenticated;

-- Relay credentials are issued by the AWS role, only after a user-scoped authorization RPC.
create table smartbridge_private.call_relay_limits(user_id uuid primary key references public.users(id) on delete cascade,window_started timestamptz not null,requests integer not null);
alter table smartbridge_private.call_relay_limits enable row level security;
revoke all on smartbridge_private.call_relay_limits from public,anon,authenticated;
create function smartbridge_private.authorize_call_relay(room_kind text,room_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare used integer;
begin
 if auth.uid() is null then raise exception 'Sign in to use the call relay';end if;
 if (room_kind='meeting' and smartbridge_private.can_join_meeting(room_id,auth.uid())) or (room_kind='classroom' and public.can_join_live_classroom(room_id)) then
  insert into smartbridge_private.call_relay_limits values(auth.uid(),now(),1)
  on conflict(user_id) do update set requests=case when call_relay_limits.window_started<now()-interval '1 minute' then 1 else call_relay_limits.requests+1 end,
   window_started=case when call_relay_limits.window_started<now()-interval '1 minute' then now() else call_relay_limits.window_started end returning requests into used;
  if used>12 then raise exception 'Please wait a minute before requesting another relay connection';end if;
  return auth.uid();
 end if;
 raise exception 'An authorized, open meeting or classroom is required';
end $$;
create function public.authorize_call_relay(room_kind text,room_id uuid) returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.authorize_call_relay($1,$2)$$;
revoke all on function public.authorize_call_relay(text,uuid),smartbridge_private.authorize_call_relay(text,uuid) from public,anon;
grant execute on function public.authorize_call_relay(text,uuid),smartbridge_private.authorize_call_relay(text,uuid) to authenticated;
