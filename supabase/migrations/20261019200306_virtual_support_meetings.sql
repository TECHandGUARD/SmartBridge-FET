-- Invited adult support meetings are independent of learner lesson bookings/payments.
create table public.virtual_meetings (
 id uuid primary key default gen_random_uuid(), host_id uuid not null references public.users(id),
 title text not null check(length(btrim(title)) between 3 and 120),
 purpose text not null check(purpose in ('parent_support','tutor_reflection','staff_support')),
 agenda text not null default '' check(length(agenda)<=2000),
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'scheduled' check(status in ('scheduled','ended','cancelled')),
 request_id uuid not null, created_at timestamptz not null default now(),
 unique(host_id,request_id),check(ends_at>starts_at and ends_at<=starts_at+interval '2 hours')
);
create table public.virtual_meeting_participants (
 meeting_id uuid not null references public.virtual_meetings(id) on delete cascade,
 user_id uuid not null references public.users(id),
 response text not null default 'invited' check(response in ('invited','accepted','declined')),
 responded_at timestamptz, primary key(meeting_id,user_id)
);
create index virtual_meetings_host on public.virtual_meetings(host_id,starts_at desc);
create index virtual_meeting_participant_user on public.virtual_meeting_participants(user_id,meeting_id);
create table public.virtual_meeting_signals (
 id uuid primary key default gen_random_uuid(),meeting_id uuid not null references public.virtual_meetings(id) on delete cascade,
 sender_id uuid not null references public.users(id),recipient_id uuid not null references public.users(id),
 kind text not null check(kind in ('ready','offer','answer','ice','leave')),payload jsonb not null default '{}',
 created_at timestamptz not null default clock_timestamp(),expires_at timestamptz not null default(now()+interval '2 hours'),
 check(sender_id<>recipient_id),check(octet_length(payload::text)<=16384)
);
create index virtual_meeting_signals_recipient on public.virtual_meeting_signals(meeting_id,recipient_id,created_at);
create index virtual_meeting_signals_expiry on public.virtual_meeting_signals(expires_at);
alter table public.virtual_meetings enable row level security;
alter table public.virtual_meeting_participants enable row level security;
alter table public.virtual_meeting_signals enable row level security;
revoke all on public.virtual_meetings,public.virtual_meeting_participants,public.virtual_meeting_signals from public,anon,authenticated;
grant select on public.virtual_meetings,public.virtual_meeting_participants,public.virtual_meeting_signals to authenticated;
grant insert on public.virtual_meeting_signals to authenticated;

create function smartbridge_private.meeting_adult(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.users u where u.id=actor and u.is_active and u.onboarding_complete and
 (u.role in ('admin','parent') or u.is_super_admin or (u.role in ('tutor','sace_tutor','student_tutor') and exists(select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active))))
