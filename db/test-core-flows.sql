-- Run after the core-flow migration in the SAME transaction, then ROLLBACK.
-- Auth fixtures exist only inside the transaction. No auth HTTP calls/emails are made.
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000101','repair-student@example.invalid','{"role":"admin","full_name":"Repair Student"}'),
 ('00000000-0000-4000-8000-000000000102','repair-tutor@example.invalid','{"role":"sace_tutor","full_name":"Repair Tutor"}');
do $$ begin
 if (select role from public.users where id='00000000-0000-4000-8000-000000000101') <> 'user' then raise exception 'Metadata role escalation'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated","email":"repair-student@example.invalid"}',true);
select public.complete_onboarding('student','','','',true,false);
do $$ begin
 if not exists(select 1 from public.users where id=auth.uid() and role='student' and onboarding_complete) then raise exception 'Onboarding not persisted'; end if;
 if exists(select 1 from public.users where id='00000000-0000-4000-8000-000000000102') then raise exception 'Cross-account read'; end if;
 begin update public.users set is_super_admin=true where id=auth.uid(); raise exception 'Privilege escalation succeeded';
 exception when raise_exception then if sqlerrm='Privilege escalation succeeded' then raise; end if; end;
 begin update public.users set trial_started_at=now()+interval '1 day' where id=auth.uid(); raise exception 'Trial reset succeeded';
 exception when raise_exception then if sqlerrm='Trial reset succeeded' then raise; end if; end;
 begin update public.users set onboarding_complete=false where id=auth.uid(); raise exception 'Onboarding reset succeeded';
 exception when raise_exception then if sqlerrm='Onboarding reset succeeded' then raise; end if; end;
 begin insert into public.subscriptions(user_email,plan,status) values('repair-student@example.invalid','premium','active'); raise exception 'Unverified activation succeeded';
 exception when insufficient_privilege then null; end;
 insert into public.quiz_results(student_id,student_email,quiz_id,subject,grade,score,total_questions,percentage)
 values(auth.uid(),'repair-student@example.invalid','repair-test','Mathematics','Grade 12',1,1,100);
 if not exists(select 1 from public.quiz_results where student_id=auth.uid()) then raise exception 'Quiz result not visible'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated","email":"repair-tutor@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.quiz_results where student_id='00000000-0000-4000-8000-000000000101') then raise exception 'Cross-account quiz read'; end if;
 begin perform public.complete_onboarding('admin','','','',true,true); raise exception 'Admin onboarding succeeded';
 exception when raise_exception then if sqlerrm='Admin onboarding succeeded' then raise; end if; end;
 begin perform public.complete_onboarding('sace_tutor','123','','',true,false); raise exception 'Tutor consent bypassed';
 exception when raise_exception then if sqlerrm='Tutor consent bypassed' then raise; end if; end;
end $$;
select public.complete_onboarding('sace_tutor','123','','',true,true);
do $$ begin
 if not exists(select 1 from public.tutor_profiles where user_id=auth.uid() and is_verified=false) then raise exception 'Missing pending tutor'; end if;
 if exists(select 1 from public.tutor_directory where user_id=auth.uid()) then raise exception 'Pending tutor in directory'; end if;
 begin update public.tutor_profiles set is_verified=true where user_id=auth.uid(); raise exception 'Tutor self-verification succeeded';
 exception when raise_exception then if sqlerrm='Tutor self-verification succeeded' then raise; end if; end;
end $$;
reset role;
select 'PASS: signup, onboarding, ownership, quiz saving, billing and tutor approval boundaries' as result;

-- A tutor decline is a durable, administrator-only decision.
savepoint tutor_application_decline_fixture;
select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000001181','decline-admin@example.invalid');
update public.users set role='admin',onboarding_complete=true where id='00000000-0000-4000-8000-000000001181';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.decline_tutor_application(auth.uid());
  raise exception 'Applicant can change their own decision';
 exception when insufficient_privilege then null; end;
 begin
  update public.users set tutor_application_declined_at=now() where id=auth.uid();
  raise exception 'Applicant could write a decision directly';
 exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001181","role":"authenticated"}',true);
do $$
declare applicant uuid := '00000000-0000-4000-8000-000000000102';
declare first_decision timestamptz;
begin
 first_decision := public.decline_tutor_application(applicant);
 if first_decision is null or public.decline_tutor_application(applicant) is distinct from first_decision then
  raise exception 'Administrator retry changed the decision';
 end if;
 if not exists(select 1 from public.users where id=applicant and role='tutor_pending'
   and not is_verified and tutor_application_declined_at=first_decision) then
  raise exception 'Declined account lost or unlocked its pending role';
 end if;
 if exists(select 1 from public.tutor_profiles where user_id=applicant and (is_verified or is_active)) then
  raise exception 'Declined tutor profile remained active';
 end if;
 if (select count(*) from public.activity_log where user_id=auth.uid() and event_type='tutor_rejected')<>1 then
  raise exception 'Decline audit log is missing or duplicated';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.users where id=auth.uid() and tutor_application_declined_at is not null) then
  raise exception 'Applicant cannot read their decision';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001181","role":"authenticated"}',true);
select public.approve_account('00000000-0000-4000-8000-000000000102','sace_tutor');
do $$ begin
 if not exists(select 1 from public.users where id='00000000-0000-4000-8000-000000000102'
   and role='sace_tutor' and is_verified and tutor_application_declined_at is null) then
  raise exception 'Explicit administrator reconsideration did not resolve the decision';
 end if;
end $$;
rollback to tutor_application_decline_fixture;
release savepoint tutor_application_decline_fixture;
