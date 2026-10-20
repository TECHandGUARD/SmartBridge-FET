-- Persist owned assessment drafts with optimistic concurrency and server deadlines.
alter table public.tutor_assessment_submissions add column draft_revision integer not null default 0;
create function smartbridge_private.assessment_draft(p_assessment uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.users where id=auth.uid() and role='student' and is_active and onboarding_complete) then raise exception 'Active learner account required';end if;
 select jsonb_build_object('answers',s.answers,'revision',s.draft_revision,'started_at',s.started_at,'deadline',least(a.due_at,coalesce(s.started_at+make_interval(mins=>a.time_limit_minutes),a.due_at)),'server_now',now()) into result
 from public.tutor_assessments a join public.tutor_assessment_submissions s on s.assessment_id=a.id
 where a.id=p_assessment and a.student_id=auth.uid() and s.student_id=auth.uid() and s.status='in_progress' and a.status='published';
 if result is null then raise exception 'Assessment draft unavailable';end if;
 return result;
end $$;
create function smartbridge_private.save_assessment_draft(p_assessment uuid,p_answers jsonb,p_revision integer) returns integer
language plpgsql security definer set search_path='' as $$
declare a public.tutor_assessments;s public.tutor_assessment_submissions;
begin
 if not exists(select 1 from public.users where id=auth.uid() and role='student' and is_active and onboarding_complete) then raise exception 'Active learner account required';end if;
 select * into a from public.tutor_assessments where id=p_assessment and student_id=auth.uid() and status='published' for update;
 select * into s from public.tutor_assessment_submissions where assessment_id=p_assessment and student_id=auth.uid() for update;
 if a.id is null or s.id is null or s.status<>'in_progress' or now()>a.due_at or (a.time_limit_minutes is not null and now()>s.started_at+make_interval(mins=>a.time_limit_minutes)) then raise exception 'Assessment deadline passed or already submitted';end if;
 if p_revision is distinct from s.draft_revision then raise exception 'Draft changed in another tab. Reopen the assessment before editing.';end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'object' or length(p_answers::text)>40000 or exists(select 1 from jsonb_each(p_answers) e where e.key !~ '^[0-9]{1,2}$' or jsonb_typeof(e.value)<>'string' or length(e.value#>>'{}')>10000) then raise exception 'Invalid or oversized answers';end if;
 if exists(select 1 from jsonb_object_keys(p_answers) k where k::integer>=jsonb_array_length(a.questions)) then raise exception 'Unknown question';end if;
 update public.tutor_assessment_submissions set answers=p_answers,draft_revision=draft_revision+1 where id=s.id;
 return s.draft_revision+1;
end $$;
create function public.assessment_draft(p_assessment uuid) returns jsonb language sql security invoker set search_path='' as $$select smartbridge_private.assessment_draft($1)$$;
create function public.save_assessment_draft(p_assessment uuid,p_answers jsonb,p_revision integer) returns integer language sql security invoker set search_path='' as $$select smartbridge_private.save_assessment_draft($1,$2,$3)$$;
revoke all on function public.assessment_draft(uuid),public.save_assessment_draft(uuid,jsonb,integer),smartbridge_private.assessment_draft(uuid),smartbridge_private.save_assessment_draft(uuid,jsonb,integer) from public,anon;
grant execute on function public.assessment_draft(uuid),public.save_assessment_draft(uuid,jsonb,integer),smartbridge_private.assessment_draft(uuid),smartbridge_private.save_assessment_draft(uuid,jsonb,integer) to authenticated;
-- New bookings use dated, active tutor-Pro subscriptions rather than a stale profile flag.
do $change$
declare original text;
begin
 select pg_get_functiondef('smartbridge_private.create_booking(uuid,text,date,text,numeric,text,uuid,boolean)'::regprocedure) into original;
 if position('select coalesce(is_premium,false) into pro from public.users where id=tutor.user_id;' in original)=0 then raise exception 'Booking benefit contract changed; review the migration';end if;
 original:=replace(original,'select coalesce(is_premium,false) into pro from public.users where id=tutor.user_id;',
 'select exists(select 1 from public.subscriptions s join public.users u on u.id=s.user_id where u.id=tutor.user_id and u.is_active=true and s.metadata->>''product''=''tutor_pro'' and s.plan=''premium'' and s.status=''active'' and s.start_date<=(now() at time zone ''Africa/Johannesburg'')::date and s.end_date>=(now() at time zone ''Africa/Johannesburg'')::date) into pro;');
 execute original;
end $change$;
-- One trigger serves three tables with different URL columns. JSON field access avoids
-- planning a NEW.file_url reference for tables that only have resource_url.
create or replace function public.invalidate_learning_knowledge() returns trigger
language plpgsql security definer set search_path='' as $$
declare field text;
begin
 if tg_op='DELETE' then
  delete from public.learning_knowledge_chunks where source_type=tg_argv[0] and source_id=old.id;
  return old;
 end if;
 foreach field in array array['resource_url','file_url','subject','grade','is_active','is_approved','is_rejected','is_archived'] loop
  if to_jsonb(new)->field is distinct from to_jsonb(old)->field then
   delete from public.learning_knowledge_chunks where source_type=tg_argv[0] and source_id=new.id;
   return new;
  end if;
 end loop;
 if to_jsonb(new)->'metadata'->>'sha256' is distinct from to_jsonb(old)->'metadata'->>'sha256' then
  delete from public.learning_knowledge_chunks where source_type=tg_argv[0] and source_id=new.id;
 end if;
 return new;
end $$;
create trigger invalidate_resource_knowledge after update or delete on public.resources for each row execute function public.invalidate_learning_knowledge('resources');
-- Repair a markdown-wrapped URL without changing the original publisher attribution.
update public.educational_resources set resource_url=substring(resource_url from '^\[(https://www\.siyavula\.com/[^]]+)\]\(https://www\.siyavula\.com/[^)]+\)$')
 where resource_url ~ '^\[https://www\.siyavula\.com/[^]]+\]\(https://www\.siyavula\.com/[^)]+\)$';
-- A native database schedule closes dated subscriptions even if the external job worker is off.
-- It sends no email. Other disabled jobs retain their existing configuration.
create function smartbridge_private.run_subscription_expiry() returns void language plpgsql security definer set search_path='' as $$
declare run_id uuid:=gen_random_uuid();started timestamptz:=clock_timestamp();
begin
 perform 1 from smartbridge_private.scheduled_jobs where key='subscriptions' and enabled for update skip locked;
 if not found then return;end if;
 insert into smartbridge_private.job_runs(id,key,status) values(run_id,'subscriptions','running');
 begin
  perform public.expire_paid_subscriptions();
  update smartbridge_private.job_runs set status='ok',finished_at=clock_timestamp() where id=run_id;
  update smartbridge_private.scheduled_jobs set last_started_at=started,last_finished_at=clock_timestamp(),last_status='ok' where key='subscriptions';
 exception when others then
  update smartbridge_private.job_runs set status='failed',finished_at=clock_timestamp() where id=run_id;
  update smartbridge_private.scheduled_jobs set last_started_at=started,last_finished_at=clock_timestamp(),last_status='failed' where key='subscriptions';
 end;
end $$;
revoke all on function smartbridge_private.run_subscription_expiry() from public,anon,authenticated;
do $$begin
 if exists(select 1 from pg_namespace where nspname='cron') then
  update smartbridge_private.scheduled_jobs set enabled=true,cron_expression='*/10 * * * *' where key='subscriptions';
  execute $schedule$select cron.schedule('smartbridge-subscription-expiry','*/10 * * * *','select smartbridge_private.run_subscription_expiry()')$schedule$;
 end if;
end $$;
