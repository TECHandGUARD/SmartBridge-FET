-- RECONSTRUCTION NOTICE (2026-10-31):
-- Original executed SQL was not recovered from repository history.
-- Recreates the current live review-audit table shape and access policy.
-- The live catalog contains no audit-writing trigger or RPC; this migration does not invent one.
create table if not exists public.ai_executive_training_audit (
 id bigint not null primary key,
 training_id uuid not null references public.ai_executive_training(id),
 actor_id uuid not null references public.users(id),
 old_status text not null,
 new_status text not null,
 created_at timestamptz not null default now()
);
alter table public.ai_executive_training_audit enable row level security;
revoke all on public.ai_executive_training_audit from public,anon,authenticated;
grant select on public.ai_executive_training_audit to authenticated;
grant all on public.ai_executive_training_audit to service_role;

create policy "admin audit read" on public.ai_executive_training_audit
 for select to authenticated using (
  exists(select 1 from public.users u where u.id=(select auth.uid()) and u.role='admin' and u.is_active=true)
);
comment on table public.ai_executive_training_audit is
 'Catalog-derived reconstruction of the live review audit table. The live catalog currently has no writer trigger/RPC; do not treat this table as a functioning audit trail.';
