-- COO operations: least-privilege control plane, encrypted scheduler secret, daily scorecards.
-- Resend webhook signing secret must be provisioned separately in Supabase Vault.
create table if not exists public.coo_automation_settings (
 key text primary key,
 enabled boolean not null default false,
 daily_limit integer not null default 25 check(daily_limit between 1 and 25),
 autonomy text not null default 'routine' check(autonomy='routine'),
 updated_at timestamptz not null default now()
);
alter table public.coo_automation_settings enable row level security;
revoke all on public.coo_automation_settings from anon,authenticated;
insert into public.coo_automation_settings(key,enabled,daily_limit,autonomy)
values('tutor-onboarding',false,25,'routine') on conflict(key) do nothing;

create table if not exists public.coo_daily_reports(
 report_date date primary key,attempted integer not null default 0,
 accepted integer not null default 0,delivered integer not null default 0,
 bounced integer not null default 0,failed integer not null default 0,
 suppressed integer not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.coo_daily_reports enable row level security;
revoke all on public.coo_daily_reports from anon,authenticated;

do $setup$ begin
 if not exists(select 1 from vault.decrypted_secrets where name='smartbridge_coo_scheduler_token') then
  perform vault.create_secret(replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
   'smartbridge_coo_scheduler_token','Protected scheduler credential for autonomous COO onboarding');
 end if;
end $setup$;

create or replace function public.coo_scheduler_secret()
returns text language plpgsql security definer set search_path='' as $$
declare s text;
begin
 select decrypted_secret into s from vault.decrypted_secrets where name='smartbridge_coo_scheduler_token';
 if s is null then raise exception 'Job token missing'; end if;
 return s;
end $$;
revoke all on function public.coo_scheduler_secret() from public,anon,authenticated;
grant execute on function public.coo_scheduler_secret() to service_role;

create or replace function public.coo_resend_signing_secret()
returns text language plpgsql security definer set search_path='' as $$
declare s text;
begin
 select decrypted_secret into s from vault.decrypted_secrets where name='smartbridge_resend_signing_secret';
 if s is null then raise exception 'Signing secret missing'; end if;
 return s;
end $$;
revoke all on function public.coo_resend_signing_secret() from public,anon,authenticated;
grant execute on function public.coo_resend_signing_secret() to service_role;

create or replace function public.coo_reserve_email(
 p_tutor_id uuid,p_campaign text,p_recipient_email text,p_missing_fields text[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_count integer;
begin
 if p_campaign not in ('profile_48h','profile_72h') then raise exception 'invalid campaign'; end if;
 perform pg_advisory_xact_lock(hashtext('smartbridge_coo_email_daily'));
 if exists(select 1 from public.coo_tutor_email_log where tutor_id=p_tutor_id
           and created_at>now()-interval '72 hours') then return null; end if;
 select count(*) into v_count from public.coo_tutor_email_log
 where created_at >= (date_trunc('day',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg')
 and created_at < ((date_trunc('day',now() at time zone 'Africa/Johannesburg')+interval '1 day') at time zone 'Africa/Johannesburg');
 if v_count >= 25 then return null; end if;
 insert into public.coo_tutor_email_log(tutor_id,campaign,recipient_email,missing_fields)
 values(p_tutor_id,p_campaign,p_recipient_email,p_missing_fields)
 on conflict(tutor_id,campaign) do nothing returning id into v_id;
 return v_id;
end $$;
revoke all on function public.coo_reserve_email(uuid,text,text,text[]) from public,anon,authenticated;
grant execute on function public.coo_reserve_email(uuid,text,text,text[]) to service_role;

create or replace function smartbridge_private.capture_coo_daily_report()
returns void language plpgsql security definer set search_path='' as $$
declare d date;
begin
 d:=(now() at time zone 'Africa/Johannesburg')::date;
 insert into public.coo_daily_reports(report_date,attempted,accepted,delivered,bounced,failed,suppressed)
 select d,count(*)::integer,
 count(*) filter(where state='accepted')::integer,
 count(*) filter(where state='delivered')::integer,
 count(*) filter(where state='bounced')::integer,
 count(*) filter(where state='failed')::integer,
 count(*) filter(where state='suppressed')::integer
 from public.coo_tutor_email_log
 where (created_at at time zone 'Africa/Johannesburg')::date=d
 on conflict(report_date) do update set attempted=excluded.attempted,accepted=excluded.accepted,
 delivered=excluded.delivered,bounced=excluded.bounced,failed=excluded.failed,
 suppressed=excluded.suppressed,updated_at=now();
end $$;
revoke all on function smartbridge_private.capture_coo_daily_report() from public,anon,authenticated;

do $setup$ begin
 if not exists(select 1 from cron.job where jobname='smartbridge-coo-tutor-onboarding') then
  perform cron.schedule('smartbridge-coo-tutor-onboarding','0 7 * * *',
  $cron$
    select net.http_post(
      url:='https://bbhrnidzjeccggununzq.supabase.co/functions/v1/coo-tutor-onboarding',
      headers:=jsonb_build_object('Content-Type','application/json','x-coo-job-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='smartbridge_coo_scheduler_token')),
      body:='{"dry_run":false}'::jsonb,timeout_milliseconds:=15000
    );
  $cron$);
 end if;
 if not exists(select 1 from cron.job where jobname='smartbridge-coo-daily-board-report') then
  perform cron.schedule('smartbridge-coo-daily-board-report','50 21 * * *',
   $cron$select smartbridge_private.capture_coo_daily_report();$cron$);
 end if;
end $setup$;
