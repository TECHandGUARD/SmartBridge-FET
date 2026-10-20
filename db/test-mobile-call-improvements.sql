reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000007606','live-guest@example.invalid'),
('00000000-0000-4000-8000-000000007607','live-peer@example.invalid'),
('00000000-0000-4000-8000-000000007608','overflow-guest@example.invalid');
update public.users set role='parent',is_active=true,onboarding_complete=true where id in ('00000000-0000-4000-8000-000000007606','00000000-0000-4000-8000-000000007607','00000000-0000-4000-8000-000000007608');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
select public.create_virtual_meeting('Live guest invitation test','parent_support','',now()+interval '1 minute',45,array['meeting-parent@example.invalid'],'00000000-0000-4000-8000-000000007650');
reset role;
update public.virtual_meetings set starts_at=now()-interval '15 minutes',ends_at=now()+interval '30 minutes' where title='Live guest invitation test';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Live guest invitation test';
 begin perform public.join_virtual_meeting(k);raise exception 'Original late invitation bypassed five-minute rule';exception when raise_exception then if sqlerrm='Original late invitation bypassed five-minute rule' then raise;end if;end;
 begin perform public.invite_virtual_meeting_guests(k,array['live-guest@example.invalid'],gen_random_uuid());raise exception 'Non-host invited a guest';exception when raise_exception then if sqlerrm='Non-host invited a guest' then raise;end if;end;
 begin perform public.authorize_call_relay('meeting',k);raise exception 'Unadmitted late invitee obtained relay access';exception when raise_exception then if sqlerrm='Unadmitted late invitee obtained relay access' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Live guest invitation test';
 perform public.join_virtual_meeting(k);
 perform public.invite_virtual_meeting_guests(k,array['live-guest@example.invalid'],'00000000-0000-4000-8000-000000007651');
 perform public.invite_virtual_meeting_guests(k,array['live-guest@example.invalid'],'00000000-0000-4000-8000-000000007651');
 if (select count(*) from public.virtual_meeting_participants where meeting_id=k)<>3 then raise exception 'Guest retry duplicated participants';end if;
 if cardinality(public.meeting_notification_ids(k))<>2 then raise exception 'Guest retry duplicated emails';end if;
 begin perform public.invite_virtual_meeting_guests(k,array['meeting-student@example.invalid'],gen_random_uuid());raise exception 'Learner invited into adult room';exception when raise_exception then if sqlerrm='Learner invited into adult room' then raise;end if;end;
end $$;
reset role;
do $$declare invite uuid;claimed jsonb;begin
 select n.id into invite from public.action_notifications n join smartbridge_private.notification_outbox o on o.id=n.id where o.event_key like 'virtual-meeting:%:guest:00000000-0000-4000-8000-000000007651:%';
 claimed:=public.claim_action_notification(invite,'00000000-0000-4000-8000-000000007602');
 if claimed is null or claimed->>'to'<>'live-guest@example.invalid' or claimed->>'meeting_id' is null then raise exception 'Live guest email was not claimable with its private meeting link';end if;
 perform public.finish_action_notification(invite,'isolated-test-provider-id',null);
 if public.claim_action_notification(invite,null) is not null then raise exception 'Accepted guest email retried';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007606","role":"authenticated"}',true);
do $$declare k uuid;i integer;begin
 select id into k from public.virtual_meetings where title='Live guest invitation test';
 if not (public.virtual_meeting_details(k)->>'can_attempt_join')::boolean then raise exception 'New guest did not get fresh entry window';end if;
 perform public.join_virtual_meeting(k);
 if public.authorize_call_relay('meeting',k)<>auth.uid() then raise exception 'Relay authorization identity mismatch';end if;
 for i in 1..11 loop perform public.authorize_call_relay('meeting',k);end loop;
 begin perform public.authorize_call_relay('meeting',k);raise exception 'Relay quota bypassed';exception when raise_exception then if sqlerrm='Relay quota bypassed' then raise;end if;end;
 begin perform public.authorize_call_relay('classroom',k);raise exception 'Relay room-kind bypass';exception when raise_exception then if sqlerrm='Relay room-kind bypass' then raise;end if;end;
end $$;
reset role;
update public.virtual_meeting_participants set entry_deadline=now()-interval '1 minute' where user_id='00000000-0000-4000-8000-000000007606';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007606","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Live guest invitation test';
 if not (public.join_virtual_meeting(k)->>'can_join')::boolean then raise exception 'Admitted guest could not reconnect';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Live guest invitation test';
 perform public.invite_virtual_meeting_guests(k,array['meeting-peer@example.invalid','meeting-admin@example.invalid','live-peer@example.invalid'],gen_random_uuid());
 begin perform public.invite_virtual_meeting_guests(k,array['overflow-guest@example.invalid'],gen_random_uuid());raise exception 'Room cap bypassed';exception when raise_exception then if sqlerrm='Room cap bypassed' then raise;end if;end;
 perform public.close_virtual_meeting(k,'ended');
 begin perform public.invite_virtual_meeting_guests(k,array['overflow-guest@example.invalid'],gen_random_uuid());raise exception 'Ended room accepted a guest';exception when raise_exception then if sqlerrm='Ended room accepted a guest' then raise;end if;end;
 begin perform public.authorize_call_relay('meeting',k);raise exception 'Ended room obtained relay access';exception when raise_exception then if sqlerrm='Ended room obtained relay access' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS: host-only live guests, fresh admission windows, idempotent emails, adult privacy, six-person cap, relay identity/quota and ended-room denial' result;
