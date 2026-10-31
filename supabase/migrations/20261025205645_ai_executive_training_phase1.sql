-- RECONSTRUCTION NOTICE (2026-10-31):
-- Original executed SQL was not recovered from repository history.
-- This migration recreates the current live catalog shape and RLS behavior.
-- It is a schema-equivalent reconstruction, not a claim to reproduce the original SQL.
create table if not exists public.ai_executive_training (
 id uuid primary key default gen_random_uuid(),
 executive text not null check (executive in ('CEO','COO','CFO','CMO','CIO','General Manager')),
 instruction text not null check (char_length(trim(instruction)) between 10 and 6000),
 status text not null default 'draft' check (status in ('draft','approved','withdrawn')),
 version integer not null default 1,
 created_by uuid not null references public.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.ai_executive_training enable row level security;
revoke all on public.ai_executive_training from public,anon,authenticated;
grant select,insert,update on public.ai_executive_training to authenticated;
grant all on public.ai_executive_training to service_role;

create policy "admins read executive training" on public.ai_executive_training
 for select to authenticated using (
  exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin' and u.is_active=true)
);
create policy "admins create own draft training" on public.ai_executive_training
 for insert to authenticated with check (
  created_by=(select auth.uid()) and status='draft' and version=1
  and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin' and u.is_active=true)
);
create policy "admins update draft training" on public.ai_executive_training
 for update to authenticated
 using (
  status='draft' and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin' and u.is_active=true)
 )
 with check (
  status='draft' and exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin' and u.is_active=true)
 );

comment on table public.ai_executive_training is
 'Founder-controlled executive instruction drafts. Catalog-derived migration reconstruction; drafts do not activate model behavior.';
