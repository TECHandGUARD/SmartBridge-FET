reset role;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email) values
('00000000-0000-4000-8000-000000007601','meeting-admin@example.invalid'),
('00000000-0000-4000-8000-000000007602','meeting-tutor@example.invalid'),
('00000000-0000-4000-8000-000000007603','meeting-parent@example.invalid'),
('00000000-0000-4000-8000-000000007604','meeting-peer@example.invalid'),
('00000000-0000-4000-8000-000000007605','meeting-student@example.invalid');
update public.users set role=case right(id::text,1) when '1' then 'admin' when '3' then 'parent' when '5' then 'student' else 'sace_tutor' end,is_active=true,onboarding_complete=true where id::text like '%00000000760_';
insert into public.tutor_profiles(user_id,user_email,full_name,is_verified,is_active) values
('00000000-0000-4000-8000-000000007602','meeting-tutor@example.invalid','Meeting Tutor',true,true),
('00000000-0000-4000-8000-000000007604','meeting-peer@example.invalid','Meeting Peer',true,true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$begin
 begin perform public.create_virtual_meeting('Parent created','parent_support','',now(),30,array['meeting-tutor@example.invalid'],gen_random_uuid());raise exception 'Parent created meeting';exception when raise_exception then if sqlerrm='Parent created meeting' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007605","role":"authenticated"}',true);
do $$begin
 begin perform public.list_virtual_meetings();raise exception 'Learner accessed adult meetings';exception when raise_exception then if sqlerrm='Learner accessed adult meetings' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;begin
 k:=public.create_virtual_meeting('Parent support conference','parent_support','Discuss support strategies',now()+interval '5 minutes',30,array['meeting-parent@example.invalid','meeting-peer@example.invalid'],'00000000-0000-4000-8000-000000007611');
 if k<>public.create_virtual_meeting('Parent support conference','parent_support','Discuss support strategies',now()+interval '5 minutes',30,array['meeting-parent@example.invalid','meeting-peer@example.invalid'],'00000000-0000-4000-8000-000000007611') then raise exception 'Duplicate retry';end if;
 if jsonb_array_length(public.list_virtual_meetings())<>1 or not (public.virtual_meeting_details(k)->>'can_join')::boolean then raise exception 'Host meeting missing';end if;
 begin perform public.create_virtual_meeting('Student invitation','staff_support','',now(),30,array['meeting-student@example.invalid'],gen_random_uuid());raise exception 'Student invited';exception when raise_exception then if sqlerrm='Student invited' then raise;end if;end;
 begin insert into public.virtual_meeting_signals(meeting_id,sender_id,recipient_id,kind) values(k,auth.uid(),'00000000-0000-4000-8000-000000007603','ready');raise exception 'Unaccepted invite joined';exception when insufficient_privilege then null;end;
end $$;
-- An uninvited administrator cannot read or join someone else's support conversation.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007601","role":"authenticated"}',true);
do $$declare k uuid;begin
 if jsonb_array_length(public.list_virtual_meetings())<>0 or exists(select 1 from public.virtual_meetings) then raise exception 'Uninvited administrator saw meeting';end if;
 begin perform public.virtual_meeting_details((select id from public.virtual_meetings limit 1));raise exception 'Administrator bypassed invitation';exception when raise_exception then if sqlerrm='Administrator bypassed invitation' then raise;end if;end;
 k:=public.create_virtual_meeting('Staff reflection','tutor_reflection','',now()+interval '1 minute',45,array['meeting-tutor@example.invalid'],gen_random_uuid());
 if k is null then raise exception 'Administrator could not host';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Parent support conference';
 if (public.virtual_meeting_details(k)->>'can_join')::boolean then raise exception 'Invitation acceptance not enforced';end if;
 perform public.respond_virtual_meeting(k,'accepted');
 if not (public.virtual_meeting_details(k)->>'can_join')::boolean then raise exception 'Accepted parent cannot join';end if;
 begin perform public.close_virtual_meeting(k,'ended');raise exception 'Parent ended everyone';exception when raise_exception then if sqlerrm='Parent ended everyone' then raise;end if;end;
 insert into public.virtual_meeting_signals(meeting_id,sender_id,recipient_id,kind,payload) values(k,auth.uid(),'00000000-0000-4000-8000-000000007602','ready','{"session_id":"parent-session"}');
 begin insert into public.virtual_meeting_signals(meeting_id,sender_id,recipient_id,kind) values(k,'00000000-0000-4000-8000-000000007602',auth.uid(),'ready');raise exception 'Signal sender forged';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.virtual_meeting_signals) then raise exception 'Sender read recipient-only signals';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Parent support conference';
 if (select count(*) from public.virtual_meeting_signals where meeting_id=k)<>1 then raise exception 'Host missed parent signal';end if;
 perform public.close_virtual_meeting(k,'ended');
 if (public.virtual_meeting_details(k)->>'can_join')::boolean then raise exception 'Ended room still open';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007604","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Parent support conference';
 begin perform public.respond_virtual_meeting(k,'accepted');raise exception 'Ended invitation accepted';exception when raise_exception then if sqlerrm='Ended invitation accepted' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS: administrator/tutor hosting, parent consent, role restrictions, invitation privacy, idempotency, signals and host ending' result;
