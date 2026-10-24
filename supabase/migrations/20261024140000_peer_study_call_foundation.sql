-- Learner peer study calls: database-enforced admission foundation.
-- Feature intentionally DISABLED until moderation, media signaling and device tests pass.
-- This schema does not reuse adult-only virtual_meetings permissions.
create table if not exists public.peer_study_calls (
 id uuid primary key default gen_random_uuid(),
 room_id text not null references public.study_rooms(id),
 host_id uuid not null references public.users(id),
 status text not null default 'waiting' check (status in ('waiting','active','ended')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '45 minutes'),
 ended_at timestamptz,
 check (expires_at <= created_at + interval '60 minutes')
);
create table if not exists public.peer_study_call_members (
 call_id uuid not null references public.peer_study_calls(id) on delete cascade,
 user_id uuid not null references public.users(id),
 joined_at timestamptz not null default now(),
 left_at timestamptz,
 primary key(call_id,user_id)
);
create index if not exists peer_study_calls_room on public.peer_study_calls(room_id,status,expires_at);
create index if not exists peer_study_call_members_user on public.peer_study_call_members(user_id,call_id);
alter table public.peer_study_calls enable row level security;
alter table public.peer_study_call_members enable row level security;
revoke all on public.peer_study_calls,public.peer_study_call_members from public,anon,authenticated;
grant select on public.peer_study_calls,public.peer_study_call_members to authenticated;

create or replace function smartbridge_private.peer_study_eligible(actor uuid, chosen_room text)
returns boolean language sql stable security definer set search_path='' as $$
 select actor=auth.uid() and exists(
  select 1 from public.users u
  join public.study_room_memberships m on m.user_id=u.id and m.room_id=chosen_room
  join public.study_rooms r on r.id=m.room_id and r.is_active
  where u.id=actor and u.role='student' and u.is_active and u.onboarding_complete
 );
$$;
revoke all on function smartbridge_private.peer_study_eligible(uuid,text) from public,anon;
grant execute on function smartbridge_private.peer_study_eligible(uuid,text) to authenticated;

create policy "Peer calls only visible to eligible members" on public.peer_study_calls
 for select to authenticated using(
  smartbridge_private.peer_study_eligible(auth.uid(),room_id)
  and exists(select 1 from public.peer_study_call_members cm where cm.call_id=id and cm.user_id=auth.uid() and cm.left_at is null)
 );
create policy "Peer call members only visible to call members" on public.peer_study_call_members
 for select to authenticated using(
  exists(select 1 from public.peer_study_calls c where c.id=call_id and smartbridge_private.peer_study_eligible(auth.uid(),c.room_id))
  and user_id=auth.uid()
 );

-- The flag is deliberately false; the RPC cannot create a session in production
-- until an explicit reviewed migration replaces this gate.
create or replace function public.request_peer_study_call(chosen_room text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 raise exception 'Peer study calls are not yet enabled; moderation and consent checks are required' using errcode='42501';
end;
$$;
revoke all on function public.request_peer_study_call(text) from public,anon;
grant execute on function public.request_peer_study_call(text) to authenticated;
comment on function public.request_peer_study_call(text) is 'Fail-closed placeholder. Do not enable without verified guardian consent, moderation and server-side signaling admission.';
