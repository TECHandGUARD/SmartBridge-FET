-- Six migrations + previous fixture files in a rollback transaction.
reset role;
select set_config('request.jwt.claims','{}',true);
insert into storage.objects(bucket_id,name) values
 ('application_documents','00000000-0000-4000-8000-000000000101/own.pdf'),
 ('application_documents','00000000-0000-4000-8000-000000000104/other.pdf'),
 ('tutor-resources','00000000-0000-4000-8000-000000000102/premium.pdf');
insert into public.resources(id,title,subject,grade,type,file_url,tutor_id,tutor_email,is_approved,is_premium)
 values('00000000-0000-4000-8000-000000000701','Private premium','Mathematics','Grade 12','Notes','storage://tutor-resources/00000000-0000-4000-8000-000000000102/premium.pdf','00000000-0000-4000-8000-000000000102','repair-tutor@example.invalid',true,true);
insert into public.university_applications(id,student_id,student_email,university_name,stage) values('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000104','repair-other@example.invalid','Test university','Saved');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000104","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from storage.objects where bucket_id='application_documents')<>1 then raise exception 'Cross-account private file visible';end if;
 if exists(select 1 from storage.objects where bucket_id='tutor-resources') then raise exception 'Unpaid premium file visible';end if;
 begin insert into storage.objects(bucket_id,name) values('application_documents','00000000-0000-4000-8000-000000000101/forged.pdf');raise exception 'Foreign upload allowed';exception when insufficient_privilege then null;end;
 insert into public.application_documents(student_id,student_email,application_id,doc_type,file_url,status) values(auth.uid(),'repair-other@example.invalid','00000000-0000-4000-8000-000000000801','ID Copy','storage://application_documents/'||auth.uid()::text||'/other.pdf','uploaded');
 begin update public.application_documents set status='verified' where student_id=auth.uid();raise exception 'Document self-verification';exception when raise_exception then if sqlerrm='Document self-verification' then raise;end if;end;
 if not public.report_client_event('render_error') then raise exception 'Client report failed';end if;
 begin perform public.operational_status();raise exception 'Client read private operations';exception when insufficient_privilege then null;end;
 begin perform public.set_scheduled_job('study',true);raise exception 'Student enabled job';exception when raise_exception then if sqlerrm='Student enabled job' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from storage.objects where bucket_id='tutor-resources') then raise exception 'Verified paying learner cannot read premium file';end if;
end $$;
set local role anon;
select set_config('request.jwt.claims','{}',true);
do $$ begin if exists(select 1 from storage.objects where bucket_id in ('application_documents','tutor-resources')) then raise exception 'Anonymous private read';end if;end $$;
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare job jsonb;run uuid:=gen_random_uuid();begin
 if public.claim_operational_job('study',run) is not null then raise exception 'Disabled job claimed';end if;
 update smartbridge_private.scheduled_jobs set enabled=true where key='study';
 job:=public.claim_operational_job('study',run);if job is null then raise exception 'Job was not claimed';end if;
 if public.claim_operational_job('study',gen_random_uuid()) is not null then raise exception 'Concurrent lease allowed';end if;
 if public.finish_operational_job('study',gen_random_uuid(),'success') then raise exception 'Wrong lease completed';end if;
 if not public.finish_operational_job('study',run,'partial') then raise exception 'Run completion lost';end if;
 if not exists(select 1 from smartbridge_private.operational_events where source='job' and code='job_study') then raise exception 'Failed job not recorded';end if;
end $$;
reset role;
select 'PASS: private files override public policy, owned uploads, premium/anonymous boundaries, private monitoring and job leases' as result;
