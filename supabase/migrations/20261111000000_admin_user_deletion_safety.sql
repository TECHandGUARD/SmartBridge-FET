-- Admin account deletion safety checks.
-- This function is callable only by service_role and is invoked by the
-- admin-manage-user Edge Function after it has authenticated the super-admin.
create or replace function public.admin_user_deletion_blockers(
  p_user_id uuid,
  p_user_email text
)
returns text[]
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  ref record;
  has_reference boolean;
  blockers text[] := array[]::text[];
begin
  for ref in
    select * from (values
    ('account_deletion_requests','user_id','id'),
    ('adult_call_push_subscriptions','user_id','id'),
    ('application_documents','student_email','email'),
    ('banner_clicks','user_id','id'),
    ('banner_clicks','user_email','email'),
    ('legal_acceptances','user_id','id'),
    ('payment_orders','user_id','id'),
    ('peer_study_call_members','user_id','id'),
    ('presentation_decks','owner_id','id'),
    ('resource_bookmarks','user_id','id'),
    ('resource_bookmarks','user_email','email'),
    ('resource_ratings','user_id','id'),
    ('resource_ratings','user_email','email'),
    ('staff_accounts','user_id','id'),
    ('student_notes','student_email','email'),
    ('student_notes','tutor_email','email'),
    ('subscriptions','user_id','id'),
    ('subscriptions','user_email','email'),
    ('study_room_memberships','user_id','id'),
    ('study_room_reactions','user_id','id'),
    ('tutor_availability','tutor_email','email'),
    ('tutor_bookings','student_email','email'),
    ('tutor_bookings','tutor_email','email'),
    ('tutor_directory','user_id','id'),
    ('tutor_directory','user_email','email'),
    ('tutor_payouts','tutor_email','email'),
    ('tutor_profiles','user_id','id'),
    ('tutor_profiles','user_email','email'),
    ('tutor_reviews','student_email','email'),
    ('tutor_reviews','tutor_email','email'),
    ('user_consents','user_id','id'),
    ('virtual_meeting_participants','user_id','id'),
    ('ai_executive_training','created_by','id'),
    ('application_deadlines','created_by','id'),
    ('application_documents','student_id','id'),
    ('application_documents','created_by','id'),
    ('bursaries','created_by','id'),
    ('caps_documents','created_by','id'),
    ('chat_messages','sender_id','id'),
    ('classroom_signals','sender_id','id'),
    ('counselor_student_links','student_id','id'),
    ('direct_messages','sender_id','id'),
    ('discussion_answers','author_id','id'),
    ('discussion_posts','author_id','id'),
    ('exam_schedule','student_id','id'),
    ('exam_schedule','created_by','id'),
    ('forum_comments','author_id','id'),
    ('forum_posts','author_id','id'),
    ('instant_adult_call_signals','sender_id','id'),
    ('legal_documents','owner_user_id','id'),
    ('lesson_plans','student_id','id'),
    ('lesson_plans','tutor_id','id'),
    ('nbt_planner_progress','student_id','id'),
    ('nbt_registrations','student_id','id'),
    ('nbt_registrations','created_by','id'),
    ('nbt_test_dates','created_by','id'),
    ('opportunity_guides','created_by','id'),
    ('parent_student_links','parent_id','id'),
    ('parent_student_links','student_id','id'),
    ('peer_call_age_verifications','student_id','id'),
    ('peer_call_guardian_grants','student_id','id'),
    ('peer_study_call_signals','sender_id','id'),
    ('pending_application_deadlines','created_by','id'),
    ('pending_opportunity_guides','created_by','id'),
    ('pending_university_prospectuses','created_by','id'),
    ('platform_announcements','created_by','id'),
    ('quiz_results','student_id','id'),
    ('quizzes','created_by','email'),
    ('resources','tutor_id','id'),
    ('school_counselors','created_by','id'),
    ('sponsorship_allocations','student_id','id'),
    ('sponsorship_allocations','created_by','id'),
    ('sponsorship_programmes','created_by','id'),
    ('student_notes','student_id','id'),
    ('student_notes','tutor_id','id'),
    ('student_progress','student_id','id'),
    ('student_progress','created_by','id'),
    ('study_progress','student_id','id'),
    ('study_progress','created_by','id'),
    ('study_reminders','student_id','id'),
    ('study_reminders','created_by','id'),
    ('study_room_posts','author_id','id'),
    ('study_room_posts','created_by','id'),
    ('study_room_replies','author_id','id'),
    ('study_sessions','student_id','id'),
    ('study_sessions','created_by','id'),
    ('subjects','created_by','id'),
    ('subscriptions','created_by','id'),
    ('syllabus_progress','student_id','id'),
    ('tutor_assessment_submissions','student_id','id'),
    ('tutor_assessments','tutor_id','id'),
    ('tutor_assessments','student_id','id'),
    ('tutor_availability','tutor_id','id'),
    ('tutor_availability','tutor_profile_id','id'),
    ('tutor_availability','created_by','id'),
    ('tutor_bookings','student_id','id'),
    ('tutor_bookings','tutor_id','id'),
    ('tutor_bookings','tutor_profile_id','id'),
    ('tutor_bookings','created_by','id'),
    ('tutor_payouts','tutor_id','id'),
    ('tutor_payouts','tutor_profile_id','id'),
    ('tutor_payouts','created_by','id'),
    ('tutor_profiles','created_by','id'),
    ('tutor_reviews','tutor_id','id'),
    ('tutor_reviews','student_id','id'),
    ('tutor_reviews','tutor_profile_id','id'),
    ('university_applications','student_id','id'),
    ('university_applications','created_by','id'),
    ('university_prospectuses','created_by','id'),
    ('video_lessons','tutor_id','id'),
    ('video_lessons','created_by','id'),
    ('virtual_meeting_signals','sender_id','id'),
    ('weekly_goals','student_id','id'),
    ('weekly_goals','created_by','id'),
    ('coo_reminder_suppressions','tutor_id','id'),
    ('coo_reminder_unsubscribe_tokens','tutor_id','id'),
    ('coo_tutor_email_log','tutor_id','id'),
    ('exam_schedule','student_email','email'),
    ('legal_documents','created_by','id'),
    ('lesson_plans','tutor_email','email'),
    ('lesson_plans','student_email','email'),
    ('nbt_planner_progress','student_email','email'),
    ('nbt_registrations','student_email','email'),
    ('quiz_results','student_email','email'),
    ('resources','tutor_email','email'),
    ('student_progress','student_email','email'),
    ('study_progress','student_email','email'),
    ('study_progress','user_email','email'),
    ('study_reminders','student_email','email'),
    ('study_sessions','student_email','email'),
    ('syllabus_progress','student_email','email'),
    ('university_applications','student_email','email'),
    ('video_lessons','tutor_email','email'),
    ('weekly_goals','student_email','email'),
    ('school_counselors','student_emails','email_array')
    ) as refs(table_name, column_name, value_kind)
  loop
    if to_regclass(format('public.%I', ref.table_name)) is null then
      raise exception 'Deletion dependency table is missing: %', ref.table_name;
    end if;
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = ref.table_name
        and column_name = ref.column_name
    ) then
      raise exception 'Deletion dependency column is missing: %.%', ref.table_name, ref.column_name;
    end if;

    if ref.value_kind = 'id' then
      execute format('select exists (select 1 from public.%I where %I = $1)', ref.table_name, ref.column_name)
        into has_reference using p_user_id;
    elsif ref.value_kind = 'email' then
      execute format('select exists (select 1 from public.%I where %I = $1)', ref.table_name, ref.column_name)
        into has_reference using p_user_email;
    elsif ref.value_kind = 'email_array' then
      execute format('select exists (select 1 from public.%I where %I @> array[$1]::text[])', ref.table_name, ref.column_name)
        into has_reference using p_user_email;
    else
      raise exception 'Unknown deletion dependency type: %', ref.value_kind;
    end if;

    if has_reference and not (ref.table_name = any(blockers)) then
      blockers := array_append(blockers, ref.table_name);
    end if;
  end loop;
  return blockers;
end;
$$;

revoke all on function public.admin_user_deletion_blockers(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_user_deletion_blockers(uuid, text) to service_role;
comment on function public.admin_user_deletion_blockers(uuid, text) is
  'Internal fail-closed dependency check for super-admin account deletion. Invoke only from the admin-manage-user Edge Function.';