$$;
create function smartbridge_private.meeting_member(meeting_key uuid) returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.meeting_adult(auth.uid()) and exists(select 1 from public.virtual_meeting_participants p where p.meeting_id=meeting_key and p.user_id=auth.uid())
$$;
create function smartbridge_private.can_join_meeting(meeting_key uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select smartbridge_private.meeting_adult(actor) and exists(
 select 1 from public.virtual_meetings m join public.virtual_meeting_participants p on p.meeting_id=m.id
 where m.id=meeting_key and p.user_id=actor and p.response='accepted' and m.status='scheduled'
 and m.starts_at<=now()+interval '20 minutes' and m.ends_at>=now()-interval '30 minutes'
 and smartbridge_private.meeting_adult(m.host_id))
$$;
revoke all on function smartbridge_private.meeting_adult(uuid),smartbridge_private.meeting_member(uuid),smartbridge_private.can_join_meeting(uuid,uuid) from public,anon;
grant execute on function smartbridge_private.meeting_adult(uuid),smartbridge_private.meeting_member(uuid),smartbridge_private.can_join_meeting(uuid,uuid) to authenticated;
create policy "Invited adults read meeting" on public.virtual_meetings for select to authenticated using(smartbridge_private.meeting_member(id));
create policy "Invited adults read roster" on public.virtual_meeting_participants for select to authenticated using(smartbridge_private.meeting_member(meeting_id));
create policy "Accepted recipients read meeting signals" on public.virtual_meeting_signals for select to authenticated
 using(recipient_id=(select auth.uid()) and expires_at>now() and smartbridge_private.can_join_meeting(meeting_id,(select auth.uid())));
create policy "Accepted participants send meeting signals" on public.virtual_meeting_signals for insert to authenticated
 with check(sender_id=(select auth.uid()) and smartbridge_private.can_join_meeting(meeting_id,(select auth.uid()))
 and smartbridge_private.can_join_meeting(meeting_id,recipient_id)
 and created_at between now()-interval '1 minute' and now()+interval '1 minute'
 and expires_at>now() and expires_at<=now()+interval '2 hours');

create function smartbridge_private.create_virtual_meeting(meeting_title text,meeting_purpose text,meeting_agenda text,scheduled_start timestamptz,duration_minutes integer,invite_emails text[],client_request_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor public.users;meeting_key uuid;ids uuid[];email_count integer;recipient uuid;
begin
 select * into actor from public.users where id=auth.uid();
 if not smartbridge_private.meeting_adult(auth.uid()) or (actor.role='parent' and not coalesce(actor.is_super_admin,false)) then raise exception 'An administrator or verified tutor must request the meeting';end if;
 if client_request_id is null then raise exception 'Request ID required';end if;
 perform pg_advisory_xact_lock(hashtextextended('virtual-meeting:'||auth.uid()::text,0));
 select id into meeting_key from public.virtual_meetings where host_id=auth.uid() and request_id=client_request_id;
 if meeting_key is not null then return meeting_key;end if;
 if length(btrim(coalesce(meeting_title,''))) not between 3 and 120 or length(coalesce(meeting_agenda,''))>2000 or meeting_purpose not in ('parent_support','tutor_reflection','staff_support') then raise exception 'Provide a meeting title, purpose and short agenda';end if;
 if scheduled_start is null or scheduled_start<now()-interval '5 minutes' or scheduled_start>now()+interval '180 days' or duration_minutes is null or duration_minutes not between 15 and 120 then raise exception 'Choose a start within 180 days and a duration of 15–120 minutes';end if;
 select count(distinct lower(btrim(e))) into email_count from unnest(invite_emails) e where btrim(e)<>'';
 if email_count not between 1 and 5 or coalesce(cardinality(invite_emails),0)>5 then raise exception 'Invite one to five people, excluding yourself';end if;
 select array_agg(u.id) into ids from public.users u where lower(u.email) in (select lower(btrim(e)) from unnest(invite_emails) e)
 and u.id<>auth.uid() and smartbridge_private.meeting_adult(u.id);
 if coalesce(cardinality(ids),0)<>email_count then raise exception 'Invitees must have active parent, administrator or verified tutor accounts; do not include yourself';end if;
 if (select count(*) from public.virtual_meetings where host_id=auth.uid() and created_at>now()-interval '1 day')>=20 then raise exception 'Daily meeting request limit reached';end if;
 insert into public.virtual_meetings(host_id,title,purpose,agenda,starts_at,ends_at,request_id)
 values(auth.uid(),btrim(meeting_title),meeting_purpose,coalesce(meeting_agenda,''),scheduled_start,scheduled_start+duration_minutes*interval '1 minute',client_request_id) returning id into meeting_key;
 insert into public.virtual_meeting_participants(meeting_id,user_id,response,responded_at) values(meeting_key,auth.uid(),'accepted',now());
 foreach recipient in array ids loop
 insert into public.virtual_meeting_participants(meeting_id,user_id) values(meeting_key,recipient);
 perform smartbridge_private.queue_notification('virtual-meeting:'||meeting_key||':invite:'||recipient,recipient,auth.uid(),'meeting-invitation','Virtual meeting invitation',
 coalesce(nullif(actor.full_name,''),'A SmartBridge host')||' invited you to '||btrim(meeting_title)||'. Accept or decline in Virtual Meetings: /meetings',null);
 end loop;
 return meeting_key;
end $$;
create function public.create_virtual_meeting(meeting_title text,meeting_purpose text,meeting_agenda text,scheduled_start timestamptz,duration_minutes integer,invite_emails text[],client_request_id uuid)
returns uuid language sql security invoker set search_path='' as $$select smartbridge_private.create_virtual_meeting($1,$2,$3,$4,$5,$6,$7)$$;

create function smartbridge_private.respond_virtual_meeting(meeting_key uuid,decision text) returns boolean language plpgsql security definer set search_path='' as $$
declare m public.virtual_meetings;
begin
 if not smartbridge_private.meeting_member(meeting_key) or decision not in ('accepted','declined') then raise exception 'Your meeting invitation is required';end if;
 select * into m from public.virtual_meetings where id=meeting_key for update;
 if m.host_id=auth.uid() or m.status<>'scheduled' or m.ends_at<now()-interval '30 minutes' then raise exception 'This invitation cannot be changed';end if;
 update public.virtual_meeting_participants set response=decision,responded_at=now() where meeting_id=meeting_key and user_id=auth.uid() and response<>decision;
 if found then perform smartbridge_private.queue_notification('virtual-meeting:'||meeting_key||':'||auth.uid()||':'||decision,m.host_id,auth.uid(),'meeting-response','Meeting invitation response',
 'An invited participant '||decision||' the invitation to '||m.title||'. View Virtual Meetings: /meetings',null);end if;
 return true;
end $$;
create function public.respond_virtual_meeting(meeting_key uuid,decision text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.respond_virtual_meeting($1,$2)$$;
create function smartbridge_private.close_virtual_meeting(meeting_key uuid,decision text) returns boolean language plpgsql security definer set search_path='' as $$
declare m public.virtual_meetings;recipient uuid;
begin
 if not smartbridge_private.meeting_adult(auth.uid()) or decision not in ('ended','cancelled') then raise exception 'Host access required';end if;
 select * into m from public.virtual_meetings where id=meeting_key for update;
 if m.id is null or m.host_id<>auth.uid() then raise exception 'Only the host can end or cancel this meeting';end if;
 if m.status<>'scheduled' then return true;end if;
 update public.virtual_meetings set status=decision where id=meeting_key;
 for recipient in select user_id from public.virtual_meeting_participants where meeting_id=meeting_key and user_id<>auth.uid() loop
 perform smartbridge_private.queue_notification('virtual-meeting:'||meeting_key||':'||decision||':'||recipient,recipient,auth.uid(),'meeting-status','Virtual meeting '||decision,m.title||' has been '||decision||'. View Virtual Meetings: /meetings',null);
 end loop;return true;
end $$;
create function public.close_virtual_meeting(meeting_key uuid,decision text) returns boolean language sql security invoker set search_path='' as $$select smartbridge_private.close_virtual_meeting($1,$2)$$;

create function smartbridge_private.virtual_meeting_details(meeting_key uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.meeting_member(meeting_key) then raise exception 'This meeting is available to invited participants only';end if;
 return (select to_jsonb(m)||jsonb_build_object('can_join',smartbridge_private.can_join_meeting(m.id,auth.uid()),'participants',(
 select jsonb_agg(jsonb_build_object('user_id',p.user_id,'full_name',u.full_name,'role',u.role,'response',p.response) order by p.user_id)
 from public.virtual_meeting_participants p join public.users u on u.id=p.user_id where p.meeting_id=m.id)) from public.virtual_meetings m where m.id=meeting_key);
end $$;
create function public.virtual_meeting_details(meeting_key uuid) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.virtual_meeting_details($1)$$;
create function smartbridge_private.list_virtual_meetings() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.meeting_adult(auth.uid()) then raise exception 'An active administrator, parent or verified tutor account is required';end if;
 return coalesce((select jsonb_agg(item order by starts_at desc) from (
 select smartbridge_private.virtual_meeting_details(m.id) as item,m.starts_at from public.virtual_meetings m
 join public.virtual_meeting_participants p on p.meeting_id=m.id and p.user_id=auth.uid() order by m.starts_at desc limit 100) rows),'[]'::jsonb);
end $$;
create function public.list_virtual_meetings() returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.list_virtual_meetings()$$;

revoke all on function public.create_virtual_meeting(text,text,text,timestamptz,integer,text[],uuid),smartbridge_private.create_virtual_meeting(text,text,text,timestamptz,integer,text[],uuid),public.respond_virtual_meeting(uuid,text),smartbridge_private.respond_virtual_meeting(uuid,text),public.close_virtual_meeting(uuid,text),smartbridge_private.close_virtual_meeting(uuid,text),public.virtual_meeting_details(uuid),smartbridge_private.virtual_meeting_details(uuid),public.list_virtual_meetings(),smartbridge_private.list_virtual_meetings() from public,anon;
grant execute on function public.create_virtual_meeting(text,text,text,timestamptz,integer,text[],uuid),smartbridge_private.create_virtual_meeting(text,text,text,timestamptz,integer,text[],uuid),public.respond_virtual_meeting(uuid,text),smartbridge_private.respond_virtual_meeting(uuid,text),public.close_virtual_meeting(uuid,text),smartbridge_private.close_virtual_meeting(uuid,text),public.virtual_meeting_details(uuid),smartbridge_private.virtual_meeting_details(uuid),public.list_virtual_meetings(),smartbridge_private.list_virtual_meetings() to authenticated;
do $$begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='virtual_meeting_signals') then alter publication supabase_realtime add table public.virtual_meeting_signals;end if;
end $$;
