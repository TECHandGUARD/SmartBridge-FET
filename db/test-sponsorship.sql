reset role;
select set_config('request.jwt.claims','{}',true);
update public.tutor_profiles set hourly_rate=100,subject_rates='{"History":0}' where user_id='00000000-0000-4000-8000-000000000102';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002013","role":"authenticated"}',true);
do $$declare p uuid;a uuid;begin
 p:=public.manage_sponsorship('record_verified_funding','{"name":"Rural STEM pilot","organisation":"Test NPO","amount":200,"reference":"TEST-RECEIPT-01","note":"Operator checked test external receipt","verified":true}');
 a:=public.manage_sponsorship('allocate',jsonb_build_object('programme_id',p,'student_id','00000000-0000-4000-8000-000000000101','amount',150));
 perform set_config('test.sponsorship_allocation',a::text,true);
 begin perform public.manage_sponsorship('allocate',jsonb_build_object('programme_id',p,'student_id','00000000-0000-4000-8000-000000000104','amount',100));raise exception 'Over-allocation accepted';
 exception when raise_exception then if sqlerrm='Over-allocation accepted' then raise;end if;end;
 begin perform public.manage_sponsorship('record_verified_funding','{"name":"Unverified","organisation":"Test NPO","amount":200,"reference":"TEST-RECEIPT-02","note":"No funds checked","verified":false}');raise exception 'Unverified receipt accepted';
 exception when raise_exception then if sqlerrm='Unverified receipt accepted' then raise;end if;end;
 begin perform public.manage_sponsorship('record_verified_funding','{"name":"Duplicate","organisation":"Test NPO","amount":200,"reference":"TEST-RECEIPT-01","note":"Operator checked test external receipt","verified":true}');raise exception 'Duplicate receipt accepted';exception when unique_violation then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$declare a uuid;t uuid;b public.tutor_bookings;again public.tutor_bookings;n integer;begin
 select id into a from public.sponsorship_allocations where student_id=auth.uid();
 select id into t from public.tutor_directory where user_id='00000000-0000-4000-8000-000000000102';
 if exists(select 1 from public.sponsorship_programmes) then raise exception 'Confidential receipt exposed';end if;
 begin perform public.manage_sponsorship('record_verified_funding','{}');raise exception 'Learner minted funds';exception when raise_exception then if sqlerrm='Learner minted funds' then raise;end if;end;
 begin update public.sponsorship_allocations set budget=99999 where id=a;raise exception 'Learner changed budget';exception when insufficient_privilege then null;end;
 b:=public.create_sponsored_booking(a,t,'Mathematics',current_date+60,'10:00',1.5,'Funded session','00000000-0000-4000-8000-000000006001');
 begin perform public.create_sponsored_booking(a,t,'History',current_date+62,'10:00',1,'Free subject','00000000-0000-4000-8000-000000006006');raise exception 'Free session reserved money';exception when raise_exception then if sqlerrm='Free session reserved money' then raise;end if;end;
 if b.amount<>150 or b.payment_status<>'sponsored' or b.amount_paid<>0 or b.sponsorship_allocation_id<>a then raise exception 'Wrong sponsored pricing';end if;
 again:=public.create_sponsored_booking(a,t,'Mathematics',current_date+60,'10:00',1.5,'Funded session','00000000-0000-4000-8000-000000006001');
 if again.id<>b.id or (select count(*) from public.sponsorship_reservations)<>1 then raise exception 'Retry double charged';end if;
 begin update public.tutor_bookings set sponsorship_allocation_id=null where id=b.id;raise exception 'Learner detached funding';exception when raise_exception then if sqlerrm='Learner detached funding' then raise;end if;end;
 begin perform public.create_sponsored_booking(a,t,'Mathematics',current_date+61,'10:00',0.5,'No balance','00000000-0000-4000-8000-000000006002');raise exception 'Overspending accepted';exception when raise_exception then if sqlerrm='Overspending accepted' then raise;end if;end;
 if exists(select 1 from public.tutor_bookings where client_request_id='00000000-0000-4000-8000-000000006002') then raise exception 'Failed reservation left orphan booking';end if;
 perform public.cancel_booking(b.id,'Learner cannot attend this session');
 if not exists(select 1 from public.sponsorship_reservations where booking_id=b.id and state='released') then raise exception 'Cancellation did not release budget';end if;
 perform public.cancel_booking(b.id,'Repeated cancellation safely handled');
 again:=public.create_sponsored_booking(a,t,'Mathematics',current_date+61,'10:00',0.5,'Reuse released budget','00000000-0000-4000-8000-000000006003');
 if again.amount<>50 then raise exception 'Half hour incorrectly priced';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.sponsorship_allocations) or exists(select 1 from public.sponsorship_reservations) then raise exception 'Other learner funding leaked';end if;
 begin perform public.create_sponsored_booking(current_setting('test.sponsorship_allocation')::uuid,'00000000-0000-4000-8000-000000000102','Mathematics',current_date+62,'10:00',1,'Stolen allocation','00000000-0000-4000-8000-000000006004');raise exception 'Cross learner funding theft';exception when raise_exception then if sqlerrm='Cross learner funding theft' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000002013","role":"authenticated"}',true);
select public.manage_sponsorship('pause_programme',jsonb_build_object('programme_id',(select programme_id from public.sponsorship_allocations where id=current_setting('test.sponsorship_allocation')::uuid)));
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$declare t uuid;begin
 select id into t from public.tutor_directory where user_id='00000000-0000-4000-8000-000000000102';
 begin perform public.create_sponsored_booking(current_setting('test.sponsorship_allocation')::uuid,t,'Mathematics',current_date+63,'10:00',0.5,'Paused funding','00000000-0000-4000-8000-000000006005');raise exception 'Paused programme accepted booking';exception when raise_exception then if sqlerrm='Paused programme accepted booking' then raise;end if;end;
end $$;
reset role;
-- Simulate a legitimately completed historical session to verify ledger lifecycle.
select set_config('request.jwt.claims','{}',true);
update public.tutor_bookings set status='completed' where client_request_id='00000000-0000-4000-8000-000000006003';
do $$begin if not exists(select 1 from public.sponsorship_reservations r join public.tutor_bookings b on b.id=r.booking_id where b.client_request_id='00000000-0000-4000-8000-000000006003' and r.state='consumed') then raise exception 'Completed session not consumed';end if;end $$;
select 'PASS: sponsorship authorised funding, allocation caps, pricing, retries, cancellation, lifecycle and privacy' result;
