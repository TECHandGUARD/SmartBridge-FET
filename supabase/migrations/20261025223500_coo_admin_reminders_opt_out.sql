-- Admin-managed operational reminders; recipients can always stop future reminders.
create table if not exists public.coo_reminder_suppressions (
 tutor_id uuid primary key references public.users(id) on delete cascade,
 opted_out_at timestamptz not null default now(),
 source text not null default 'email_link'
);
create table if not exists public.coo_reminder_unsubscribe_tokens (
 token uuid primary key default gen_random_uuid(),
 tutor_id uuid not null references public.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists coo_unsubscribe_tutor_idx on public.coo_reminder_unsubscribe_tokens(tutor_id);
alter table public.coo_reminder_suppressions enable row level security;
alter table public.coo_reminder_unsubscribe_tokens enable row level security;
revoke all on public.coo_reminder_suppressions from anon, authenticated;
revoke all on public.coo_reminder_unsubscribe_tokens from anon, authenticated;

-- Allow service_role only to issue and redeem opaque opt-out links.
create or replace function public.coo_issue_unsubscribe_token(p_tutor_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;
begin
 insert into public.coo_reminder_unsubscribe_tokens(tutor_id) values(p_tutor_id)
 returning token into result;
 return result;
end $$;
revoke all on function public.coo_issue_unsubscribe_token(uuid) from public,anon,authenticated;
grant execute on function public.coo_issue_unsubscribe_token(uuid) to service_role;

create or replace function public.coo_redeem_unsubscribe_token(p_token uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_tutor uuid;
begin
 select tutor_id into v_tutor from public.coo_reminder_unsubscribe_tokens
 where token=p_token;
 if v_tutor is null then return false; end if;
 insert into public.coo_reminder_suppressions(tutor_id,source)
 values(v_tutor,'email_link')
 on conflict(tutor_id) do update set opted_out_at=now(),source='email_link';
 delete from public.coo_reminder_unsubscribe_tokens where tutor_id=v_tutor;
 update public.users set communication_preferences='none' where id=v_tutor;
 return true;
end $$;
revoke all on function public.coo_redeem_unsubscribe_token(uuid) from public,anon,authenticated;
grant execute on function public.coo_redeem_unsubscribe_token(uuid) to service_role;

-- Suppression is enforced in the atomic reservation, including concurrent cron runs.
create or replace function public.coo_reserve_email(
 p_tutor_id uuid,p_campaign text,p_recipient_email text,p_missing_fields text[]
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_count integer;v_pref text;
begin
 if p_campaign not in ('profile_48h','profile_72h') then raise exception 'invalid campaign'; end if;
 perform pg_advisory_xact_lock(hashtext('smartbridge_coo_email_daily'));
 select communication_preferences into v_pref from public.users where id=p_tutor_id and is_active=true;
 if not found or lower(coalesce(v_pref,'')) in ('none','off','disabled','unsubscribe','unsubscribed','no_email','opt_out') then return null; end if;
 if exists(select 1 from public.coo_reminder_suppressions where tutor_id=p_tutor_id) then return null; end if;
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