-- Moderator-controlled peer-call admission and explicit age-verification attestations.
-- Calls remain disabled until peer signaling and moderation UI are reviewed.
create table if not exists public.peer_call_age_verifications (
 student_id uuid primary key references public.users(id),
 verified_by uuid not null references public.users(id),
 verified_at timestamptz not null default now(),
 expires_at timestamptz not null,
 revoked_at timestamptz,
 method text not null check(method in ('trusted_provider','manual_document_review')),
 check(expires_at>verified_at and expires_at<=verified_at+interval '365 days')
);
create table if not exists public.peer_call_moderators (
 room_id text not null references public.study_rooms(id),
 moderator_id uuid not null references public.users(id),
 assigned_by uuid not null references public.users(id),
 assigned_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(room_id,moderator_id)
);
alter table public.peer_call_age_verifications enable row level security;
alter table public.peer_call_moderators enable row level security;
revoke all on public.peer_call_age_verifications,public.peer_call_moderators from public,anon,authenticated;

create or replace function smartbridge_private.peer_call_verified_age(student uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.peer_call_age_verifications v
  join public.users u on u.id=v.student_id
  where v.student_id=student and v.revoked_at is null and v.expires_at>now()
   and u.date_of_birth is not null
   and u.date_of_birth <= (current_date-interval '15 years')::date
 );
$$;
revoke all on function smartbridge_private.peer_call_verified_age(uuid) from public,anon,authenticated;

create or replace function smartbridge_private.peer_study_eligible(actor uuid,chosen_room text)
returns boolean language sql stable security definer set search_path='' as $$
 select actor=auth.uid()
  and smartbridge_private.peer_call_verified_age(actor)
  and smartbridge_private.peer_call_has_guardian_grant(actor)
  and exists(
   select 1 from public.users u
   join public.study_room_memberships m on m.user_id=u.id and m.room_id=chosen_room
   join public.study_rooms r on r.id=m.room_id and r.is_active
   where u.id=actor and u.role='student' and u.is_active and u.onboarding_complete
  );
$$;
revoke all on function smartbridge_private.peer_study_eligible(uuid,text) from public,anon;
grant execute on function smartbridge_private.peer_study_eligible(uuid,text) to authenticated;

create or replace function smartbridge_private.peer_call_moderator_available(chosen_room text)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.peer_call_moderators m
  join public.users u on u.id=m.moderator_id
  where m.room_id=chosen_room and m.revoked_at is null and u.is_active and u.onboarding_complete
   and (u.role='admin' or u.is_super_admin or (
     u.role in ('tutor','sace_tutor','student_tutor') and exists(
      select 1 from public.tutor_profiles t where t.user_id=u.id and t.is_verified and t.is_active
     )
   ))
 );
$$;
revoke all on function smartbridge_private.peer_call_moderator_available(text) from public,anon,authenticated;

-- Explicit admission gate. This cannot be bypassed through table writes.
create or replace function public.request_peer_study_call(chosen_room text)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if not smartbridge_private.peer_study_eligible(auth.uid(),chosen_room) then
  raise exception 'Learner age, guardian consent, or room eligibility verification is required' using errcode='42501';
 end if;
 if not smartbridge_private.peer_call_moderator_available(chosen_room) then
  raise exception 'An approved study-room moderator must be assigned' using errcode='42501';
 end if;
 raise exception 'Study calling remains disabled until moderator presence and signaling admission are enabled' using errcode='42501';
end;
$$;
revoke all on function public.request_peer_study_call(text) from public,anon;
grant execute on function public.request_peer_study_call(text) to authenticated;
