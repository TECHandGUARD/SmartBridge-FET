reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;ids uuid[];begin
 k:=public.create_virtual_meeting('Email reminder verification','parent_support','',now()+interval '2 hours',30,array['meeting-parent@example.invalid','meeting-peer@example.invalid'],gen_random_uuid());
 ids:=public.meeting_notification_ids(k);
 if cardinality(ids)<>2 then raise exception 'Invitation email IDs missing';end if;
 if exists(select 1 from public.action_notifications where meeting_id=k and message not like '%SAST%') then raise exception 'Invitation time missing';end if;
 begin perform public.prepare_meeting_emails();raise exception 'Browser queued worker reminders';exception when insufficient_privilege then null;end;
 begin perform public.consume_meeting_mail_token('forged');raise exception 'Browser consumed worker token';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007601","role":"authenticated"}',true);
do $$begin
 if cardinality(public.meeting_notification_ids('00000000-0000-4000-8000-000000007611'))<>0 then raise exception 'Outsider exposed event IDs';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
do $$declare k uuid;invite uuid;reminder uuid;token text;begin
 select id into k from public.virtual_meetings where title='Email reminder verification';
 update public.virtual_meetings set created_at=now()-interval '2 hours',starts_at=now()+interval '59 minutes',ends_at=now()+interval '89 minutes' where id=k;
 perform public.prepare_meeting_emails();perform public.prepare_meeting_emails();
 if (select count(*) from public.action_notifications where meeting_id=k and kind='meeting-reminder')<>3 then raise exception 'One-hour reminder recipients or idempotency failed';end if;
 select id into reminder from public.action_notifications where meeting_id=k and kind='meeting-reminder' and recipient_id='00000000-0000-4000-8000-000000007602';
 if public.claim_action_notification(reminder,null) is null then raise exception 'Due reminder unavailable';end if;
 perform public.finish_action_notification(reminder,null,'test_provider_outage');
 if public.claim_action_notification(reminder,null) is not null then raise exception 'Retry ignored backoff';end if;
 update smartbridge_private.notification_outbox set next_attempt_at=now() where id=reminder;
 if public.claim_action_notification(reminder,null) is null then raise exception 'Failed reminder not retryable';end if;
 perform public.finish_action_notification(reminder,'test-provider-id',null);
 if public.claim_action_notification(reminder,null) is not null then raise exception 'Accepted email sent twice';end if;
 -- Decline stops both an outstanding invitation and an already queued reminder.
 update public.virtual_meeting_participants set response='declined' where meeting_id=k and user_id='00000000-0000-4000-8000-000000007604';
 for invite in select id from public.action_notifications where meeting_id=k and recipient_id='00000000-0000-4000-8000-000000007604' loop
  if public.claim_action_notification(invite,null) is not null then raise exception 'Declined email was deliverable';end if;
 end loop;
 update public.virtual_meetings set starts_at=now()+interval '29 minutes',ends_at=now()+interval '59 minutes' where id=k;
 perform public.prepare_meeting_emails();perform public.prepare_meeting_emails();
 if (select count(*) from public.action_notifications where meeting_id=k and kind='meeting-reminder')<>5 then raise exception 'Thirty-minute recipients/idempotency failed';end if;
 select n.id into reminder from public.action_notifications n join smartbridge_private.notification_outbox o on o.id=n.id
 where n.meeting_id=k and n.recipient_id='00000000-0000-4000-8000-000000007603' and split_part(o.event_key,':',4)='60';
 if public.claim_action_notification(reminder,null) is not null then raise exception 'Stale one-hour reminder sent at thirty minutes';end if;
 update public.virtual_meetings set status='cancelled' where id=k;
 for invite in select id from public.action_notifications where meeting_id=k and email_status='pending' loop
  if public.claim_action_notification(invite,null) is not null then raise exception 'Cancelled meeting sent an invitation/reminder';end if;
 end loop;
 perform public.prepare_meeting_emails();
 if (select count(*) from public.action_notifications where meeting_id=k and kind='meeting-reminder')<>5 then raise exception 'Cancellation queued more reminders';end if;
 -- A newly created short-notice meeting must not generate past thresholds.
 update public.virtual_meetings set status='scheduled',created_at=now(),request_id=gen_random_uuid() where id=k;
 delete from public.action_notifications where meeting_id=k;
 perform public.prepare_meeting_emails();
 if exists(select 1 from public.action_notifications where meeting_id=k) then raise exception 'Short-notice meeting generated past reminders';end if;
 token:=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into smartbridge_private.meeting_mail_runs(token,expires_at) values(token,now()+interval '1 minute');
 if public.consume_meeting_mail_token(token)<>true or public.consume_meeting_mail_token(token)<>false then raise exception 'Worker credential replay allowed';end if;
 insert into smartbridge_private.meeting_mail_runs(token,expires_at) values('expired-test-token',now()-interval '1 second');
 if public.consume_meeting_mail_token('expired-test-token')<>false then raise exception 'Expired worker credential allowed';end if;
end $$;
select 'PASS: invitation emails, SAST times, both reminder thresholds, retries, duplicate/cancellation/decline suppression and one-use worker authentication' result;
