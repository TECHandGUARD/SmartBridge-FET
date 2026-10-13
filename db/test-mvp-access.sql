-- Disposable fixtures; caller wraps all suites in a transaction and rolls back.
insert into auth.users(id,email,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000801','mvp-learner@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000802','mvp-other@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000803','mvp-admin@example.invalid','{}'),
 ('00000000-0000-4000-8000-000000000804','mvp-inactive@example.invalid','{}');
update public.users set role='student',onboarding_complete=true where id in
 ('00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000802','00000000-0000-4000-8000-000000000804');
update public.users set role='admin',onboarding_complete=true where id='00000000-0000-4000-8000-000000000803';
update public.users set is_active=false where id='00000000-0000-4000-8000-000000000804';
insert into public.profiles(id,full_name,role) values
 ('00000000-0000-4000-8000-000000000801','Own legacy profile','admin'),
 ('00000000-0000-4000-8000-000000000802','Other legacy profile','user');
insert into public.application_deadlines(event_name,date,category,is_active,is_approved) values('MVP live','2026-12-01','Other',true,true),('MVP draft','2026-12-01','Other',true,false);
insert into public.opportunity_guides(title,file_url,category,is_active,is_pending) values('MVP live','https://example.invalid/live.pdf','General',true,false),('MVP draft','https://example.invalid/draft.pdf','General',true,true);
insert into public.university_prospectuses(university_name,year,file_url,is_active,is_approved) values('MVP live',2027,'https://example.invalid/live.pdf',true,true),('MVP draft',2027,'https://example.invalid/draft.pdf',true,false);
insert into public.subjects(name,is_active,is_published) values('MVP live',true,true),('MVP draft',true,false);
insert into public.bursaries(name,provider,apply_link,is_active) values('MVP live','Test','https://example.invalid/apply',true),('MVP draft','Test','https://example.invalid/apply',false);
insert into public.nbt_test_dates(venue,test_date,city,is_active) values('MVP live','2026-12-01','Test',true),('MVP draft','2026-12-01','Test',false);
insert into public.universities(name,is_active) values('MVP live',true),('MVP draft',false);
insert into public.university_directory(name,url,is_active) values('MVP live','https://example.invalid/live',true),('MVP draft','https://example.invalid/draft',false);
insert into public.feature_toggles(feature_key,label,disabled_for_emails) values('mvp-private','MVP private',array['private@example.invalid']);
insert into public.pending_opportunity_guides(id,title,external_link,category) values
 ('00000000-0000-4000-8000-000000000811','MVP review','https://example.invalid/guide.pdf','General');
insert into public.pending_application_deadlines(id,event_name,date,category) values
 ('00000000-0000-4000-8000-000000000812','MVP reviewed deadline','2027-01-01','Other');
insert into public.pending_university_prospectuses(id,university_name,year,external_link) values
 ('00000000-0000-4000-8000-000000000813','MVP reviewed prospectus',2027,'https://example.invalid/prospectus.pdf');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated","email":"mvp-learner@example.invalid","user_metadata":{"role":"admin"}}',true);
do $$ declare relation text; visible integer; begin
 foreach relation in array array['application_deadlines','bursaries','nbt_test_dates','opportunity_guides','subjects','universities','university_directory','university_prospectuses'] loop
  execute format('select count(*) from public.%I',relation) into visible;
  if visible<>1 then raise exception 'Catalogue % leaks drafts or cannot read published row: %',relation,visible; end if;
  begin execute format('insert into public.%I select (jsonb_populate_record(null::public.%I,to_jsonb(t)||jsonb_build_object(''id'',gen_random_uuid()))).* from public.%I t limit 1',relation,relation,relation); raise exception 'Learner catalogue write succeeded';
   exception when insufficient_privilege then null; end;
  if has_table_privilege('authenticated','public.'||relation,'TRUNCATE') then raise exception 'Catalogue truncate privilege'; end if;
 end loop;
 if public.is_admin(auth.uid()) then raise exception 'Legacy profile/JWT role escalation'; end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'Legacy profile privacy failure'; end if;
 if exists(select 1 from public.feature_toggles) or exists(select 1 from public.pending_opportunity_guides)
  or exists(select 1 from public.pending_application_deadlines) or exists(select 1 from public.pending_university_prospectuses) then raise exception 'Private admin queue exposed'; end if;
 begin perform public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','approve',''); raise exception 'Forged review actor succeeded';
  exception when insufficient_privilege then null; end;
 insert into public.banner_clicks(banner_name,user_id,user_email) values('tech_guard',auth.uid(),'mvp-learner@example.invalid');
 if exists(select 1 from public.banner_clicks) then raise exception 'Banner tracking records exposed'; end if;
 begin insert into public.banner_clicks(banner_name,user_id,user_email) values('tech_guard','00000000-0000-4000-8000-000000000802','mvp-other@example.invalid'); raise exception 'Banner actor spoof succeeded';
  exception when insufficient_privilege then null; end;
 insert into public.exam_schedule(id,student_id,student_email,subject,grade,exam_type,exam_date)
  values('00000000-0000-4000-8000-000000000821',auth.uid(),'mvp-learner@example.invalid','Mathematics','Grade 12','Test','2026-12-01');
 if not exists(select 1 from public.exam_schedule where id='00000000-0000-4000-8000-000000000821' and created_by=auth.uid()) then raise exception 'Exam save/read failed'; end if;
 update public.exam_schedule set notes='Prepare algebra' where id='00000000-0000-4000-8000-000000000821';
 begin update public.exam_schedule set score=100 where id='00000000-0000-4000-8000-000000000821'; raise exception 'Self-awarded mark succeeded';
  exception when raise_exception then if sqlerrm='Self-awarded mark succeeded' then raise; end if; end;
 begin update public.exam_schedule set student_id='00000000-0000-4000-8000-000000000802' where id='00000000-0000-4000-8000-000000000821'; raise exception 'Exam transfer succeeded';
  exception when raise_exception then if sqlerrm='Exam transfer succeeded' then raise; end if; end;
 begin insert into public.exam_schedule(student_id,student_email,score) values(auth.uid(),'mvp-learner@example.invalid',99); raise exception 'Mark insert bypass succeeded';
  exception when raise_exception then if sqlerrm='Mark insert bypass succeeded' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000802","role":"authenticated","email":"mvp-other@example.invalid"}',true);
do $$ begin
 if exists(select 1 from public.exam_schedule) then raise exception 'Other learner sees private exam'; end if;
 update public.exam_schedule set notes='Tamper'; if found then raise exception 'Other learner edits exam'; end if;
 delete from public.exam_schedule; if found then raise exception 'Other learner deletes exam'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000804","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.application_deadlines) or exists(select 1 from public.bursaries) then raise exception 'Inactive catalogue access'; end if;
 begin insert into public.exam_schedule(student_id,student_email) values(auth.uid(),'mvp-inactive@example.invalid'); raise exception 'Inactive exam write';
  exception when raise_exception then if sqlerrm='Inactive exam write' then raise; end if; end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000803","role":"authenticated"}',true);
