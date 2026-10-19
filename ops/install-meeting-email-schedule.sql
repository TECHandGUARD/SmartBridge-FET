-- Install only the meeting email worker after deploying dispatch-notifications and its migration.
-- No other application jobs are enabled by this script. No long-lived secret is required.
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- Supabase owns pg_net: REVOKE as postgres does not remove its PUBLIC grants.
-- Keep net out of the Data API exposed schemas. Trusted database login roles can
-- read queued headers; single-use credentials limit them to this meeting worker.
create or replace function smartbridge_private.enqueue_meeting_mail() returns bigint
language plpgsql security definer set search_path='' as $$
declare credential text;request bigint;project_url text;
begin
 -- Provision this non-secret setting for the intended project before installing the cron job.
 select value into project_url from smartbridge_private.meeting_mail_settings where key='project_url';
 if project_url is null or project_url !~ '^https://[a-z]{20}\.supabase\.co$' then raise exception 'Meeting worker project URL is not configured';end if;
 credential:=gen_random_uuid()::text||gen_random_uuid()::text;
 insert into smartbridge_private.meeting_mail_runs(token,expires_at) values(credential,now()+interval '5 minutes');
 select net.http_post(url:=project_url||'/functions/v1/dispatch-notifications',
  headers:=jsonb_build_object('Content-Type','application/json','x-meeting-job-token',credential),
  body:='{}'::jsonb,timeout_milliseconds:=60000) into request;
 update smartbridge_private.meeting_mail_runs set request_id=request where token=credential;
 delete from smartbridge_private.meeting_mail_runs where created_at<now()-interval '7 days';
 return request;
end $$;
revoke all on function smartbridge_private.enqueue_meeting_mail() from public,anon,authenticated,service_role;
select cron.schedule('smartbridge-meeting-emails','* * * * *','select smartbridge_private.enqueue_meeting_mail();');
