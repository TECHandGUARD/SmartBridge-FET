insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000901','learning-owner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000902','learning-other@example.invalid','{}');
update public.users set role='student',onboarding_complete=true where id in
 ('00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000902');
insert into public.nbt_resources(title,url,is_active) values('Visible test guide','https://example.invalid/guide',true),('Draft test guide','https://example.invalid/draft',false);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated","email":"learning-owner@example.invalid"}',true);
insert into public.syllabus_progress(student_id,student_email,subject,topic_id) values(auth.uid(),'learning-owner@example.invalid','Mathematics','math_algebra')
 on conflict(student_id,subject,topic_id) do update set completed=excluded.completed;
insert into public.syllabus_progress(student_id,student_email,subject,topic_id) values(auth.uid(),'learning-owner@example.invalid','Mathematics','math_algebra')
 on conflict(student_id,subject,topic_id) do update set completed=excluded.completed;
insert into public.nbt_planner_progress(student_id,student_email,completed_sessions) values(auth.uid(),'learning-owner@example.invalid','{"4_Monday":true}')
 on conflict(student_id) do update set completed_sessions=excluded.completed_sessions;
do $$ begin
 if (select count(*) from public.syllabus_progress)<>1 then raise exception 'Topic retry created duplicate'; end if;
 if (select completed_sessions from public.nbt_planner_progress) <> '{"4_Monday":true}'::jsonb then raise exception 'NBT state not persisted'; end if;
 if (select count(*) from public.nbt_resources)<>1 then raise exception 'NBT drafts exposed'; end if;
 begin update public.nbt_planner_progress set completed_sessions='{"anything":"true"}'; raise exception 'Invalid NBT state accepted';
  exception when raise_exception then if sqlerrm='Invalid NBT state accepted' then raise; end if; end;
 begin update public.nbt_planner_progress set student_email='learning-other@example.invalid'; raise exception 'Progress email forgery accepted';
  exception when raise_exception then if sqlerrm='Progress email forgery accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000902","role":"authenticated","email":"learning-other@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.syllabus_progress) or exists(select 1 from public.nbt_planner_progress) then raise exception 'Other learner sees progress'; end if;
 update public.syllabus_progress set completed=false; if found then raise exception 'Other learner edits topics'; end if;
 delete from public.nbt_planner_progress; if found then raise exception 'Other learner deletes NBT progress'; end if;
 begin insert into public.syllabus_progress(student_id,student_email,subject,topic_id) values('00000000-0000-4000-8000-000000000901','learning-owner@example.invalid','Math','topic'); raise exception 'Forged topic owner accepted';
  exception when raise_exception then if sqlerrm='Forged topic owner accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated","email":"learning-owner@example.invalid"}',true);
update public.nbt_planner_progress set completed_sessions='{}';
delete from public.syllabus_progress where topic_id='math_algebra';
do $$ begin
 if exists(select 1 from public.syllabus_progress) then raise exception 'Own topic undo failed'; end if;
 if (select completed_sessions from public.nbt_planner_progress) <> '{}'::jsonb then raise exception 'Own NBT undo failed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{}',true);
update public.users set is_active=false where id='00000000-0000-4000-8000-000000000901';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000901","role":"authenticated","email":"learning-owner@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.nbt_planner_progress) then raise exception 'Inactive learner progress access'; end if;
end $$;
reset role;
select 'PASS: topic retry/undo, NBT persistence, private ownership and inactive-account denial' as result;