do $$ declare relation text; visible integer; begin
 if not public.is_admin(auth.uid()) then raise exception 'Database administrator denied'; end if;
 foreach relation in array array['application_deadlines','bursaries','nbt_test_dates','opportunity_guides','subjects','universities','university_directory','university_prospectuses'] loop
  execute format('select count(*) from public.%I',relation) into visible;
  if visible<>2 then raise exception 'Administrator draft access failed for %',relation; end if;
 end loop;
 update public.exam_schedule set is_published=true,score=75 where id='00000000-0000-4000-8000-000000000821';
 if not found then raise exception 'Administrator cannot publish exam'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000801","role":"authenticated","email":"mvp-learner@example.invalid"}',true);
do $$ begin
 delete from public.exam_schedule where id='00000000-0000-4000-8000-000000000821';
 if found then raise exception 'Learner deleted published exam'; end if;
 insert into public.exam_schedule(id,student_id,student_email,subject,grade,exam_date,exam_type) values('00000000-0000-4000-8000-000000000822',auth.uid(),'mvp-learner@example.invalid','Mathematics','Grade 12','2026-12-01','Test');
 delete from public.exam_schedule where id='00000000-0000-4000-8000-000000000822';
 if not found then raise exception 'Own personal exam deletion failed'; end if;
