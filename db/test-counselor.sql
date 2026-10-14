reset role;select set_config('request.jwt.claims','{}',true);
insert into auth.users(id,email,raw_user_meta_data) values
('00000000-0000-4000-8000-000000004011','counselor-admin@example.invalid','{}'),
('00000000-0000-4000-8000-000000004012','counselor-staff@example.invalid','{}'),
('00000000-0000-4000-8000-000000004013','counselor-learner@example.invalid','{}'),
('00000000-0000-4000-8000-000000004014','counselor-other@example.invalid','{}');
update public.users set role=case when id='00000000-0000-4000-8000-000000004011' then 'admin' else 'student' end,onboarding_complete=true where id in ('00000000-0000-4000-8000-000000004011','00000000-0000-4000-8000-000000004012','00000000-0000-4000-8000-000000004013','00000000-0000-4000-8000-000000004014');
insert into public.university_applications(student_id,student_email,university_name,stage) values('00000000-0000-4000-8000-000000004013','counselor-learner@example.invalid','Fixture University','Saved'),('00000000-0000-4000-8000-000000004014','counselor-other@example.invalid','Private University','Saved');
insert into public.application_documents(application_id,student_id,student_email,doc_type,file_url) select id::text,student_id,student_email,'Motivation Letter','private://do-not-expose' from public.university_applications where student_id='00000000-0000-4000-8000-000000004013';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004011","role":"authenticated"}',true);
select public.assign_counselor('counselor-staff@example.invalid','counselor-learner@example.invalid','Fixture School');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004012","role":"authenticated"}',true);
do $$begin
 if jsonb_array_length(public.get_counselor_dashboard()->'students')<>0 then raise exception 'Pending learner data exposed';end if;
 begin perform public.assign_counselor('counselor-staff@example.invalid','counselor-other@example.invalid','Forged School');raise exception 'Staff self assignment';exception when raise_exception then if sqlerrm='Staff self assignment' then raise;end if;end;
 begin perform public.queue_counselor_reminder('00000000-0000-4000-8000-000000004013');raise exception 'Pending reminder sent';exception when raise_exception then if sqlerrm='Pending reminder sent' then raise;end if;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004013","role":"authenticated"}',true);
select public.respond_counselor_link((select id from public.counselor_student_links where student_id=auth.uid()),'approved');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004012","role":"authenticated"}',true);
do $$declare report jsonb;n uuid;begin
 report:=public.get_counselor_dashboard();
 if jsonb_array_length(report->'students')<>1 or jsonb_array_length(report->'applications')<>1 or report->'applications'->0->>'university_name'<>'Fixture University' then raise exception 'Roster scope failed';end if;
 if jsonb_array_length(report->'documents')<>1 or report->'documents'->0 ? 'file_url' then raise exception 'Private file boundary failed';end if;
 if report->'students'->0 ? 'is_super_admin' or report->'students'->0 ? 'metadata' then raise exception 'Private profile fields exposed';end if;
 n:=public.queue_counselor_reminder('00000000-0000-4000-8000-000000004013');
 if n<>public.queue_counselor_reminder('00000000-0000-4000-8000-000000004013') then raise exception 'Daily reminder duplicated';end if;
 begin perform public.queue_counselor_reminder('00000000-0000-4000-8000-000000004014');raise exception 'Other learner reminded';exception when raise_exception then if sqlerrm='Other learner reminded' then raise;end if;end;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004013","role":"authenticated"}',true);
select public.respond_counselor_link((select id from public.counselor_student_links where student_id=auth.uid()),'revoked');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004012","role":"authenticated"}',true);
do $$begin
 if jsonb_array_length(public.get_counselor_dashboard()->'students')<>0 then raise exception 'Revocation ineffective';end if;
 if not exists(select 1 from public.counselor_dashboard_signals where counselor_id=auth.uid() and revision>=3) then raise exception 'Realtime signal missing';end if;
end;$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000004014","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.counselor_student_links) then raise exception 'Link isolation failed';end if;
 begin perform public.get_counselor_dashboard();raise exception 'Learner became staff';exception when raise_exception then if sqlerrm='Learner became staff' then raise;end if;end;
end;$$;
reset role;
