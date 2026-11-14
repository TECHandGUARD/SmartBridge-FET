-- Auditable administrator-initiated account deletion.
-- Deliberately has no FK to auth.users/public.users so the audit survives deletion.
create table if not exists public.admin_account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  target_email text not null,
  target_role text not null,
  reason text not null check (length(btrim(reason)) between 10 and 1000),
  outcome text not null default 'started' check (outcome in ('started','deleted','failed')),
  outcome_note text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists admin_account_deletion_audit_created_at_idx
  on public.admin_account_deletion_audit(created_at desc);
alter table public.admin_account_deletion_audit enable row level security;
revoke all on public.admin_account_deletion_audit from public, anon, authenticated;
grant select on public.admin_account_deletion_audit to authenticated;
drop policy if exists admin_account_deletion_audit_read on public.admin_account_deletion_audit;
create policy admin_account_deletion_audit_read
  on public.admin_account_deletion_audit
  for select to authenticated
  using (public.is_admin((select auth.uid())));
grant all on public.admin_account_deletion_audit to service_role;
comment on table public.admin_account_deletion_audit is
  'Immutable-identity audit trail for administrator initiated Auth account deletion. Target IDs/emails are retained for accountability; apply the company retention schedule and legal holds.';