end $$;
reset role;
-- Force the final status write to fail: the newly published row must also roll back.
create function pg_temp.reject_mvp_review() returns trigger language plpgsql as $$begin raise exception 'Injected tracking failure'; end;$$;
create trigger reject_mvp_review before update on public.pending_opportunity_guides for each row execute function pg_temp.reject_mvp_review();
set local role service_role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
 begin perform public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','approve',''); raise exception 'Injected failure not encountered';
  exception when raise_exception then if sqlerrm<>'Injected tracking failure' then raise; end if; end;
 if exists(select 1 from public.opportunity_guides where id='00000000-0000-4000-8000-000000000811') then raise exception 'Publication survived tracking failure'; end if;
 if (select status from public.pending_opportunity_guides where id='00000000-0000-4000-8000-000000000811')<>'pending' then raise exception 'Failed review changed status'; end if;
 begin perform public.review_opportunity_content('00000000-0000-4000-8000-000000000801','guide','00000000-0000-4000-8000-000000000811','approve',''); raise exception 'Non-admin reviewer accepted';
  exception when raise_exception then if sqlerrm='Non-admin reviewer accepted' then raise; end if; end;
end $$;
reset role;
drop trigger reject_mvp_review on public.pending_opportunity_guides;
set local role service_role;
select public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','approve','Reviewed');
do $$ declare result jsonb; begin
 result:=public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','approve','Retry');
 if result->>'skipped'<>'true' then raise exception 'Review retry is not idempotent'; end if;
 if (select count(*) from public.opportunity_guides where id='00000000-0000-4000-8000-000000000811')<>1 then raise exception 'Duplicate publication'; end if;
 if not exists(select 1 from public.pending_opportunity_guides where id='00000000-0000-4000-8000-000000000811' and status='approved' and reviewed_by='00000000-0000-4000-8000-000000000803') then raise exception 'Review audit missing'; end if;
 begin perform public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','reject',''); raise exception 'Opposing terminal decision succeeded';
  exception when raise_exception then if sqlerrm='Opposing terminal decision succeeded' then raise; end if; end;
end $$;
select public.review_opportunity_content('00000000-0000-4000-8000-000000000803','deadline','00000000-0000-4000-8000-000000000812','reject','Outdated');
select public.review_opportunity_content('00000000-0000-4000-8000-000000000803','prospectus','00000000-0000-4000-8000-000000000813','approve','Reviewed');
reset role;
-- Revoking an administrator must take effect without waiting for JWT refresh.
update public.users set is_active=false where id='00000000-0000-4000-8000-000000000803';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000803","role":"authenticated","app_metadata":{"role":"admin"}}',true);
do $$ begin
 if public.is_admin(auth.uid()) or exists(select 1 from public.pending_opportunity_guides) then raise exception 'Inactive administrator retained access'; end if;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin perform * from public.application_deadlines; raise exception 'Anonymous catalogue access'; exception when insufficient_privilege then null; end;
 begin perform public.review_opportunity_content('00000000-0000-4000-8000-000000000803','guide','00000000-0000-4000-8000-000000000811','approve',''); raise exception 'Anonymous review accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: MVP catalogue publication, private queues, exam ownership, admin revocation and atomic review rollback/retries' as result;
do $$ declare relation text; begin
 foreach relation in array array['application_deadlines','banner_clicks','bursaries','educational_resources',
  'exam_schedule','feature_toggles','nbt_test_dates','opportunity_guides','pending_application_deadlines',
  'pending_opportunity_guides','pending_university_prospectuses','profiles','subjects','system_configuration',
  'universities','university_directory','university_prospectuses','user_consents'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=relation and c.relrowsecurity=true)
   or not exists(select 1 from pg_policies p where p.schemaname='public' and p.tablename=relation) then
   raise exception 'Historical RLS policy gap remains for %',relation; end if;
 end loop;
end $$;
