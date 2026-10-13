-- Run both migrations and the core fixtures before this test, in one rollback transaction.
reset role;
select set_config('request.jwt.claims','{}',true);
update public.tutor_profiles set is_verified=true,is_active=true,hourly_rate=100,subjects=array['Mathematics'] where user_id='00000000-0000-4000-8000-000000000102';
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000103','repair-parent@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000104','repair-other@example.invalid','{}');
insert into public.student_progress(student_id,student_email,subject,grade) values
 ('00000000-0000-4000-8000-000000000101','repair-student@example.invalid','Mathematics','Grade 12'),
 ('00000000-0000-4000-8000-000000000104','repair-other@example.invalid','Mathematics','Grade 12');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","email":"repair-student@example.invalid"}',true);
do $$ declare tutor uuid; booking public.tutor_bookings; again public.tutor_bookings; begin
 select id into tutor from public.tutor_directory where user_id='00000000-0000-4000-8000-000000000102';
 booking:=public.create_booking(tutor,'Mathematics',current_date+2,'14:00',1.5,'Test request','00000000-0000-4000-8000-000000000201');
 if booking.amount<>150 or booking.student_id<>auth.uid() or booking.date<>current_date+2 or booking.message<>'Test request' then raise exception 'Incorrect booking contract'; end if;
 again:=public.create_booking(tutor,'Mathematics',current_date+2,'14:00',1.5,'Test request','00000000-0000-4000-8000-000000000201');
 if again.id<>booking.id then raise exception 'Retry duplicated booking'; end if;
 begin perform public.create_booking(tutor,'Mathematics',current_date+2,'15:30',1,'','00000000-0000-4000-8000-000000000202'); raise exception 'Overlap accepted';
 exception when raise_exception then if sqlerrm='Overlap accepted' then raise; end if; end;
 begin perform public.create_booking(tutor,'Unavailable',current_date+3,'14:00',1,'','00000000-0000-4000-8000-000000000203'); raise exception 'Wrong subject accepted';
 exception when raise_exception then if sqlerrm='Wrong subject accepted' then raise; end if; end;
 begin update public.tutor_bookings set amount=1 where id=booking.id; raise exception 'Price manipulation succeeded';
 exception when raise_exception then if sqlerrm='Price manipulation succeeded' then raise; end if; end;
 begin update public.tutor_bookings set payment_status='paid' where id=booking.id; raise exception 'Unverified payment accepted';
 exception when raise_exception then if sqlerrm='Unverified payment accepted' then raise; end if; end;
 begin update public.tutor_bookings set tutor_id=auth.uid() where id=booking.id; raise exception 'Ownership manipulation succeeded';
 exception when raise_exception then if sqlerrm='Ownership manipulation succeeded' then raise; end if; end;
 begin insert into public.tutor_bookings(student_id,student_email,tutor_email,subject,date,time,amount) values(auth.uid(),'repair-student@example.invalid','repair-tutor@example.invalid','Mathematics',current_date+4,'14:00',1); raise exception 'Unchecked insert accepted';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated","email":"repair-parent@example.invalid"}',true);
select public.complete_onboarding('parent','','','',true,false);
select public.request_parent_link('repair-student@example.invalid');
do $$ declare link uuid; begin
 select id into link from public.get_parent_links();
 if exists(select 1 from public.student_progress) or exists(select 1 from public.quiz_results) or exists(select 1 from public.tutor_bookings) then raise exception 'Pending parent read learner data'; end if;
 begin perform public.respond_parent_link(link,'approved'); raise exception 'Parent self-approval succeeded';
 exception when raise_exception then if sqlerrm='Parent self-approval succeeded' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","email":"repair-student@example.invalid"}',true);
select public.respond_parent_link((select id from public.get_parent_links()),'approved');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","role":"authenticated","email":"repair-parent@example.invalid"}',true);
do $$ begin
 if (select count(*) from public.student_progress)<>1 or (select count(*) from public.quiz_results)<>1 or (select count(*) from public.tutor_bookings)<>1 then raise exception 'Approved report access failed or leaked another learner'; end if;
end $$;
select public.respond_parent_link((select id from public.get_parent_links()),'revoked');
do $$ begin
 if exists(select 1 from public.student_progress) or exists(select 1 from public.quiz_results) or exists(select 1 from public.tutor_bookings) then raise exception 'Revoked parent retained access'; end if;
end $$;
reset role;
select 'PASS: server prices, retry deduplication, overlaps, immutable payments and learner-approved/revoked report access' result;
-- The progress view counts existing sessions; logging the same request twice is one session.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","email":"repair-student@example.invalid"}',true);
set local role authenticated;
select public.log_study_session('Mathematics','Grade 12','00000000-0000-4000-8000-000000000301');
select public.log_study_session('Mathematics','Grade 12','00000000-0000-4000-8000-000000000301');
do $$ begin
 if (select study_sessions from public.study_progress where student_id=auth.uid() and subject='Mathematics')<>1 then raise exception 'Study retry duplicated progress'; end if;
 if exists(select 1 from public.study_progress where student_id='00000000-0000-4000-8000-000000000104') then raise exception 'Progress view leaked another learner'; end if;
 insert into public.activity_log(event_type,user_email,user_id,description) values('repair_test','forged@example.invalid','00000000-0000-4000-8000-000000000104','Test attribution');
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
do $$ begin
 if not exists(select 1 from public.activity_log where event_type='repair_test' and user_id='00000000-0000-4000-8000-000000000101' and user_email='repair-student@example.invalid') then raise exception 'Activity attribution failed'; end if;
end $$;
insert into public.system_configuration(key,value,is_active,is_encrypted) values('repair_secret','{"key":"fake-test-secret"}',true,true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","email":"repair-student@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.system_configuration where key='repair_secret') then raise exception 'Secret configuration exposed'; end if;
end $$;
reset role;
select 'PASS: idempotent study logging, authorized summary, actor attribution and secret configuration denial' result;
