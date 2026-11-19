savepoint feature_access_fixture;
insert into auth.users(id,email) values
 ('00000000-0000-4000-8000-000000001171','flag-tutor@example.invalid'),
 ('00000000-0000-4000-8000-000000001172','flag-student@example.invalid'),
 ('00000000-0000-4000-8000-000000001173','flag-pending@example.invalid'),
 ('00000000-0000-4000-8000-000000001174','flag-disabled@example.invalid'),
 ('00000000-0000-4000-8000-000000001175','flag-admin@example.invalid');
update public.users set role=case right(id::text,1) when '1' then 'sace_tutor'
 when '2' then 'student' when '3' then 'tutor_pending' when '4' then 'student_tutor' else 'admin' end,
 is_active=right(id::text,1)<>'4',onboarding_complete=true,
 trial_started_at=case when right(id::text,1)='1' then now()-interval '4 days' else now() end
where id::text like '00000000-0000-4000-8000-00000000117%';
insert into public.university_directory(name,url,is_active)
values ('Feature access fixture','https://example.invalid',true);

set local role anon;
do $$ begin
 if has_function_privilege(current_user,'public.my_feature_access()','EXECUTE') then
  raise exception 'Anonymous feature lookup is callable';
 end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001175","role":"authenticated"}',true);
insert into public.feature_toggles(feature_key,label,is_enabled,enabled_for_emails)
values('opportunities','Student Opportunities',false,array[' FLAG-TUTOR@example.invalid ','flag-pending@example.invalid','flag-disabled@example.invalid'])
on conflict(feature_key) do update set is_enabled=false,enabled_for_emails=excluded.enabled_for_emails,disabled_for_emails='{}';
do $$ begin
 if not exists(select 1 from public.feature_toggles where feature_key='opportunities') then
  raise exception 'Admin cannot manage feature toggles';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001171","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.my_feature_access() where feature_key='opportunities' and is_enabled) then
  raise exception 'Globally off feature denied its allowed tutor';
 end if;
 if exists(select 1 from public.feature_toggles) then raise exception 'Private override lists visible'; end if;
 if exists(select 1 from public.university_directory where name='Feature access fixture') then
  raise exception 'Feature override also granted Premium';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001172","role":"authenticated","email":"flag-tutor@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.my_feature_access() where feature_key='opportunities' and is_enabled)
 or exists(select 1 from public.university_directory where name='Feature access fixture') then
  raise exception 'Global off or authenticated UUID identity failed';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001173","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.my_feature_access() where feature_key='opportunities' and is_enabled) then
  raise exception 'A pending tutor was granted Opportunities';
 end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001174","role":"authenticated"}',true);
do $$ begin
 begin
  perform public.my_feature_access();
  raise exception 'Inactive identity resolved feature flags';
 exception when insufficient_privilege then null; end;
end $$;

reset role;
select set_config('request.jwt.claims','{}',true);
update public.users set trial_started_at=now() where id='00000000-0000-4000-8000-000000001171';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001171","role":"authenticated"}',true);
do $$ begin
 if not exists(select 1 from public.university_directory where name='Feature access fixture') then
  raise exception 'Allowed tutor with an active trial cannot read the catalog';
 end if;
end $$;

select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001175","role":"authenticated"}',true);
update public.feature_toggles set is_enabled=true,disabled_for_emails=array['flag-tutor@example.invalid']
where feature_key='opportunities';
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001171","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.my_feature_access() where feature_key='opportunities' and is_enabled)
 or exists(select 1 from public.university_directory where name='Feature access fixture') then
  raise exception 'Explicit denial lost precedence or did not affect RLS';
 end if;
end $$;

rollback to feature_access_fixture;
release savepoint feature_access_fixture;
