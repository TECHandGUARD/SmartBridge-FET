-- Aggregated, read-only executive operating indicators. No identities, learner content, or financial amounts.
create or replace function public.ai_board_operating_snapshot()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not smartbridge_private.is_admin(auth.uid()) then
  raise exception 'Administrator access required' using errcode='42501';
 end if;
 return jsonb_build_object(
  'captured_at',now(),
  'active_learners',(select count(*) from public.users where role='student' and is_active),
  'active_tutors',(select count(*) from public.tutor_profiles where is_active and is_verified),
  'pending_tutors',(select count(*) from public.tutor_profiles where not is_verified),
  'bookings_30d',(select count(*) from public.tutor_bookings where created_at>=now()-interval '30 days'),
  'active_study_sessions_30d',(select count(*) from public.study_sessions where is_active and created_at>=now()-interval '30 days')
 );
end $$;
revoke all on function public.ai_board_operating_snapshot() from public,anon;
grant execute on function public.ai_board_operating_snapshot() to authenticated;
