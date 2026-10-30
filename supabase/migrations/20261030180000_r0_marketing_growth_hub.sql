-- SmartBridge FET R0 Marketing & Growth Hub
-- Draft only: review and test on an isolated database before any production execution.
begin;

-- Source metadata is optional so existing public enquiry forms remain compatible.
alter table public.tech_guard_leads
  add column if not exists source_channel text,
  add column if not exists campaign_slug text,
  add column if not exists source_detail text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='tech_guard_leads_source_channel_check') then
    alter table public.tech_guard_leads add constraint tech_guard_leads_source_channel_check
      check (source_channel is null or source_channel in ('whatsapp','facebook','instagram','tiktok','website','referral','other'));
  end if;
  if not exists (select 1 from pg_constraint where conname='tech_guard_leads_campaign_slug_check') then
    alter table public.tech_guard_leads add constraint tech_guard_leads_campaign_slug_check
      check (campaign_slug is null or campaign_slug ~ '^[a-z0-9][a-z0-9-]{2,79}$');
  end if;
  if not exists (select 1 from pg_constraint where conname='tech_guard_leads_source_detail_length_check') then
    alter table public.tech_guard_leads add constraint tech_guard_leads_source_detail_length_check
      check (source_detail is null or length(source_detail) <= 120);
  end if;
end $$;

create index if not exists tech_guard_leads_created_at_idx on public.tech_guard_leads(created_at desc);
create index if not exists tech_guard_leads_campaign_idx on public.tech_guard_leads(campaign_slug) where campaign_slug is not null;

-- Public users retain INSERT-only enquiry intake. Admins gain private read/update access.
drop policy if exists tech_guard_leads_admin_read on public.tech_guard_leads;
create policy tech_guard_leads_admin_read on public.tech_guard_leads
  for select to authenticated
  using (smartbridge_private.is_admin(auth.uid()) and smartbridge_private.enabled_account());

drop policy if exists tech_guard_leads_admin_update on public.tech_guard_leads;
create policy tech_guard_leads_admin_update on public.tech_guard_leads
  for update to authenticated
  using (smartbridge_private.is_admin(auth.uid()) and smartbridge_private.enabled_account())
  with check (smartbridge_private.is_admin(auth.uid()) and smartbridge_private.enabled_account());

-- Private append-only history: never expose lead messages or personal data to public clients.
create table if not exists smartbridge_private.tech_guard_lead_activity (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.tech_guard_leads(id) on delete cascade,
  actor_id uuid not null references public.users(id),
  activity_type text not null check (activity_type in ('status_changed','note_added')),
  old_status text,
  new_status text,
  note text,
  created_at timestamptz not null default now(),
  check (note is null or length(note) <= 2000),
  check ((activity_type='status_changed' and new_status in ('new','contacted','closed') and note is null)
      or (activity_type='note_added' and note is not null and old_status is null and new_status is null))
);
alter table smartbridge_private.tech_guard_lead_activity enable row level security;
revoke all on smartbridge_private.tech_guard_lead_activity from public, anon, authenticated;

