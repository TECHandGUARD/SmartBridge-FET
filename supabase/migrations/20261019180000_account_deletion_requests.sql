-- Secure, authenticated deletion-request intake. This does NOT erase user data automatically.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','reviewing','completed','rejected')),
  reviewed_at timestamptz,
  resolution_note text
);
create unique index if not exists one_open_account_deletion_request
  on public.account_deletion_requests(user_id) where status in ('pending','reviewing');
create index if not exists account_deletion_requests_requested_at_idx
  on public.account_deletion_requests(requested_at desc);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public,anon,authenticated;
grant select on public.account_deletion_requests to authenticated;
drop policy if exists account_deletion_request_read_own on public.account_deletion_requests;
create policy account_deletion_request_read_own on public.account_deletion_requests
  for select to authenticated using (user_id = (select auth.uid()));
create or replace function public.request_account_deletion()
returns uuid language plpgsql security definer set search_path = public,pg_temp as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode='28000'; end if;
  select id into v_id from public.account_deletion_requests
    where user_id=v_user and status in ('pending','reviewing') limit 1;
  if v_id is not null then return v_id; end if;
  insert into public.account_deletion_requests(user_id) values (v_user)
    on conflict do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.account_deletion_requests
    where user_id=v_user and status in ('pending','reviewing') limit 1;
  end if;
  return v_id;
end $$;
revoke all on function public.request_account_deletion() from public,anon;
grant execute on function public.request_account_deletion() to authenticated;
comment on table public.account_deletion_requests is
  'Manual verified deletion request queue. Admins must assess linked records, provider copies and statutory retention before deleting.';
