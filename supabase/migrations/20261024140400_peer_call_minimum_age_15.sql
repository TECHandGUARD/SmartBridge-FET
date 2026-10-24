-- Enforce minimum age 15 for peer study call eligibility.
create or replace function smartbridge_private.peer_call_has_guardian_grant(student uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from public.users u where u.id=student and u.role='student'
   and u.date_of_birth is not null
   and u.date_of_birth <= (current_date - interval '15 years')::date
   and (
    u.date_of_birth <= (current_date - interval '18 years')::date
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
