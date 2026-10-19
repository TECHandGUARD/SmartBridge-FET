-- Meeting mail uses the durable transactional outbox, including stable provider retry keys.
alter table public.action_notifications add column meeting_id uuid references public.virtual_meetings(id) on delete cascade;
create index virtual_meetings_reminder_due on public.virtual_meetings(starts_at) where status='scheduled';
create index action_notifications_meeting on public.action_notifications(meeting_id) where meeting_id is not null;
create or replace function smartbridge_private.queue_notification(event_key text,recipient uuid,actor uuid,kind text,subject text,message text,booking uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare existing uuid; email text; created uuid; meeting public.virtual_meetings;
begin
 perform pg_advisory_xact_lock(hashtextextended(event_key,0));
 select o.id into existing from smartbridge_private.notification_outbox o where o.event_key=queue_notification.event_key;
 if existing is not null then return existing; end if;
 select u.email into email from public.users u where u.id=recipient;
 if email is null then return null;end if;
 insert into public.action_notifications(recipient_id,actor_id,kind,subject,message,booking_id)
 values(recipient,actor,kind,subject,message,booking) returning id into created;
 insert into smartbridge_private.notification_outbox(id,event_key,recipient_email) values(created,event_key,email);
 if kind like 'meeting-%' and event_key like 'virtual-meeting:%' then
  select * into meeting from public.virtual_meetings where id=split_part(event_key,':',2)::uuid;
  if meeting.id is not null then
   update public.action_notifications set meeting_id=meeting.id,
    message=action_notifications.message||E'\nStart: '||to_char(meeting.starts_at at time zone 'Africa/Johannesburg','DD Mon YYYY HH24:MI')||' SAST. Duration: '||extract(epoch from (meeting.ends_at-meeting.starts_at))::integer/60||' minutes.'
   where id=created;
  end if;
 end if;
 return created;
end;$$;
revoke all on function smartbridge_private.queue_notification(text,uuid,uuid,text,text,text,uuid) from public,anon,authenticated;


update public.action_notifications n set meeting_id=m.id
from smartbridge_private.notification_outbox o join public.virtual_meetings m on m.id::text=split_part(o.event_key,':',2)
where n.id=o.id and n.kind like 'meeting-%' and o.event_key like 'virtual-meeting:%';

create function smartbridge_private.meeting_notification_ids(meeting_key uuid) returns uuid[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(n.id order by n.created_at),'{}'::uuid[]) from public.action_notifications n
 where smartbridge_private.meeting_member(meeting_key) and n.meeting_id=meeting_key
 and (n.actor_id=auth.uid() or n.recipient_id=auth.uid()) and n.email_status in ('pending','failed')
$$;
create function public.meeting_notification_ids(meeting_key uuid) returns uuid[] language sql security invoker set search_path='' as $$select smartbridge_private.meeting_notification_ids($1)$$;
revoke all on function public.meeting_notification_ids(uuid),smartbridge_private.meeting_notification_ids(uuid) from public,anon;
grant execute on function public.meeting_notification_ids(uuid),smartbridge_private.meeting_notification_ids(uuid) to authenticated;

-- Never deliver a delayed invitation/reminder after decline, cancellation, expiry or account suspension.
alter function public.claim_action_notification(uuid,uuid) set schema smartbridge_private;
create function public.claim_action_notification(event_id uuid,caller_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare event public.action_notifications; live boolean; claimed jsonb;
begin
 select * into event from public.action_notifications where id=event_id;
 if event.meeting_id is not null and event.kind in ('meeting-invitation','meeting-reminder') then
  select m.status='scheduled' and m.ends_at>now() and p.response<>'declined'
   and (event.kind<>'meeting-reminder' or (m.starts_at>now() and (
    not exists(select 1 from smartbridge_private.notification_outbox o where o.id=event.id and split_part(o.event_key,':',4)='60')
    or m.starts_at>now()+interval '30 minutes')))
   and smartbridge_private.meeting_adult(m.host_id) and smartbridge_private.meeting_adult(p.user_id)
  into live from public.virtual_meetings m join public.virtual_meeting_participants p on p.meeting_id=m.id
  where m.id=event.meeting_id and p.user_id=event.recipient_id;
  if not coalesce(live,false) then
   update smartbridge_private.notification_outbox set state='review',error_code='meeting_notification_obsolete',lease_until=null
    where id=event_id and state in ('pending','failed');
   update public.action_notifications set email_status='skipped' where id=event_id and email_status in ('pending','failed');
   return null;
  end if;
 end if;
 claimed:=smartbridge_private.claim_action_notification(event_id,caller_id);
 if claimed is null then return null;end if;
 return claimed||jsonb_build_object('meeting_id',event.meeting_id);
end $$;
revoke all on function public.claim_action_notification(uuid,uuid),smartbridge_private.claim_action_notification(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_action_notification(uuid,uuid) to service_role;

-- The cron transport generates a new, random single-use credential for each invocation.
-- Credentials never appear in source, cron commands or browser-readable tables.
create table smartbridge_private.meeting_mail_runs (
 token text primary key,expires_at timestamptz not null,created_at timestamptz not null default now(),
 consumed_at timestamptz,request_id bigint
);
alter table smartbridge_private.meeting_mail_runs enable row level security;
revoke all on smartbridge_private.meeting_mail_runs from public,anon,authenticated;
create function public.consume_meeting_mail_token(job_token text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 update smartbridge_private.meeting_mail_runs set consumed_at=now() where token=job_token and expires_at>now() and consumed_at is null;
 return found;
end $$;
revoke all on function public.consume_meeting_mail_token(text) from public,anon,authenticated;
grant execute on function public.consume_meeting_mail_token(text) to service_role;

create function public.prepare_meeting_emails() returns uuid[] language plpgsql security definer set search_path='' as $$
declare item record;queued uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('meeting-email-reminders',0));
 for item in
  select m.*,p.user_id,minutes_before from public.virtual_meetings m
  join public.virtual_meeting_participants p on p.meeting_id=m.id
  cross join (values(60),(30)) reminders(minutes_before)
  where m.status='scheduled' and m.starts_at>now() and p.response<>'declined'
   and smartbridge_private.meeting_adult(m.host_id) and smartbridge_private.meeting_adult(p.user_id)
   and m.created_at<=m.starts_at-minutes_before*interval '1 minute'
   and now()>=m.starts_at-minutes_before*interval '1 minute'
   -- Missed one-hour reminders expire at the thirty-minute threshold; never send both together.
   and now()<m.starts_at-(minutes_before-30)*interval '1 minute'
 loop
  queued:=smartbridge_private.queue_notification('virtual-meeting:'||item.id||':reminder:'||item.minutes_before||':'||item.user_id,
   item.user_id,item.host_id,'meeting-reminder','Meeting reminder: '||item.minutes_before||' minutes',
   'Reminder for '||item.title||'. Open the meeting to review your invitation and join at the scheduled time.');
 end loop;
 return coalesce((select array_agg(id) from (
  select o.id from smartbridge_private.notification_outbox o join public.action_notifications n on n.id=o.id
  where n.meeting_id is not null and o.state in ('pending','failed','sending') and o.attempts<5
   and o.next_attempt_at<=now() and (o.state<>'sending' or o.lease_until<=now())
   and o.created_at>now()-interval '23 hours' order by o.created_at,o.id limit 10
 ) due),'{}'::uuid[]);
end $$;
revoke all on function public.prepare_meeting_emails() from public,anon,authenticated;
grant execute on function public.prepare_meeting_emails() to service_role;

create table smartbridge_private.meeting_mail_settings(key text primary key check(key='project_url'),value text not null);
alter table smartbridge_private.meeting_mail_settings enable row level security;
revoke all on smartbridge_private.meeting_mail_settings from public,anon,authenticated;
