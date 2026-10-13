-- Run on the approved staging target AFTER migration six and function deployment.
-- Configure Vault secrets beforehand: smartbridge_project_url, smartbridge_job_secret,
-- smartbridge_publishable_key. Match the job secret to JOB_AUTH_SECRET in Edge secrets.
-- Job definitions remain disabled until explicitly enabled from Admin → Operations.
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Queue headers contain the job secret. Keep transport internals inaccessible
-- to browser roles, including grants inherited through PUBLIC.
revoke all on table net.http_request_queue,net._http_response from public,anon,authenticated;
revoke all on all sequences in schema net from public,anon,authenticated;
create table if not exists smartbridge_private.job_dispatches(request_id bigint primary key,job_key text not null,queued_at timestamptz not null default now(),monitored_at timestamptz);
alter table smartbridge_private.job_dispatches enable row level security;
revoke all on smartbridge_private.job_dispatches from public,anon,authenticated;
create or replace function smartbridge_private.enqueue_scheduled_job(chosen_key text) returns bigint language plpgsql security definer set search_path='' as $$
declare project_url text;job_secret text;public_key text;request_id bigint;
begin
 if not exists(select 1 from smartbridge_private.scheduled_jobs where key=chosen_key and enabled=true) then return null;end if;
 select decrypted_secret into project_url from vault.decrypted_secrets where name='smartbridge_project_url';
 select decrypted_secret into job_secret from vault.decrypted_secrets where name='smartbridge_job_secret';
 select decrypted_secret into public_key from vault.decrypted_secrets where name='smartbridge_publishable_key';
 if project_url is null or project_url !~ '^https://[a-z]{20}\.supabase\.co$' or length(coalesce(job_secret,''))<32 or public_key is null then raise exception 'Configure approved scheduler Vault settings';end if;
 select net.http_post(url:=project_url||'/functions/v1/run-scheduled-job',headers:=jsonb_build_object('Content-Type','application/json','x-job-secret',job_secret,'apikey',public_key),body:=jsonb_build_object('job_key',chosen_key),timeout_milliseconds:=65000) into request_id;
 insert into smartbridge_private.job_dispatches(request_id,job_key) values(request_id,chosen_key);return request_id;
end;$$;
revoke all on function smartbridge_private.enqueue_scheduled_job(text) from public,anon,authenticated;
create or replace function smartbridge_private.collect_job_delivery_failures() returns void language plpgsql security definer set search_path='' as $$
declare dispatch record;result record;
begin
 for dispatch in select * from smartbridge_private.job_dispatches where monitored_at is null and queued_at<now()-interval '2 minutes' loop
  select status_code,timed_out,error_msg into result from net._http_response where id=dispatch.request_id;
  if not found or result.timed_out or result.error_msg is not null or result.status_code>=400 then
   insert into smartbridge_private.operational_events(source,code,http_status) values('job','delivery_'||dispatch.job_key,result.status_code);
  end if;
  update smartbridge_private.job_dispatches set monitored_at=now() where request_id=dispatch.request_id;
 end loop;
 delete from smartbridge_private.job_dispatches where queued_at<now()-interval '30 days';
end;$$;
revoke all on function smartbridge_private.collect_job_delivery_failures() from public,anon,authenticated;
do $$ declare job record;begin
 for job in select key,cron_expression from smartbridge_private.scheduled_jobs loop
  perform cron.schedule('smartbridge-'||job.key,job.cron_expression,format('select smartbridge_private.enqueue_scheduled_job(%L);',job.key));
 end loop;
 perform cron.schedule('smartbridge-delivery-monitor','*/5 * * * *','select smartbridge_private.collect_job_delivery_failures();');
end;$$;