create or replace function smartbridge_private.record_tech_guard_lead_activity(
  p_lead_id uuid, p_activity_type text, p_note text default null, p_new_status text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare prior_status text;
begin
  if not smartbridge_private.is_admin(auth.uid()) or not smartbridge_private.enabled_account() then
    raise exception 'Active full administrator required';
  end if;
  if p_activity_type not in ('status_changed','note_added') then raise exception 'Invalid activity type'; end if;
  if p_activity_type='note_added' then
    if p_note is null or length(p_note)>2000 then raise exception 'A note of at most 2000 characters is required'; end if;
    if not exists(select 1 from public.tech_guard_leads where id=p_lead_id) then raise exception 'Lead not found'; end if;
    insert into smartbridge_private.tech_guard_lead_activity(lead_id,actor_id,activity_type,note)
      values(p_lead_id,auth.uid(),'note_added',p_note);
    return;
  end if;
  if p_new_status not in ('new','contacted','closed') then raise exception 'Invalid lead status'; end if;
  select status into prior_status from public.tech_guard_leads where id=p_lead_id for update;
  if not found then raise exception 'Lead not found'; end if;
  update public.tech_guard_leads set status=p_new_status where id=p_lead_id;
  if prior_status is distinct from p_new_status then
    insert into smartbridge_private.tech_guard_lead_activity(lead_id,actor_id,activity_type,old_status,new_status)
      values(p_lead_id,auth.uid(),'status_changed',prior_status,p_new_status);
  end if;
end $$;
revoke all on function smartbridge_private.record_tech_guard_lead_activity(uuid,text,text,text) from public,anon,authenticated;
grant execute on function smartbridge_private.record_tech_guard_lead_activity(uuid,text,text,text) to authenticated;

create or replace function public.manage_tech_guard_lead(
  p_lead_id uuid, p_activity_type text, p_note text default null, p_new_status text default null
) returns void language sql security invoker set search_path='' as $$
  select smartbridge_private.record_tech_guard_lead_activity($1,$2,$3,$4);
$$;
revoke all on function public.manage_tech_guard_lead(uuid,text,text,text) from public,anon;
grant execute on function public.manage_tech_guard_lead(uuid,text,text,text) to authenticated;

create or replace function public.tech_guard_lead_activity(p_lead_id uuid)
returns table(id bigint, activity_type text, old_status text, new_status text, note text, created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
  if not smartbridge_private.is_admin(auth.uid()) or not smartbridge_private.enabled_account() then
    raise exception 'Active full administrator required';
  end if;
  return query select a.id,a.activity_type,a.old_status,a.new_status,a.note,a.created_at
    from smartbridge_private.tech_guard_lead_activity a
    where a.lead_id=p_lead_id order by a.created_at desc limit 100;
end $$;
revoke all on function public.tech_guard_lead_activity(uuid) from public,anon;
grant execute on function public.tech_guard_lead_activity(uuid) to authenticated;

-- Founder-controlled operating guardrail. Budget is fixed at zero until the
-- super-admin explicitly records a future approval. No payment or ad platform
-- integration is activated by this setting.
create table if not exists smartbridge_private.marketing_budget_control (
  id boolean primary key default true check (id=true),
  monthly_budget_zar numeric(12,2) not null default 0 check (monthly_budget_zar >= 0),
  paid_campaigns_enabled boolean not null default false,
  approved_by uuid references public.users(id),
  approved_at timestamptz,
  approval_note text,
  updated_at timestamptz not null default now(),
  check (
    (monthly_budget_zar=0 and paid_campaigns_enabled=false)
    or (monthly_budget_zar>0 and paid_campaigns_enabled=true and approved_by is not null and approved_at is not null and length(btrim(coalesce(approval_note,'')))>=10)
  )
);
insert into smartbridge_private.marketing_budget_control(id) values(true) on conflict(id) do nothing;
alter table smartbridge_private.marketing_budget_control enable row level security;
revoke all on smartbridge_private.marketing_budget_control from public,anon,authenticated;

create or replace function public.get_marketing_budget_control()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not smartbridge_private.is_admin(auth.uid()) or not smartbridge_private.enabled_account() then
    raise exception 'Active full administrator required';
  end if;
  select jsonb_build_object('monthly_budget_zar',monthly_budget_zar,'paid_campaigns_enabled',paid_campaigns_enabled,
    'approved_by',approved_by,'approved_at',approved_at,'approval_note',approval_note,'updated_at',updated_at)
    into result from smartbridge_private.marketing_budget_control where id=true;
  return result;
end $$;

create or replace function public.set_marketing_budget_control(
  p_monthly_budget_zar numeric, p_paid_campaigns_enabled boolean, p_approval_note text default null
) returns void language plpgsql security definer set search_path='' as $$
begin
  if not smartbridge_private.is_admin(auth.uid()) or not smartbridge_private.enabled_account() then
    raise exception 'Active full administrator required';
  end if;
  if p_monthly_budget_zar is null or p_monthly_budget_zar<0 or p_monthly_budget_zar>1000000 then
    raise exception 'Budget must be between R0 and R1,000,000';
  end if;
  if p_monthly_budget_zar=0 then
    if p_paid_campaigns_enabled is distinct from false then raise exception 'Paid campaigns must remain disabled at R0'; end if;
    update smartbridge_private.marketing_budget_control
      set monthly_budget_zar=0,paid_campaigns_enabled=false,approved_by=null,approved_at=null,approval_note=null,updated_at=now()
      where id=true;
    return;
  end if;
  -- Only a full super-admin may approve a non-zero budget, and a reason is mandatory.
  if not p_paid_campaigns_enabled or length(btrim(coalesce(p_approval_note,'')))<10 then
    raise exception 'Paid activation requires an explicit approval note and enabled flag';
  end if;
  update smartbridge_private.marketing_budget_control
    set monthly_budget_zar=p_monthly_budget_zar,paid_campaigns_enabled=true,
      approved_by=auth.uid(),approved_at=now(),approval_note=btrim(p_approval_note),updated_at=now()
    where id=true;
end $$;
revoke all on function public.get_marketing_budget_control(),public.set_marketing_budget_control(numeric,boolean,text) from public,anon;
grant execute on function public.get_marketing_budget_control(),public.set_marketing_budget_control(numeric,boolean,text) to authenticated;

commit;
