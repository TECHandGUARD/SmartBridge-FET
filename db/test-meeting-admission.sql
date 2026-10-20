reset role;
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007601","role":"authenticated"}',true);
select public.create_virtual_meeting('Five minute boundary','staff_support','',now()-interval '5 minutes',30,array['meeting-parent@example.invalid','meeting-tutor@example.invalid'],'00000000-0000-4000-8000-000000007621');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Five minute boundary';
 if not (public.join_virtual_meeting(k)->>'can_join')::boolean then raise exception 'Exact five-minute entry denied';end if;
 if not exists(select 1 from public.virtual_meeting_participants where meeting_id=k and user_id=auth.uid() and response='accepted' and first_joined_at is not null) then raise exception 'Join did not accept and record admission';end if;
 begin update public.virtual_meeting_participants set first_joined_at=now() where meeting_id=k;raise exception 'Participant forged admission';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.virtual_meetings set starts_at=starts_at-interval '1 millisecond' where title='Five minute boundary';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007602","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Five minute boundary';
 begin perform public.join_virtual_meeting(k);raise exception 'Late first admission accepted';exception when raise_exception then if sqlerrm='Late first admission accepted' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='Five minute boundary';
 if not (public.join_virtual_meeting(k)->>'can_join')::boolean then raise exception 'Admitted participant disconnected at deadline';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007601","role":"authenticated"}',true);
select public.create_virtual_meeting('No early invitees','staff_support','',now()+interval '1 minute',30,array['meeting-parent@example.invalid'],'00000000-0000-4000-8000-000000007622');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000007603","role":"authenticated"}',true);
do $$declare k uuid;begin
 select id into k from public.virtual_meetings where title='No early invitees';
 perform public.respond_virtual_meeting(k,'accepted');
 if (public.virtual_meeting_details(k)->>'can_join')::boolean then raise exception 'Early invitee enabled';end if;
 begin perform public.join_virtual_meeting(k);raise exception 'Early invitee admitted';exception when raise_exception then if sqlerrm='Early invitee admitted' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
select 'PASS: first entry opens at start, inclusive five minute cutoff, late first entry denied, existing participants continue/rejoin, admission cannot be forged' result;
