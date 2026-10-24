-- Explicit guardian authorization for minor learner study calls.
-- No client-side writes to grants; staff must verify parent/guardian relationship out of band.
create table if not exists public.peer_call_guardian_grants (
 student_id uuid not null references public.users(id),
 guardian_id uuid not null references public.users(id),
 verified_by uuid not null references public.users(id),
 granted_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 primary key(student_id,guardian_id),
 check(expires_at>granted_at and expires_at<=granted_at+interval '365 days')
);
alter table public.peer_call_guardian_grants enable row level security;
revoke all on public.peer_call_guardian_grants from public,anon,authenticated;
create or replace function smartbridge_private.peer_call_has_guardian_grant(student uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.users u where u.id=student and u.role='student'
   and u.date_of_birth is not null
   and (
     u.date_of_birth <= (current_date-interval '18 years')::date
     or exists (
       select 1 from public.peer_call_guardian_grants g
       join public.parent_student_links l on l.student_id=g.student_id and l.parent_id=g.guardian_id and l.status='approved'
       join public.users p on p.id=g.guardian_id and p.role='parent' and p.is_active
       where g.student_id=student and g.revoked_at is null and g.expires_at>now()
     )
   )
 );
$$;
revoke all on function smartbridge_private.peer_call_has_guardian_grant(uuid) from public,anon,authenticated;
-- This helper is used inside privileged admission checks, not exposed directly to the browser.
create or replace function smartbridge_private.peer_study_eligible(actor uuid, chosen_room text)
returns boolean language sql stable security definer set search_path='' as $$
 select actor=auth.uid() and smartbridge_private.peer_call_has_guardian_grant(actor) and exists(
  select 1 from public.users u
  join public.study_room_memberships m on m.user_id=u.id and m.room_id=chosen_room
  join public.study_rooms r on r.id=m.room_id and r.is_active
  where u.id=actor and u.role='student' and u.is_active and u.onboarding_complete
 );
$$;
revoke all on function smartbridge_private.peer_study_eligible(uuid,text) from public,anon;
grant execute on function smartbridge_private.peer_study_eligible(uuid,text) to authenticated;
-- The existing request_peer_study_call RPC remains disabled until moderator admission is implemented.
