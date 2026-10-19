-- Server-controlled sender for meeting mail, independent of the legacy sandbox sender.
alter table smartbridge_private.meeting_mail_settings drop constraint meeting_mail_settings_key_check;
alter table smartbridge_private.meeting_mail_settings add constraint meeting_mail_settings_key_check check(key in ('project_url','sender'));
create or replace function public.meeting_email_sender() returns text language sql stable security definer set search_path='' as $$
 select value from smartbridge_private.meeting_mail_settings where key='sender'
$$;
revoke all on function public.meeting_email_sender() from public,anon,authenticated;
grant execute on function public.meeting_email_sender() to service_role;

-- Retire an obsolete email even when the prior worker died during its send lease.
create or replace function public.claim_action_notification(event_id uuid,caller_id uuid) returns jsonb
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
    where id=event_id and (state in ('pending','failed') or (state='sending' and lease_until<=now()));
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

