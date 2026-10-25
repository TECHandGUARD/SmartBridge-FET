-- COO onboarding audit and atomic send reservations (do not grant direct client access)
create table if not exists public.coo_tutor_email_log (
 id uuid primary key default gen_random_uuid(),
 tutor_id uuid not null references public.users(id) on delete cascade,
 campaign text not null check (campaign in ('profile_48h','profile_72h')),
 recipient_email text not null,
 state text not null default 'reserved' check (state in ('reserved','accepted','delivered','bounced','failed','suppressed')),
 provider_id text unique,
 missing_fields text[] not null default '{}',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(tutor_id,campaign)
);
create index if not exists coo_tutor_email_log_created_idx on public.coo_tutor_email_log(created_at);
alter table public.coo_tutor_email_log enable row level security;
revoke all on public.coo_tutor_email_log from anon,authenticated;
-- Transactionally enforce one send per tutor/campaign and <=25/day in Africa/Johannesburg.
create or replace function public.coo_reserve_email(
 p_tutor_id uuid,p_campaign text,p_recipient_email text,p_missing_fields text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count integer;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception 'service role required';
 end if;
 if p_campaign not in ('profile_48h','profile_72h') then raise exception 'invalid campaign'; end if;
 perform pg_advisory_xact_lock(hashtext('smartbridge_coo_email_daily'));
 select count(*) into v_count from public.coo_tutor_email_log
  where created_at >= (date_trunc('day',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg')
    and created_at < ((date_trunc('day',now() at time zone 'Africa/Johannesburg')+interval '1 day') at time zone 'Africa/Johannesburg');
 if v_count >= 25 then return null; end if;
 insert into public.coo_tutor_email_log(tutor_id,campaign,recipient_email,missing_fields)
 values (p_tutor_id,p_campaign,p_recipient_email,p_missing_fields)
 on conflict(tutor_id,campaign) do nothing returning id into v_id;
 return v_id;
end $$;
revoke all on function public.coo_reserve_email(uuid,text,text,text[]) from public,anon,authenticated;
grant execute on function public.coo_reserve_email(uuid,text,text,text[]) to service_role;
