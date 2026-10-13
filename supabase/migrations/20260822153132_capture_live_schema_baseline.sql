-- Schema-only baseline captured 13 October 2026; no customer records or secrets.
-- Ordered after the recovered website migration and before the repair migrations.
-- Existing matching production schema is validated and left unchanged.
-- Fresh databases must apply the subsequent security repairs before accepting users.
do $baseline$ begin
if to_regclass('public.users') is not null then
 if exists(select 1 from (values ('activity_log','id','uuid'),('activity_log','event_type','text'),('activity_log','user_email','text'),('activity_log','description','text'),('activity_log','metadata','jsonb'),('activity_log','user_id','uuid'),('activity_log','ip_address','inet'),('activity_log','user_agent','text'),('activity_log','created_at','timestamp with time zone'),('activity_log','updated_at','timestamp with time zone'),('application_documents','id','uuid'),('application_documents','application_id','text'),('application_documents','student_email','text'),('application_documents','university_name','text'),('application_documents','doc_type','text'),('application_documents','file_url','text'),('application_documents','file_name','text'),('application_documents','status','text'),('application_documents','notes','text'),('application_documents','student_id','uuid'),('application_documents','uploaded_at','timestamp with time zone'),('application_documents','submitted_at','timestamp with time zone'),('application_documents','verified_at','timestamp with time zone'),('application_documents','rejected_at','timestamp with time zone'),('application_documents','rejected_reason','text'),('application_documents','metadata','jsonb'),('application_documents','created_by','uuid'),('application_documents','updated_by','uuid'),('application_documents','created_at','timestamp with time zone'),('application_documents','updated_at','timestamp with time zone'),('banner_clicks','id','uuid'),('banner_clicks','banner_name','text'),('banner_clicks','user_email','text'),('banner_clicks','user_id','uuid'),('banner_clicks','click_timestamp','timestamp with time zone'),('banner_clicks','ip_address','inet'),('banner_clicks','user_agent','text'),('banner_clicks','referrer','text'),('banner_clicks','metadata','jsonb'),('banner_clicks','created_at','timestamp with time zone'),('banner_clicks','updated_at','timestamp with time zone'),('exam_schedule','id','uuid'),('exam_schedule','student_email','text'),('exam_schedule','subject','text'),('exam_schedule','grade','text'),('exam_schedule','exam_date','date'),('exam_schedule','exam_type','text'),('exam_schedule','notes','text'),('exam_schedule','student_id','uuid'),('exam_schedule','exam_time','time without time zone'),('exam_schedule','exam_duration_minutes','integer'),('exam_schedule','venue','text'),('exam_schedule','venue_address','text'),('exam_schedule','exam_code','text'),('exam_schedule','total_marks','integer'),('exam_schedule','weight_percentage','numeric(5,2)'),('exam_schedule','is_published','boolean'),('exam_schedule','published_date','timestamp with time zone'),('exam_schedule','is_completed','boolean'),('exam_schedule','completed_at','timestamp with time zone'),('exam_schedule','results_available','boolean'),('exam_schedule','results_published_at','timestamp with time zone'),('exam_schedule','score','numeric(5,2)'),('exam_schedule','metadata','jsonb'),('exam_schedule','created_by','uuid'),('exam_schedule','updated_by','uuid'),('exam_schedule','created_at','timestamp with time zone'),('exam_schedule','updated_at','timestamp with time zone'),('bursaries','id','uuid'),('bursaries','name','text'),('bursaries','provider','text'),('bursaries','description','text'),('bursaries','apply_link','text'),('bursaries','fields_of_study','text[]'),('bursaries','max_household_income','numeric(15,2)'),('bursaries','min_average','numeric(5,2)'),('bursaries','covers','text'),('bursaries','deadline','date'),('bursaries','is_active','boolean'),('bursaries','provinces','text[]'),('bursaries','logo_url','text'),('bursaries','contact_email','text'),('bursaries','contact_phone','text'),('bursaries','website','text'),('bursaries','application_fee','numeric(10,2)'),('bursaries','requires_interview','boolean'),('bursaries','requires_essay','boolean'),('bursaries','requires_recommendations','boolean'),('bursaries','academic_year','integer'),('bursaries','total_funding_amount','numeric(15,2)'),('bursaries','number_of_awards','integer'),('bursaries','target_citizenship','text'),('bursaries','metadata','jsonb'),('bursaries','created_by','uuid'),('bursaries','updated_by','uuid'),('bursaries','created_at','timestamp with time zone'),('bursaries','updated_at','timestamp with time zone'),('feature_toggles','id','uuid'),('feature_toggles','feature_key','text'),('feature_toggles','label','text'),('feature_toggles','description','text'),('feature_toggles','is_enabled','boolean'),('feature_toggles','locked_message','text'),('feature_toggles','disabled_for_emails','text[]'),('feature_toggles','enabled_for_emails','text[]'),('feature_toggles','feature_category','text'),('feature_toggles','environment','text'),('feature_toggles','audience_percentage','integer'),('feature_toggles','rollout_started_at','timestamp with time zone'),('feature_toggles','rollout_completed_at','timestamp with time zone'),('feature_toggles','updated_by','uuid'),('feature_toggles','metadata','jsonb'),('feature_toggles','created_at','timestamp with time zone'),('feature_toggles','updated_at','timestamp with time zone'),('opportunity_guides','id','uuid'),('opportunity_guides','title','text'),('opportunity_guides','description','text'),('opportunity_guides','file_url','text'),('opportunity_guides','category','text'),('opportunity_guides','icon','text'),('opportunity_guides','file_name','text'),('opportunity_guides','file_size_bytes','bigint'),('opportunity_guides','file_type','text'),('opportunity_guides','file_extension','text'),('opportunity_guides','is_active','boolean'),('opportunity_guides','is_featured','boolean'),('opportunity_guides','is_pending','boolean'),('opportunity_guides','pending_approval_by','uuid'),('opportunity_guides','approved_by','uuid'),('opportunity_guides','approved_at','timestamp with time zone'),('opportunity_guides','published_date','timestamp with time zone'),('opportunity_guides','download_count','integer'),('opportunity_guides','view_count','integer'),('opportunity_guides','tags','text[]'),('opportunity_guides','summary','text'),('opportunity_guides','author','text'),('opportunity_guides','author_email','text'),('opportunity_guides','resource_type','text'),('opportunity_guides','metadata','jsonb'),('opportunity_guides','created_by','uuid'),('opportunity_guides','updated_by','uuid'),('opportunity_guides','created_at','timestamp with time zone'),('opportunity_guides','updated_at','timestamp with time zone'),('forum_comments','id','uuid'),('forum_comments','post_id','text'),('forum_comments','body','text'),('forum_comments','author_email','text'),('forum_comments','author_name','text'),('forum_comments','likes','integer'),('forum_comments','liked_by','text[]'),('forum_comments','is_flagged','boolean'),('forum_comments','flag_reason','text'),('forum_comments','is_removed','boolean'),('forum_comments','is_best_answer','boolean'),('forum_comments','author_id','uuid'),('forum_comments','is_edited','boolean'),('forum_comments','edited_at','timestamp with time zone'),('forum_comments','edited_by','uuid'),('forum_comments','parent_comment_id','uuid'),('forum_comments','is_pinned','boolean'),('forum_comments','is_hidden','boolean'),('forum_comments','moderated_by','uuid'),('forum_comments','moderated_at','timestamp with time zone'),('forum_comments','moderation_notes','text'),('forum_comments','metadata','jsonb'),('forum_comments','created_at','timestamp with time zone'),('forum_comments','updated_at','timestamp with time zone'),('caps_documents','id','uuid'),('caps_documents','title','text'),('caps_documents','description','text'),('caps_documents','file_url','text'),('caps_documents','document_type','text'),('caps_documents','subject','text'),('caps_documents','grade','text'),('caps_documents','year','numeric'),('caps_documents','official_doc_number','text'),('caps_documents','download_count','numeric'),('caps_documents','file_name','text'),('caps_documents','file_size_bytes','bigint'),('caps_documents','file_type','text'),('caps_documents','file_extension','text'),('caps_documents','is_active','boolean'),('caps_documents','is_featured','boolean'),('caps_documents','published_date','timestamp with time zone'),('caps_documents','publisher','text'),('caps_documents','language','text'),('caps_documents','caps_phase','text'),('caps_documents','curriculum_year','integer'),('caps_documents','version','text'),('caps_documents','metadata','jsonb'),('caps_documents','created_by','uuid'),('caps_documents','updated_by','uuid'),('caps_documents','created_at','timestamp with time zone'),('caps_documents','updated_at','timestamp with time zone'),('chat_messages','id','uuid'),('chat_messages','room_id','text'),('chat_messages','sender_email','text'),('chat_messages','sender_name','text'),('chat_messages','message','text'),('chat_messages','sender_id','uuid'),('chat_messages','recipient_email','text'),('chat_messages','recipient_id','uuid'),('chat_messages','message_type','text'),('chat_messages','is_read','boolean'),('chat_messages','read_at','timestamp with time zone'),('chat_messages','is_delivered','boolean'),('chat_messages','delivered_at','timestamp with time zone'),('chat_messages','is_deleted','boolean'),('chat_messages','deleted_at','timestamp with time zone'),('chat_messages','deleted_by','uuid'),('chat_messages','metadata','jsonb'),('chat_messages','created_at','timestamp with time zone'),('chat_messages','updated_at','timestamp with time zone'),('lesson_plans','id','uuid'),('lesson_plans','tutor_email','text'),('lesson_plans','student_email','text'),('lesson_plans','student_name','text'),('lesson_plans','session_date','date'),('lesson_plans','session_title','text'),('lesson_plans','subject','text'),('lesson_plans','grade','text'),('lesson_plans','objectives','text[]'),('lesson_plans','resources_used','text[]'),('lesson_plans','homework_assigned','text'),('lesson_plans','notes','text'),('lesson_plans','status','text'),('lesson_plans','student_progress_id','text'),('lesson_plans','tutor_id','uuid'),('lesson_plans','student_id','uuid'),('lesson_plans','session_time','time without time zone'),('lesson_plans','session_duration_minutes','integer'),('lesson_plans','is_cancelled','boolean'),('lesson_plans','cancelled_at','timestamp with time zone'),('lesson_plans','cancelled_reason','text'),('lesson_plans','completed_at','timestamp with time zone'),('lesson_plans','reflection_notes','text'),('lesson_plans','student_feedback','text'),('lesson_plans','student_rating','integer'),('lesson_plans','next_session_goals','text[]'),('lesson_plans','metadata','jsonb'),('lesson_plans','created_at','timestamp with time zone'),('lesson_plans','updated_at','timestamp with time zone'),('pending_opportunity_guides','id','uuid'),('pending_opportunity_guides','title','text'),('pending_opportunity_guides','description','text'),('pending_opportunity_guides','external_link','text'),('pending_opportunity_guides','file_url','text'),('pending_opportunity_guides','category','text'),('pending_opportunity_guides','status','text'),('pending_opportunity_guides','admin_notes','text'),('pending_opportunity_guides','source','text'),('pending_opportunity_guides','submitted_by','uuid'),('pending_opportunity_guides','submitted_by_email','text'),('pending_opportunity_guides','submitted_at','timestamp with time zone'),('pending_opportunity_guides','approved_by','uuid'),('pending_opportunity_guides','approved_at','timestamp with time zone'),('pending_opportunity_guides','rejected_at','timestamp with time zone'),('pending_opportunity_guides','rejected_reason','text'),('pending_opportunity_guides','reviewed_at','timestamp with time zone'),('pending_opportunity_guides','reviewed_by','uuid'),('pending_opportunity_guides','priority','text'),('pending_opportunity_guides','is_duplicate','boolean'),('pending_opportunity_guides','duplicate_of_id','uuid'),('pending_opportunity_guides','file_name','text'),('pending_opportunity_guides','file_size_bytes','bigint'),('pending_opportunity_guides','file_type','text'),('pending_opportunity_guides','icon','text'),('pending_opportunity_guides','metadata','jsonb'),('pending_opportunity_guides','created_by','uuid'),('pending_opportunity_guides','updated_by','uuid'),('pending_opportunity_guides','created_at','timestamp with time zone'),('pending_opportunity_guides','updated_at','timestamp with time zone'),('discussion_answers','id','uuid'),('discussion_answers','post_id','text'),('discussion_answers','author_email','text'),('discussion_answers','author_name','text'),('discussion_answers','author_role','text'),('discussion_answers','answer','text'),('discussion_answers','is_accepted','boolean'),('discussion_answers','upvotes','integer'),('discussion_answers','author_id','uuid'),('discussion_answers','downvotes','integer'),('discussion_answers','is_edited','boolean'),('discussion_answers','edited_at','timestamp with time zone'),('discussion_answers','edited_by','uuid'),('discussion_answers','is_flagged','boolean'),('discussion_answers','flag_reason','text'),('discussion_answers','is_hidden','boolean'),('discussion_answers','moderated_by','uuid'),('discussion_answers','moderated_at','timestamp with time zone'),('discussion_answers','moderation_notes','text'),('discussion_answers','metadata','jsonb'),('discussion_answers','created_at','timestamp with time zone'),('discussion_answers','updated_at','timestamp with time zone'),('quiz_results','id','uuid'),('quiz_results','student_email','text'),('quiz_results','quiz_id','text'),('quiz_results','quiz_title','text'),('quiz_results','subject','text'),('quiz_results','grade','text'),('quiz_results','score','numeric'),('quiz_results','total_questions','numeric'),('quiz_results','percentage','numeric'),('quiz_results','time_taken_seconds','numeric'),('quiz_results','student_id','uuid'),('quiz_results','quiz_uuid','uuid'),('quiz_results','correct_answers','integer'),('quiz_results','incorrect_answers','integer'),('quiz_results','unanswered_questions','integer'),('quiz_results','passed','boolean'),('quiz_results','grade_letter','text'),('quiz_results','question_results','jsonb'),('quiz_results','answers','jsonb'),('quiz_results','status','text'),('quiz_results','completed_at','timestamp with time zone'),('quiz_results','started_at','timestamp with time zone'),('quiz_results','reviewed_by','uuid'),('quiz_results','reviewed_at','timestamp with time zone'),('quiz_results','feedback_text','text'),('quiz_results','is_flagged','boolean'),('quiz_results','flag_reason','text'),('quiz_results','metadata','jsonb'),('quiz_results','created_at','timestamp with time zone'),('quiz_results','updated_at','timestamp with time zone'),('nbt_registrations','id','uuid'),('nbt_registrations','student_email','text'),('nbt_registrations','student_name','text'),('nbt_registrations','nbt_test_date_id','text'),('nbt_registrations','test_date','date'),('nbt_registrations','venue','text'),('nbt_registrations','city','text'),('nbt_registrations','tests_registered','text[]'),('nbt_registrations','status','text'),('nbt_registrations','aql_score','numeric'),('nbt_registrations','mat_score','numeric'),('nbt_registrations','ql_score','numeric'),('nbt_registrations','overall_band','text'),('nbt_registrations','results_uploaded','boolean'),('nbt_registrations','results_file_url','text'),('nbt_registrations','reminder_sent','boolean'),('nbt_registrations','student_id','uuid'),('nbt_registrations','registration_date','timestamp with time zone'),('nbt_registrations','confirmation_date','timestamp with time zone'),('nbt_registrations','completed_date','timestamp with time zone'),('nbt_registrations','cancelled_date','timestamp with time zone'),('nbt_registrations','cancelled_reason','text'),('nbt_registrations','payment_reference','text'),('nbt_registrations','payment_amount','numeric(10,2)'),('nbt_registrations','payment_status','text'),('nbt_registrations','booking_reference','text'),('nbt_registrations','special_accommodations','text'),('nbt_registrations','notes','text'),('nbt_registrations','metadata','jsonb'),('nbt_registrations','created_by','uuid'),('nbt_registrations','updated_by','uuid'),('nbt_registrations','created_at','timestamp with time zone'),('nbt_registrations','updated_at','timestamp with time zone'),('quizzes','id','uuid'),('quizzes','title','text'),('quizzes','subject','text'),('quizzes','grade','text'),('quizzes','questions','jsonb'),('quizzes','created_by','text'),('quizzes','is_published','boolean'),('quizzes','created_by_id','uuid'),('quizzes','updated_by','uuid'),('quizzes','description','text'),('quizzes','quiz_type','text'),('quizzes','difficulty_level','text'),('quizzes','time_limit_minutes','integer'),('quizzes','passing_score_percentage','numeric(5,2)'),('quizzes','total_questions','integer'),('quizzes','randomize_questions','boolean'),('quizzes','randomize_options','boolean'),('quizzes','show_answers_after_submission','boolean'),('quizzes','allow_retakes','boolean'),('quizzes','max_attempts','integer'),('quizzes','tags','text[]'),('quizzes','category','text'),('quizzes','featured','boolean'),('quizzes','view_count','integer'),('quizzes','attempt_count','integer'),('quizzes','average_score','numeric(5,2)'),('quizzes','published_at','timestamp with time zone'),('quizzes','metadata','jsonb'),('quizzes','created_at','timestamp with time zone'),('quizzes','updated_at','timestamp with time zone'),('nbt_test_dates','id','uuid'),('nbt_test_dates','test_date','date'),('nbt_test_dates','test_time','text'),('nbt_test_dates','venue','text'),('nbt_test_dates','city','text'),('nbt_test_dates','province','text'),('nbt_test_dates','tests_available','text[]'),('nbt_test_dates','registration_deadline','date'),('nbt_test_dates','available_slots','numeric'),('nbt_test_dates','registration_link','text'),('nbt_test_dates','is_active','boolean'),('nbt_test_dates','test_code','text'),('nbt_test_dates','test_type','text'),('nbt_test_dates','capacity','integer'),('nbt_test_dates','registered_count','integer'),('nbt_test_dates','venue_latitude','numeric(10,8)'),('nbt_test_dates','venue_longitude','numeric(11,8)'),('nbt_test_dates','venue_contact','text'),('nbt_test_dates','venue_phone','text'),('nbt_test_dates','parking_info','text'),('nbt_test_dates','accessibility_info','text'),('nbt_test_dates','special_instructions','text'),('nbt_test_dates','is_remote','boolean'),('nbt_test_dates','remote_platform','text'),('nbt_test_dates','remote_meeting_link','text'),('nbt_test_dates','results_release_date','date'),('nbt_test_dates','metadata','jsonb'),('nbt_test_dates','created_by','uuid'),('nbt_test_dates','updated_by','uuid'),('nbt_test_dates','created_at','timestamp with time zone'),('nbt_test_dates','updated_at','timestamp with time zone'),('pending_university_prospectuses','id','uuid'),('pending_university_prospectuses','university_name','text'),('pending_university_prospectuses','year','numeric'),('pending_university_prospectuses','external_link','text'),('pending_university_prospectuses','file_url','text'),('pending_university_prospectuses','application_link','text'),('pending_university_prospectuses','description','text'),('pending_university_prospectuses','status','text'),('pending_university_prospectuses','admin_notes','text'),('pending_university_prospectuses','source','text'),('pending_university_prospectuses','submitted_by','uuid'),('pending_university_prospectuses','submitted_by_email','text'),('pending_university_prospectuses','submitted_at','timestamp with time zone'),('pending_university_prospectuses','approved_by','uuid'),('pending_university_prospectuses','approved_at','timestamp with time zone'),('pending_university_prospectuses','rejected_at','timestamp with time zone'),('pending_university_prospectuses','rejected_reason','text'),('pending_university_prospectuses','reviewed_at','timestamp with time zone'),('pending_university_prospectuses','reviewed_by','uuid'),('pending_university_prospectuses','priority','text'),('pending_university_prospectuses','is_duplicate','boolean'),('pending_university_prospectuses','duplicate_of_id','uuid'),('pending_university_prospectuses','file_name','text'),('pending_university_prospectuses','file_size_bytes','bigint'),('pending_university_prospectuses','file_type','text'),('pending_university_prospectuses','file_extension','text'),('pending_university_prospectuses','language','text'),('pending_university_prospectuses','is_faculty_prospectus','boolean'),('pending_university_prospectuses','faculty_name','text'),('pending_university_prospectuses','metadata','jsonb'),('pending_university_prospectuses','created_by','uuid'),('pending_university_prospectuses','updated_by','uuid'),('pending_university_prospectuses','created_at','timestamp with time zone'),('pending_university_prospectuses','updated_at','timestamp with time zone'),('discussion_posts','id','uuid'),('discussion_posts','author_email','text'),('discussion_posts','author_name','text'),('discussion_posts','author_role','text'),('discussion_posts','subject','text'),('discussion_posts','topic','text'),('discussion_posts','question','text'),('discussion_posts','is_answered','boolean'),('discussion_posts','answer_count','integer'),('discussion_posts','upvotes','integer'),('discussion_posts','author_id','uuid'),('discussion_posts','downvotes','integer'),('discussion_posts','is_edited','boolean'),('discussion_posts','edited_at','timestamp with time zone'),('discussion_posts','edited_by','uuid'),('discussion_posts','is_removed','boolean'),('discussion_posts','is_flagged','boolean'),('discussion_posts','flag_reason','text'),('discussion_posts','is_pinned','boolean'),('discussion_posts','is_locked','boolean'),('discussion_posts','view_count','integer'),('discussion_posts','tags','text[]'),('discussion_posts','metadata','jsonb'),('discussion_posts','created_at','timestamp with time zone'),('discussion_posts','updated_at','timestamp with time zone'),('users','id','uuid'),('users','role','text'),('users','onboarding_complete','boolean'),('users','tutor_type','text'),('users','sace_number','text'),('users','university','text'),('users','student_number','text'),('users','linked_student_email','text'),('users','zoom_link','text'),('users','teams_link','text'),('users','in_session','boolean'),('users','session_platform','text'),('users','badges','text[]'),('users','trial_started_at','timestamp with time zone'),('users','email','text'),('users','full_name','text'),('users','display_name','text'),('users','phone','text'),('users','date_of_birth','date'),('users','is_active','boolean'),('users','is_verified','boolean'),('users','is_premium','boolean'),('users','profile_picture_url','text'),('users','bio','text'),('users','address','text'),('users','city','text'),('users','province','text'),('users','postal_code','text'),('users','country','text'),('users','preferred_language','text'),('users','communication_preferences','text'),('users','last_login','timestamp with time zone'),('users','created_at','timestamp with time zone'),('users','updated_at','timestamp with time zone'),('users','is_super_admin','boolean'),('resources','id','uuid'),('resources','title','text'),('resources','description','text'),('resources','subject','text'),('resources','grade','text'),('resources','type','text'),('resources','file_url','text'),('resources','is_premium','boolean'),('resources','is_approved','boolean'),('resources','is_rejected','boolean'),('resources','tutor_email','text'),('resources','download_count','integer'),('resources','tutor_id','uuid'),('resources','file_name','text'),('resources','file_size_bytes','bigint'),('resources','file_type','text'),('resources','file_extension','text'),('resources','uploaded_at','timestamp with time zone'),('resources','approved_by','uuid'),('resources','approved_at','timestamp with time zone'),('resources','rejected_by','uuid'),('resources','rejected_at','timestamp with time zone'),('resources','rejection_reason','text'),('resources','is_featured','boolean'),('resources','view_count','integer'),('resources','rating_average','numeric(3,2)'),('resources','rating_count','integer'),('resources','tags','text[]'),('resources','caps_alignment','text'),('resources','language','text'),('resources','version','text'),('resources','is_archived','boolean'),('resources','metadata','jsonb'),('resources','created_at','timestamp with time zone'),('resources','updated_at','timestamp with time zone'),('resource_bookmarks','id','uuid'),('resource_bookmarks','user_email','text'),('resource_bookmarks','resource_id','text'),('resource_bookmarks','resource_title','text'),('resource_bookmarks','subject','text'),('resource_bookmarks','grade','text'),('resource_bookmarks','user_id','uuid'),('resource_bookmarks','resource_uuid','uuid'),('resource_bookmarks','bookmark_note','text'),('resource_bookmarks','category','text'),('resource_bookmarks','is_archived','boolean'),('resource_bookmarks','tags','text[]'),('resource_bookmarks','metadata','jsonb'),('resource_bookmarks','created_at','timestamp with time zone'),('resource_bookmarks','updated_at','timestamp with time zone'),('resource_ratings','id','uuid'),('resource_ratings','resource_id','text'),('resource_ratings','user_email','text'),('resource_ratings','rating','numeric'),('resource_ratings','comment','text'),('resource_ratings','user_id','uuid'),('resource_ratings','resource_uuid','uuid'),('resource_ratings','rating_date','timestamp with time zone'),('resource_ratings','is_verified','boolean'),('resource_ratings','is_flagged','boolean'),('resource_ratings','flag_reason','text'),('resource_ratings','is_hidden','boolean'),('resource_ratings','moderated_by','uuid'),('resource_ratings','moderated_at','timestamp with time zone'),('resource_ratings','moderation_notes','text'),('resource_ratings','helpful_count','integer'),('resource_ratings','metadata','jsonb'),('resource_ratings','created_at','timestamp with time zone'),('resource_ratings','updated_at','timestamp with time zone'),('school_counselors','id','uuid'),('school_counselors','counselor_email','text'),('school_counselors','school_name','text'),('school_counselors','student_emails','text[]'),('school_counselors','schools','jsonb'),('school_counselors','counselor_id','uuid'),('school_counselors','counselor_name','text'),('school_counselors','counselor_phone','text'),('school_counselors','counselor_title','text'),('school_counselors','counselor_department','text'),('school_counselors','is_active','boolean'),('school_counselors','is_verified','boolean'),('school_counselors','verification_date','timestamp with time zone'),('school_counselors','sace_number','text'),('school_counselors','sace_verified','boolean'),('school_counselors','years_experience','integer'),('school_counselors','qualifications','text[]'),('school_counselors','specializations','text[]'),('school_counselors','languages_spoken','text[]'),('school_counselors','profile_picture_url','text'),('school_counselors','bio','text'),('school_counselors','office_location','text'),('school_counselors','office_phone','text'),('school_counselors','office_hours','text'),('school_counselors','appointment_link','text'),('school_counselors','metadata','jsonb'),('school_counselors','created_by','uuid'),('school_counselors','updated_by','uuid'),('school_counselors','created_at','timestamp with time zone'),('school_counselors','updated_at','timestamp with time zone'),('student_notes','id','uuid'),('student_notes','tutor_email','text'),('student_notes','student_email','text'),('student_notes','student_name','text'),('student_notes','subject','text'),('student_notes','note','text'),('student_notes','session_date','date'),('student_notes','strengths','text'),('student_notes','areas_to_improve','text'),('student_notes','next_steps','text'),('student_notes','mood','text'),('student_notes','tutor_id','uuid'),('student_notes','student_id','uuid'),('student_notes','note_type','text'),('student_notes','is_confidential','boolean'),('student_notes','is_shared_with_student','boolean'),('student_notes','shared_at','timestamp with time zone'),('student_notes','is_flagged','boolean'),('student_notes','flag_reason','text'),('student_notes','is_archived','boolean'),('student_notes','tags','text[]'),('student_notes','follow_up_date','date'),('student_notes','follow_up_completed','boolean'),('student_notes','follow_up_notes','text'),('student_notes','metadata','jsonb'),('student_notes','created_at','timestamp with time zone'),('student_notes','updated_at','timestamp with time zone'),('student_progress','id','uuid'),('student_progress','student_email','text'),('student_progress','subject','text'),('student_progress','grade','text'),('student_progress','resources_accessed','integer'),('student_progress','last_accessed','date'),('student_progress','notes','text'),('student_progress','student_id','uuid'),('student_progress','academic_year','integer'),('student_progress','academic_term','integer'),('student_progress','current_score','numeric(5,2)'),('student_progress','target_score','numeric(5,2)'),('student_progress','progress_percentage','numeric(5,2)'),('student_progress','sba_score','numeric(5,2)'),('student_progress','exam_score','numeric(5,2)'),('student_progress','overall_score','numeric(5,2)'),('student_progress','attendance_percentage','numeric(5,2)'),('student_progress','classes_attended','integer'),('student_progress','classes_total','integer'),('student_progress','time_spent_minutes','integer'),('student_progress','assignments_completed','integer'),('student_progress','assignments_total','integer'),('student_progress','at_risk','boolean'),('student_progress','risk_factors','text[]'),('student_progress','intervention_recommended','boolean'),('student_progress','intervention_notes','text'),('student_progress','status','text'),('student_progress','teacher_feedback','text'),('student_progress','last_feedback_date','timestamp with time zone'),('student_progress','metadata','jsonb'),('student_progress','created_by','uuid'),('student_progress','updated_by','uuid'),('student_progress','created_at','timestamp with time zone'),('student_progress','updated_at','timestamp with time zone'),('study_reminders','id','uuid'),('study_reminders','student_email','text'),('study_reminders','subject','text'),('study_reminders','day_of_week','text'),('study_reminders','time','text'),('study_reminders','is_active','boolean'),('study_reminders','note','text'),('study_reminders','student_id','uuid'),('study_reminders','reminder_type','text'),('study_reminders','duration_minutes','integer'),('study_reminders','notification_channels','text[]'),('study_reminders','advance_notice_minutes','integer'),('study_reminders','is_snooze_allowed','boolean'),('study_reminders','max_snooze_count','integer'),('study_reminders','location','text'),('study_reminders','location_url','text'),('study_reminders','study_materials','text[]'),('study_reminders','checklist','jsonb'),('study_reminders','last_notified_at','timestamp with time zone'),('study_reminders','next_notification_at','timestamp with time zone'),('study_reminders','is_completed','boolean'),('study_reminders','completed_at','timestamp with time zone'),('study_reminders','time_spent_minutes','integer'),('study_reminders','focus_score','integer'),('study_reminders','reflection_notes','text'),('study_reminders','metadata','jsonb'),('study_reminders','created_by','uuid'),('study_reminders','updated_by','uuid'),('study_reminders','created_at','timestamp with time zone'),('study_reminders','updated_at','timestamp with time zone'),('subjects','id','uuid'),('subjects','name','text'),('subjects','code','text'),('subjects','category','text'),('subjects','description','text'),('subjects','icon','text'),('subjects','grades','text[]'),('subjects','subject_short_name','text'),('subjects','caps_document_url','text'),('subjects','caps_grade','integer'),('subjects','caps_subject_category','text'),('subjects','caps_outcomes','text[]'),('subjects','caps_curriculum_year','integer'),('subjects','credit_hours','integer'),('subjects','is_compulsory','boolean'),('subjects','has_practical_component','boolean'),('subjects','has_theory_component','boolean'),('subjects','assessment_type','text'),('subjects','sba_weighting','numeric(5,2)'),('subjects','exam_weighting','numeric(5,2)'),('subjects','learning_objectives','text[]'),('subjects','prerequisites','text[]'),('subjects','recommended_grade','integer'),('subjects','textbook_recommendations','text[]'),('subjects','recommended_reading','text[]'),('subjects','online_resources','text[]'),('subjects','is_active','boolean'),('subjects','is_published','boolean'),('subjects','published_date','timestamp with time zone'),('subjects','dbe_category','text'),('subjects','dbe_tracking_code','text'),('subjects','metadata','jsonb'),('subjects','created_by','uuid'),('subjects','updated_by','uuid'),('subjects','created_at','timestamp with time zone'),('subjects','updated_at','timestamp with time zone'),('study_room_posts','id','uuid'),('study_room_posts','room_id','text'),('study_room_posts','subject','text'),('study_room_posts','author_email','text'),('study_room_posts','author_name','text'),('study_room_posts','type','text'),('study_room_posts','title','text'),('study_room_posts','body','text'),('study_room_posts','replies','jsonb'),('study_room_posts','author_id','uuid'),('study_room_posts','room_name','text'),('study_room_posts','is_pinned','boolean'),('study_room_posts','is_locked','boolean'),('study_room_posts','is_flagged','boolean'),('study_room_posts','flag_reason','text'),('study_room_posts','is_hidden','boolean'),('study_room_posts','is_archived','boolean'),('study_room_posts','view_count','integer'),('study_room_posts','reply_count','integer'),('study_room_posts','upvotes','integer'),('study_room_posts','downvotes','integer'),('study_room_posts','tags','text[]'),('study_room_posts','last_reply_at','timestamp with time zone'),('study_room_posts','last_reply_by','uuid'),('study_room_posts','last_reply_by_email','text'),('study_room_posts','metadata','jsonb'),('study_room_posts','created_by','uuid'),('study_room_posts','updated_by','uuid'),('study_room_posts','created_at','timestamp with time zone'),('study_room_posts','updated_at','timestamp with time zone'),('study_sessions','id','uuid'),('study_sessions','student_email','text'),('study_sessions','subject','text'),('study_sessions','date','date'),('study_sessions','hour','integer'),('study_sessions','duration_minutes','integer'),('study_sessions','student_id','uuid'),('study_sessions','start_time','timestamp with time zone'),('study_sessions','end_time','timestamp with time zone'),('study_sessions','is_completed','boolean'),('study_sessions','is_active','boolean'),('study_sessions','completed_at','timestamp with time zone'),('study_sessions','focus_rating','integer'),('study_sessions','productivity_rating','integer'),('study_sessions','notes','text'),('study_sessions','topics_covered','text[]'),('study_sessions','resources_used','text[]'),('study_sessions','challenges_encountered','text'),('study_sessions','next_steps','text'),('study_sessions','session_type','text'),('study_sessions','location','text'),('study_sessions','location_url','text'),('study_sessions','companion_email','text'),('study_sessions','metadata','jsonb'),('study_sessions','created_by','uuid'),('study_sessions','updated_by','uuid'),('study_sessions','created_at','timestamp with time zone'),('study_sessions','updated_at','timestamp with time zone'),('tutor_profiles','id','uuid'),('tutor_profiles','user_email','text'),('tutor_profiles','full_name','text'),('tutor_profiles','bio','text'),('tutor_profiles','avatar_url','text'),('tutor_profiles','subjects','text[]'),('tutor_profiles','grades','text[]'),('tutor_profiles','sace_number','text'),('tutor_profiles','qualifications','text[]'),('tutor_profiles','specializations','text[]'),('tutor_profiles','teaching_languages','text[]'),('tutor_profiles','institution','text'),('tutor_profiles','study_field','text'),('tutor_profiles','study_year','text'),('tutor_profiles','session_price_per_hour','numeric'),('tutor_profiles','group_session_price','numeric'),('tutor_profiles','hourly_rate','numeric'),('tutor_profiles','rating','numeric'),('tutor_profiles','total_reviews','integer'),('tutor_profiles','is_verified','boolean'),('tutor_profiles','is_premium','boolean'),('tutor_profiles','user_id','uuid'),('tutor_profiles','tutor_title','text'),('tutor_profiles','tutor_tagline','text'),('tutor_profiles','years_experience','integer'),('tutor_profiles','teaching_experience_years','integer'),('tutor_profiles','tutoring_experience_years','integer'),('tutor_profiles','certifications','text[]'),('tutor_profiles','subjects_taught','uuid[]'),('tutor_profiles','highest_qualification','text'),('tutor_profiles','education_institution','text'),('tutor_profiles','graduation_year','integer'),('tutor_profiles','grade_levels_taught','integer[]'),('tutor_profiles','preferred_grade_levels','integer[]'),('tutor_profiles','currency','text'),('tutor_profiles','is_rate_negotiable','boolean'),('tutor_profiles','teaching_style','text'),('tutor_profiles','languages_spoken','text[]'),('tutor_profiles','preferred_teaching_days','text[]'),('tutor_profiles','preferred_teaching_times','text[]'),('tutor_profiles','offers_online_tutoring','boolean'),('tutor_profiles','offers_in_person_tutoring','boolean'),('tutor_profiles','travel_distance_km','integer'),('tutor_profiles','online_platforms','text[]'),('tutor_profiles','background_check_completed','boolean'),('tutor_profiles','background_check_date','timestamp with time zone'),('tutor_profiles','clearance_certificate_url','text'),('tutor_profiles','is_available','boolean'),('tutor_profiles','is_active','boolean'),('tutor_profiles','verification_date','timestamp with time zone'),('tutor_profiles','total_bookings','integer'),('tutor_profiles','total_hours_taught','integer'),('tutor_profiles','metadata','jsonb'),('tutor_profiles','created_by','uuid'),('tutor_profiles','updated_by','uuid'),('tutor_profiles','created_at','timestamp with time zone'),('tutor_profiles','updated_at','timestamp with time zone'),('system_configuration','id','uuid'),('system_configuration','key','text'),('system_configuration','label','text'),('system_configuration','value','jsonb'),('system_configuration','description','text'),('system_configuration','is_active','boolean'),('system_configuration','config_type','text'),('system_configuration','category','text'),('system_configuration','is_encrypted','boolean'),('system_configuration','is_system','boolean'),('system_configuration','is_editable','boolean'),('system_configuration','updated_by','uuid'),('system_configuration','updated_by_email','text'),('system_configuration','version','integer'),('system_configuration','previous_value','jsonb'),('system_configuration','history','jsonb[]'),('system_configuration','metadata','jsonb'),('system_configuration','created_at','timestamp with time zone'),('system_configuration','updated_at','timestamp with time zone'),('subscriptions','id','uuid'),('subscriptions','user_email','text'),('subscriptions','plan','text'),('subscriptions','status','text'),('subscriptions','amount_paid','numeric'),('subscriptions','currency','text'),('subscriptions','payment_reference','text'),('subscriptions','start_date','date'),('subscriptions','end_date','date'),('subscriptions','user_id','uuid'),('subscriptions','stripe_customer_id','text'),('subscriptions','stripe_subscription_id','text'),('subscriptions','stripe_price_id','text'),('subscriptions','interval','text'),('subscriptions','interval_count','integer'),('subscriptions','trial_start_date','timestamp with time zone'),('subscriptions','trial_end_date','timestamp with time zone'),('subscriptions','is_trial','boolean'),('subscriptions','cancelled_at','timestamp with time zone'),('subscriptions','cancellation_reason','text'),('subscriptions','payment_method','text'),('subscriptions','payment_last_four','text'),('subscriptions','billing_email','text'),('subscriptions','billing_phone','text'),('subscriptions','billing_address','text'),('subscriptions','invoice_url','text'),('subscriptions','receipt_url','text'),('subscriptions','auto_renew','boolean'),('subscriptions','last_payment_date','timestamp with time zone'),('subscriptions','next_payment_date','timestamp with time zone'),('subscriptions','payment_failed_count','integer'),('subscriptions','subscription_metadata','jsonb'),('subscriptions','metadata','jsonb'),('subscriptions','created_by','uuid'),('subscriptions','updated_by','uuid'),('subscriptions','created_at','timestamp with time zone'),('subscriptions','updated_at','timestamp with time zone'),('tutor_availability','id','uuid'),('tutor_availability','tutor_email','text'),('tutor_availability','day_of_week','text'),('tutor_availability','start_time','text'),('tutor_availability','end_time','text'),('tutor_availability','is_available','boolean'),('tutor_availability','notes','text'),('tutor_availability','tutor_id','uuid'),('tutor_availability','tutor_profile_id','uuid'),('tutor_availability','timezone','text'),('tutor_availability','start_time_timestamp','timestamp with time zone'),('tutor_availability','end_time_timestamp','timestamp with time zone'),('tutor_availability','recurrence_type','text'),('tutor_availability','recurrence_end_date','date'),('tutor_availability','slot_duration_minutes','integer'),('tutor_availability','max_bookings_per_slot','integer'),('tutor_availability','buffer_time_minutes','integer'),('tutor_availability','is_recurring','boolean'),('tutor_availability','effective_start_date','date'),('tutor_availability','effective_end_date','date'),('tutor_availability','exceptions','jsonb'),('tutor_availability','booking_count','integer'),('tutor_availability','max_bookings_per_day','integer'),('tutor_availability','metadata','jsonb'),('tutor_availability','created_by','uuid'),('tutor_availability','updated_by','uuid'),('tutor_availability','created_at','timestamp with time zone'),('tutor_availability','updated_at','timestamp with time zone'),('tutor_bookings','id','uuid'),('tutor_bookings','student_email','text'),('tutor_bookings','student_name','text'),('tutor_bookings','tutor_email','text'),('tutor_bookings','tutor_name','text'),('tutor_bookings','subject','text'),('tutor_bookings','date','date'),('tutor_bookings','time','text'),('tutor_bookings','duration_hours','numeric'),('tutor_bookings','status','text'),('tutor_bookings','message','text'),('tutor_bookings','amount','numeric'),('tutor_bookings','session_link','text'),('tutor_bookings','reminder_24h_sent','boolean'),('tutor_bookings','reminder_1h_sent','boolean'),('tutor_bookings','student_id','uuid'),('tutor_bookings','tutor_id','uuid'),('tutor_bookings','tutor_profile_id','uuid'),('tutor_bookings','availability_id','uuid'),('tutor_bookings','booking_reference','text'),('tutor_bookings','start_time','timestamp with time zone'),('tutor_bookings','end_time','timestamp with time zone'),('tutor_bookings','actual_start_time','timestamp with time zone'),('tutor_bookings','actual_end_time','timestamp with time zone'),('tutor_bookings','duration_minutes','integer'),('tutor_bookings','meeting_platform','text'),('tutor_bookings','meeting_link','text'),('tutor_bookings','meeting_id','text'),('tutor_bookings','meeting_password','text'),('tutor_bookings','is_rescheduled','boolean'),('tutor_bookings','rescheduled_from_id','uuid'),('tutor_bookings','rescheduled_at','timestamp with time zone'),('tutor_bookings','cancellation_reason','text'),('tutor_bookings','cancelled_at','timestamp with time zone'),('tutor_bookings','cancelled_by','uuid'),('tutor_bookings','completed_at','timestamp with time zone'),('tutor_bookings','feedback','text'),('tutor_bookings','student_rating','integer'),('tutor_bookings','tutor_rating','integer'),('tutor_bookings','student_feedback','text'),('tutor_bookings','tutor_feedback','text'),('tutor_bookings','payment_status','text'),('tutor_bookings','payment_intent_id','text'),('tutor_bookings','payment_reference','text'),('tutor_bookings','amount_paid','numeric'),('tutor_bookings','currency','text'),('tutor_bookings','reminder_sent','boolean'),('tutor_bookings','reminder_sent_at','timestamp with time zone'),('tutor_bookings','follow_up_sent','boolean'),('tutor_bookings','follow_up_sent_at','timestamp with time zone'),('tutor_bookings','metadata','jsonb'),('tutor_bookings','created_by','uuid'),('tutor_bookings','updated_by','uuid'),('tutor_bookings','created_at','timestamp with time zone'),('tutor_bookings','updated_at','timestamp with time zone'),('tutor_payouts','id','uuid'),('tutor_payouts','booking_reference','text'),('tutor_payouts','tutor_email','text'),('tutor_payouts','tutor_name','text'),('tutor_payouts','amount','numeric'),('tutor_payouts','status','text'),('tutor_payouts','payout_date','date'),('tutor_payouts','payment_method','text'),('tutor_payouts','notes','text'),('tutor_payouts','tutor_id','uuid'),('tutor_payouts','tutor_profile_id','uuid'),('tutor_payouts','booking_id','uuid'),('tutor_payouts','payout_reference','text'),('tutor_payouts','payout_amount','numeric'),('tutor_payouts','fee_amount','numeric'),('tutor_payouts','net_amount','numeric'),('tutor_payouts','currency','text'),('tutor_payouts','payout_method','text'),('tutor_payouts','bank_account_holder','text'),('tutor_payouts','bank_account_number','text'),('tutor_payouts','bank_name','text'),('tutor_payouts','bank_branch_code','text'),('tutor_payouts','swift_code','text'),('tutor_payouts','paypal_email','text'),('tutor_payouts','stripe_connect_account_id','text'),('tutor_payouts','paid_at','timestamp with time zone'),('tutor_payouts','failed_at','timestamp with time zone'),('tutor_payouts','failed_reason','text'),('tutor_payouts','cancelled_at','timestamp with time zone'),('tutor_payouts','cancelled_reason','text'),('tutor_payouts','processed_by','uuid'),('tutor_payouts','processed_at','timestamp with time zone'),('tutor_payouts','receipt_url','text'),('tutor_payouts','batch_id','text'),('tutor_payouts','payout_period_start','date'),('tutor_payouts','payout_period_end','date'),('tutor_payouts','is_auto_payout','boolean'),('tutor_payouts','auto_payout_scheduled_at','timestamp with time zone'),('tutor_payouts','auto_payout_completed_at','timestamp with time zone'),('tutor_payouts','metadata','jsonb'),('tutor_payouts','created_by','uuid'),('tutor_payouts','updated_by','uuid'),('tutor_payouts','created_at','timestamp with time zone'),('tutor_payouts','updated_at','timestamp with time zone'),('tutor_reviews','id','uuid'),('tutor_reviews','tutor_email','text'),('tutor_reviews','tutor_name','text'),('tutor_reviews','student_email','text'),('tutor_reviews','student_name','text'),('tutor_reviews','rating','numeric'),('tutor_reviews','comment','text'),('tutor_reviews','subject','text'),('tutor_reviews','booking_id','text'),('tutor_reviews','tutor_id','uuid'),('tutor_reviews','student_id','uuid'),('tutor_reviews','tutor_profile_id','uuid'),('tutor_reviews','booking_uuid','uuid'),('tutor_reviews','review_date','timestamp with time zone'),('tutor_reviews','is_verified','boolean'),('tutor_reviews','is_flagged','boolean'),('tutor_reviews','flag_reason','text'),('tutor_reviews','is_hidden','boolean'),('tutor_reviews','is_featured','boolean'),('tutor_reviews','helpful_count','integer'),('tutor_reviews','not_helpful_count','integer'),('tutor_reviews','admin_response','text'),('tutor_reviews','admin_response_date','timestamp with time zone'),('tutor_reviews','moderated_by','uuid'),('tutor_reviews','moderated_at','timestamp with time zone'),('tutor_reviews','moderation_notes','text'),('tutor_reviews','rating_categories','jsonb'),('tutor_reviews','metadata','jsonb'),('tutor_reviews','created_at','timestamp with time zone'),('tutor_reviews','updated_at','timestamp with time zone'),('university_applications','id','uuid'),('university_applications','student_email','text'),('university_applications','university_name','text'),('university_applications','application_link','text'),('university_applications','faculty','text'),('university_applications','course','text'),('university_applications','stage','text'),('university_applications','notes','text'),('university_applications','deadline','date'),('university_applications','student_id','uuid'),('university_applications','application_reference','text'),('university_applications','application_date','timestamp with time zone'),('university_applications','submitted_at','timestamp with time zone'),('university_applications','accepted_at','timestamp with time zone'),('university_applications','rejected_at','timestamp with time zone'),('university_applications','waitlisted_at','timestamp with time zone'),('university_applications','rejection_reason','text'),('university_applications','acceptance_conditions','text'),('university_applications','waitlist_position','integer'),('university_applications','response_deadline','date'),('university_applications','deposit_amount','numeric'),('university_applications','deposit_paid','boolean'),('university_applications','deposit_paid_at','timestamp with time zone'),('university_applications','acceptance_response','text'),('university_applications','counselor_assigned','uuid'),('university_applications','counselor_notes','text'),('university_applications','application_fee_paid','boolean'),('university_applications','application_fee_amount','numeric'),('university_applications','documents_submitted','boolean'),('university_applications','documents_urls','text[]'),('university_applications','interview_scheduled','boolean'),('university_applications','interview_date','timestamp with time zone'),('university_applications','interview_notes','text'),('university_applications','nbt_results_submitted','boolean'),('university_applications','nbt_aql_score','numeric'),('university_applications','nbt_mat_score','numeric'),('university_applications','nbt_ql_score','numeric'),('university_applications','academic_background','text'),('university_applications','is_conditional_offer','boolean'),('university_applications','condition_details','text'),('university_applications','metadata','jsonb'),('university_applications','created_by','uuid'),('university_applications','updated_by','uuid'),('university_applications','created_at','timestamp with time zone'),('university_applications','updated_at','timestamp with time zone'),('university_prospectuses','id','uuid'),('university_prospectuses','university_name','text'),('university_prospectuses','year','numeric'),('university_prospectuses','file_url','text'),('university_prospectuses','logo_url','text'),('university_prospectuses','application_link','text'),('university_prospectuses','description','text'),('university_prospectuses','file_name','text'),('university_prospectuses','file_size_bytes','bigint'),('university_prospectuses','file_type','text'),('university_prospectuses','file_extension','text'),('university_prospectuses','is_active','boolean'),('university_prospectuses','is_featured','boolean'),('university_prospectuses','is_approved','boolean'),('university_prospectuses','approved_by','uuid'),('university_prospectuses','approved_at','timestamp with time zone'),('university_prospectuses','published_date','timestamp with time zone'),('university_prospectuses','download_count','integer'),('university_prospectuses','view_count','integer'),('university_prospectuses','language','text'),('university_prospectuses','faculty_name','text'),('university_prospectuses','is_faculty_prospectus','boolean'),('university_prospectuses','course_categories','text[]'),('university_prospectuses','campus_location','text'),('university_prospectuses','province','text'),('university_prospectuses','contact_email','text'),('university_prospectuses','contact_phone','text'),('university_prospectuses','accreditation_info','text'),('university_prospectuses','tags','text[]'),('university_prospectuses','metadata','jsonb'),('university_prospectuses','created_by','uuid'),('university_prospectuses','updated_by','uuid'),('university_prospectuses','created_at','timestamp with time zone'),('university_prospectuses','updated_at','timestamp with time zone'),('forum_posts','id','uuid'),('forum_posts','title','text'),('forum_posts','body','text'),('forum_posts','author_email','text'),('forum_posts','author_name','text'),('forum_posts','category','text'),('forum_posts','university_tag','text'),('forum_posts','likes','integer'),('forum_posts','liked_by','text[]'),('forum_posts','comment_count','integer'),('forum_posts','is_flagged','boolean'),('forum_posts','flag_reason','text'),('forum_posts','is_removed','boolean'),('forum_posts','is_pinned','boolean'),('forum_posts','author_id','uuid'),('forum_posts','is_edited','boolean'),('forum_posts','edited_at','timestamp with time zone'),('forum_posts','edited_by','uuid'),('forum_posts','is_locked','boolean'),('forum_posts','is_hidden','boolean'),('forum_posts','view_count','integer'),('forum_posts','tags','text[]'),('forum_posts','is_solved','boolean'),('forum_posts','solved_comment_id','uuid'),('forum_posts','metadata','jsonb'),('forum_posts','created_at','timestamp with time zone'),('forum_posts','updated_at','timestamp with time zone'),('application_deadlines','id','uuid'),('application_deadlines','event_name','text'),('application_deadlines','university','text'),('application_deadlines','date','date'),('application_deadlines','description','text'),('application_deadlines','link','text'),('application_deadlines','category','text'),('application_deadlines','is_active','boolean'),('application_deadlines','is_approved','boolean'),('application_deadlines','approved_by','uuid'),('application_deadlines','approved_at','timestamp with time zone'),('application_deadlines','reminder_sent','boolean'),('application_deadlines','reminder_sent_at','timestamp with time zone'),('application_deadlines','metadata','jsonb'),('application_deadlines','created_by','uuid'),('application_deadlines','updated_by','uuid'),('application_deadlines','created_at','timestamp with time zone'),('application_deadlines','updated_at','timestamp with time zone'),('educational_resources','id','uuid'),('educational_resources','title','text'),('educational_resources','resource_url','text'),('educational_resources','subject','text'),('educational_resources','grade','text'),('educational_resources','caps_alignment_tag','text'),('educational_resources','description','text'),('educational_resources','uploaded_by','text'),('educational_resources','is_active','boolean'),('educational_resources','uploaded_by_id','uuid'),('educational_resources','file_name','text'),('educational_resources','file_size_bytes','bigint'),('educational_resources','file_type','text'),('educational_resources','document_type','text'),('educational_resources','download_count','integer'),('educational_resources','view_count','integer'),('educational_resources','is_featured','boolean'),('educational_resources','is_premium','boolean'),('educational_resources','tags','text[]'),('educational_resources','language','text'),('educational_resources','published_date','timestamp with time zone'),('educational_resources','last_updated_at','timestamp with time zone'),('educational_resources','metadata','jsonb'),('educational_resources','created_at','timestamp with time zone'),('educational_resources','updated_at','timestamp with time zone'),('platform_announcements','id','uuid'),('platform_announcements','title','text'),('platform_announcements','message','text'),('platform_announcements','type','text'),('platform_announcements','audience','text[]'),('platform_announcements','is_active','boolean'),('platform_announcements','expires_at','date'),('platform_announcements','created_by','uuid'),('platform_announcements','created_by_email','text'),('platform_announcements','updated_by','uuid'),('platform_announcements','is_pinned','boolean'),('platform_announcements','is_global','boolean'),('platform_announcements','priority','integer'),('platform_announcements','announcement_code','text'),('platform_announcements','link_url','text'),('platform_announcements','link_text','text'),('platform_announcements','image_url','text'),('platform_announcements','icon','text'),('platform_announcements','viewed_count','integer'),('platform_announcements','action_count','integer'),('platform_announcements','published_at','timestamp with time zone'),('platform_announcements','expires_at_timestamp','timestamp with time zone'),('platform_announcements','dismissed_by','text[]'),('platform_announcements','metadata','jsonb'),('platform_announcements','created_at','timestamp with time zone'),('platform_announcements','updated_at','timestamp with time zone'),('pending_application_deadlines','id','uuid'),('pending_application_deadlines','event_name','text'),('pending_application_deadlines','university','text'),('pending_application_deadlines','date','date'),('pending_application_deadlines','description','text'),('pending_application_deadlines','link','text'),('pending_application_deadlines','category','text'),('pending_application_deadlines','status','text'),('pending_application_deadlines','admin_notes','text'),('pending_application_deadlines','source','text'),('pending_application_deadlines','submitted_by','uuid'),('pending_application_deadlines','submitted_by_email','text'),('pending_application_deadlines','submitted_at','timestamp with time zone'),('pending_application_deadlines','approved_by','uuid'),('pending_application_deadlines','approved_at','timestamp with time zone'),('pending_application_deadlines','rejected_at','timestamp with time zone'),('pending_application_deadlines','rejected_reason','text'),('pending_application_deadlines','reviewed_at','timestamp with time zone'),('pending_application_deadlines','reviewed_by','uuid'),('pending_application_deadlines','priority','text'),('pending_application_deadlines','is_duplicate','boolean'),('pending_application_deadlines','duplicate_of_id','uuid'),('pending_application_deadlines','metadata','jsonb'),('pending_application_deadlines','created_by','uuid'),('pending_application_deadlines','updated_by','uuid'),('pending_application_deadlines','created_at','timestamp with time zone'),('pending_application_deadlines','updated_at','timestamp with time zone'),('weekly_goals','id','uuid'),('weekly_goals','student_email','text'),('weekly_goals','goal_type','text'),('weekly_goals','subject','text'),('weekly_goals','target','numeric'),('weekly_goals','week_start','date'),('weekly_goals','label','text'),('weekly_goals','student_id','uuid'),('weekly_goals','week_end','date'),('weekly_goals','week_number','integer'),('weekly_goals','academic_year','integer'),('weekly_goals','academic_term','integer'),('weekly_goals','current_progress','numeric'),('weekly_goals','progress_percentage','numeric(5,2)'),('weekly_goals','status','text'),('weekly_goals','is_completed','boolean'),('weekly_goals','completed_at','timestamp with time zone'),('weekly_goals','completion_notes','text'),('weekly_goals','challenges','text[]'),('weekly_goals','support_needed','text[]'),('weekly_goals','student_reflection','text'),('weekly_goals','teacher_reflection','text'),('weekly_goals','next_week_goals','text[]'),('weekly_goals','action_items','text[]'),('weekly_goals','priority','text'),('weekly_goals','reminder_sent','boolean'),('weekly_goals','reminder_sent_at','timestamp with time zone'),('weekly_goals','progress_updates','jsonb'),('weekly_goals','metadata','jsonb'),('weekly_goals','created_by','uuid'),('weekly_goals','updated_by','uuid'),('weekly_goals','created_at','timestamp with time zone'),('weekly_goals','updated_at','timestamp with time zone'),('universities','id','uuid'),('universities','name','text'),('universities','short_name','text'),('universities','website','text'),('universities','domain','text'),('universities','prospectus_url','text'),('universities','application_url','text'),('universities','faculty_count','integer'),('universities','province','text'),('universities','is_active','boolean'),('universities','created_at','timestamp with time zone'),('universities','updated_at','timestamp with time zone'),('university_directory','id','uuid'),('university_directory','name','text'),('university_directory','url','text'),('university_directory','province','text'),('university_directory','type','text'),('university_directory','is_active','boolean'),('university_directory','display_order','integer'),('university_directory','created_at','timestamp with time zone'),('university_directory','updated_at','timestamp with time zone'),('legal_documents','id','uuid'),('legal_documents','doc_key','text'),('legal_documents','title','text'),('legal_documents','content','text'),('legal_documents','version','text'),('legal_documents','updated_at','timestamp with time zone'),('legal_documents','created_at','timestamp with time zone'),('legal_documents','created_by','uuid'),('legal_documents','updated_by','uuid'),('video_lessons','id','uuid'),('video_lessons','title','text'),('video_lessons','subject','text'),('video_lessons','grade','text'),('video_lessons','description','text'),('video_lessons','video_url','text'),('video_lessons','thumbnail_url','text'),('video_lessons','tutor_email','text'),('video_lessons','tutor_name','text'),('video_lessons','duration_minutes','numeric'),('video_lessons','is_premium','boolean'),('video_lessons','is_approved','boolean'),('video_lessons','view_count','integer'),('video_lessons','topic','text'),('video_lessons','tutor_id','uuid'),('video_lessons','lesson_code','text'),('video_lessons','video_code','text'),('video_lessons','transcript_url','text'),('video_lessons','captions_url','text'),('video_lessons','key_takeaways','text[]'),('video_lessons','learning_objectives','text[]'),('video_lessons','supplementary_materials','text[]'),('video_lessons','presentation_slides_url','text'),('video_lessons','handout_url','text'),('video_lessons','quiz_questions','jsonb'),('video_lessons','discussion_prompts','text[]'),('video_lessons','practice_exercises','text[]'),('video_lessons','is_featured','boolean'),('video_lessons','is_published','boolean'),('video_lessons','published_date','timestamp with time zone'),('video_lessons','difficulty_level','text'),('video_lessons','target_grade','integer'),('video_lessons','tags','text[]'),('video_lessons','language','text'),('video_lessons','source_platform','text'),('video_lessons','video_quality','text'),('video_lessons','total_duration_seconds','integer'),('video_lessons','completion_count','integer'),('video_lessons','average_rating','numeric(3,2)'),('video_lessons','last_updated_at','timestamp with time zone'),('video_lessons','metadata','jsonb'),('video_lessons','created_by','uuid'),('video_lessons','updated_by','uuid'),('video_lessons','created_at','timestamp with time zone'),('video_lessons','updated_at','timestamp with time zone'),('user_consents','id','uuid'),('user_consents','user_id','uuid'),('user_consents','consent_type','text'),('user_consents','consent_given','boolean'),('user_consents','consent_date','timestamp with time zone'),('user_consents','consent_source','text'),('user_consents','consent_metadata','jsonb'),('user_consents','ip_address','inet'),('user_consents','user_agent','text'),('user_consents','created_at','timestamp with time zone'),('user_consents','updated_at','timestamp with time zone'),('profiles','id','uuid'),('profiles','full_name','text'),('profiles','role','text'),('profiles','onboarding_complete','boolean'),('profiles','updated_at','timestamp with time zone'),('tech_guard_services','id','uuid'),('tech_guard_services','name','text'),('tech_guard_services','slug','text'),('tech_guard_services','description','text'),('tech_guard_services','featured','boolean'),('tech_guard_services','sort_order','integer'),('tech_guard_services','created_at','timestamp with time zone'),('tech_guard_projects','id','uuid'),('tech_guard_projects','name','text'),('tech_guard_projects','category','text'),('tech_guard_projects','description','text'),('tech_guard_projects','url','text'),('tech_guard_projects','featured','boolean'),('tech_guard_projects','sort_order','integer'),('tech_guard_projects','created_at','timestamp with time zone'),('tech_guard_leads','id','uuid'),('tech_guard_leads','name','text'),('tech_guard_leads','email','text'),('tech_guard_leads','phone','text'),('tech_guard_leads','company','text'),('tech_guard_leads','service','text'),('tech_guard_leads','message','text'),('tech_guard_leads','status','text'),('tech_guard_leads','created_at','timestamp with time zone')) as expected(table_name,column_name,column_type)
  where not exists(select 1 from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname=expected.table_name and a.attname=expected.column_name and not a.attisdropped
    and format_type(a.atttypid,a.atttypmod)=expected.column_type)) then
  raise exception 'Live schema differs from captured baseline; reconcile before rollout';
 end if;
 if exists(select 1 from (values ('activity_log','activity_log_pkey','PRIMARY KEY (id)'),('activity_log','activity_log_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('application_documents','application_documents_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('application_documents','application_documents_pkey','PRIMARY KEY (id)'),('application_documents','application_documents_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('application_documents','application_documents_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('banner_clicks','banner_clicks_pkey','PRIMARY KEY (id)'),('banner_clicks','banner_clicks_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('exam_schedule','exam_schedule_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('exam_schedule','exam_schedule_pkey','PRIMARY KEY (id)'),('exam_schedule','exam_schedule_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('exam_schedule','exam_schedule_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('bursaries','bursaries_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('bursaries','bursaries_pkey','PRIMARY KEY (id)'),('bursaries','bursaries_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('feature_toggles','feature_toggles_pkey','PRIMARY KEY (id)'),('feature_toggles','feature_toggles_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('opportunity_guides','opportunity_guides_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('opportunity_guides','opportunity_guides_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('opportunity_guides','opportunity_guides_pending_approval_by_fkey','FOREIGN KEY (pending_approval_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('opportunity_guides','opportunity_guides_pkey','PRIMARY KEY (id)'),('opportunity_guides','opportunity_guides_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_comments','forum_comments_author_id_fkey','FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_comments','forum_comments_edited_by_fkey','FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_comments','forum_comments_moderated_by_fkey','FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_comments','forum_comments_parent_comment_id_fkey','FOREIGN KEY (parent_comment_id) REFERENCES forum_comments(id) ON DELETE CASCADE'),('forum_comments','forum_comments_pkey','PRIMARY KEY (id)'),('caps_documents','caps_documents_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('caps_documents','caps_documents_pkey','PRIMARY KEY (id)'),('caps_documents','caps_documents_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('chat_messages','chat_messages_deleted_by_fkey','FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('chat_messages','chat_messages_pkey','PRIMARY KEY (id)'),('chat_messages','chat_messages_recipient_id_fkey','FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('chat_messages','chat_messages_sender_id_fkey','FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('lesson_plans','lesson_plans_pkey','PRIMARY KEY (id)'),('lesson_plans','lesson_plans_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('lesson_plans','lesson_plans_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_duplicate_of_id_fkey','FOREIGN KEY (duplicate_of_id) REFERENCES pending_opportunity_guides(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_pkey','PRIMARY KEY (id)'),('pending_opportunity_guides','pending_opportunity_guides_reviewed_by_fkey','FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_submitted_by_fkey','FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_opportunity_guides','pending_opportunity_guides_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_answers','discussion_answers_author_id_fkey','FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_answers','discussion_answers_edited_by_fkey','FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_answers','discussion_answers_moderated_by_fkey','FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_answers','discussion_answers_pkey','PRIMARY KEY (id)'),('quiz_results','quiz_results_pkey','PRIMARY KEY (id)'),('quiz_results','quiz_results_quiz_uuid_fkey','FOREIGN KEY (quiz_uuid) REFERENCES quizzes(id) ON DELETE SET NULL'),('quiz_results','quiz_results_reviewed_by_fkey','FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('quiz_results','quiz_results_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('nbt_registrations','nbt_registrations_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('nbt_registrations','nbt_registrations_pkey','PRIMARY KEY (id)'),('nbt_registrations','nbt_registrations_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('nbt_registrations','nbt_registrations_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('quizzes','quizzes_created_by_id_fkey','FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('quizzes','quizzes_pkey','PRIMARY KEY (id)'),('quizzes','quizzes_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('nbt_test_dates','nbt_test_dates_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('nbt_test_dates','nbt_test_dates_pkey','PRIMARY KEY (id)'),('nbt_test_dates','nbt_test_dates_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_duplicate_of_id_fkey','FOREIGN KEY (duplicate_of_id) REFERENCES pending_university_prospectuses(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_pkey','PRIMARY KEY (id)'),('pending_university_prospectuses','pending_university_prospectuses_reviewed_by_fkey','FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_submitted_by_fkey','FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_university_prospectuses','pending_university_prospectuses_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_posts','discussion_posts_author_id_fkey','FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_posts','discussion_posts_edited_by_fkey','FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('discussion_posts','discussion_posts_pkey','PRIMARY KEY (id)'),('users','users_id_fkey','FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),('users','users_pkey','PRIMARY KEY (id)'),('resources','resources_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('resources','resources_pkey','PRIMARY KEY (id)'),('resources','resources_rejected_by_fkey','FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('resources','resources_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('resource_bookmarks','resource_bookmarks_pkey','PRIMARY KEY (id)'),('resource_bookmarks','resource_bookmarks_resource_uuid_fkey','FOREIGN KEY (resource_uuid) REFERENCES resources(id) ON DELETE SET NULL'),('resource_bookmarks','resource_bookmarks_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('resource_ratings','resource_ratings_moderated_by_fkey','FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('resource_ratings','resource_ratings_pkey','PRIMARY KEY (id)'),('resource_ratings','resource_ratings_resource_uuid_fkey','FOREIGN KEY (resource_uuid) REFERENCES resources(id) ON DELETE SET NULL'),('resource_ratings','resource_ratings_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('school_counselors','school_counselors_counselor_id_fkey','FOREIGN KEY (counselor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('school_counselors','school_counselors_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('school_counselors','school_counselors_pkey','PRIMARY KEY (id)'),('school_counselors','school_counselors_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('student_notes','student_notes_pkey','PRIMARY KEY (id)'),('student_notes','student_notes_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('student_notes','student_notes_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('student_progress','student_progress_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('student_progress','student_progress_pkey','PRIMARY KEY (id)'),('student_progress','student_progress_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('student_progress','student_progress_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_reminders','study_reminders_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_reminders','study_reminders_pkey','PRIMARY KEY (id)'),('study_reminders','study_reminders_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_reminders','study_reminders_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('subjects','subjects_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('subjects','subjects_pkey','PRIMARY KEY (id)'),('subjects','subjects_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_room_posts','study_room_posts_author_id_fkey','FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_room_posts','study_room_posts_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_room_posts','study_room_posts_last_reply_by_fkey','FOREIGN KEY (last_reply_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_room_posts','study_room_posts_pkey','PRIMARY KEY (id)'),('study_room_posts','study_room_posts_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_sessions','study_sessions_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_sessions','study_sessions_pkey','PRIMARY KEY (id)'),('study_sessions','study_sessions_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('study_sessions','study_sessions_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_profiles','tutor_profiles_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_profiles','tutor_profiles_pkey','PRIMARY KEY (id)'),('tutor_profiles','tutor_profiles_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_profiles','tutor_profiles_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('system_configuration','system_configuration_pkey','PRIMARY KEY (id)'),('system_configuration','system_configuration_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('subscriptions','subscriptions_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('subscriptions','subscriptions_pkey','PRIMARY KEY (id)'),('subscriptions','subscriptions_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('subscriptions','subscriptions_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_availability','tutor_availability_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_availability','tutor_availability_pkey','PRIMARY KEY (id)'),('tutor_availability','tutor_availability_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_availability','tutor_availability_tutor_profile_id_fkey','FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL'),('tutor_availability','tutor_availability_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_availability_id_fkey','FOREIGN KEY (availability_id) REFERENCES tutor_availability(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_cancelled_by_fkey','FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_pkey','PRIMARY KEY (id)'),('tutor_bookings','tutor_bookings_rescheduled_from_id_fkey','FOREIGN KEY (rescheduled_from_id) REFERENCES tutor_bookings(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_tutor_profile_id_fkey','FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL'),('tutor_bookings','tutor_bookings_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_booking_id_fkey','FOREIGN KEY (booking_id) REFERENCES tutor_bookings(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_pkey','PRIMARY KEY (id)'),('tutor_payouts','tutor_payouts_processed_by_fkey','FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_tutor_profile_id_fkey','FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL'),('tutor_payouts','tutor_payouts_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_reviews','tutor_reviews_booking_uuid_fkey','FOREIGN KEY (booking_uuid) REFERENCES tutor_bookings(id) ON DELETE SET NULL'),('tutor_reviews','tutor_reviews_moderated_by_fkey','FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_reviews','tutor_reviews_pkey','PRIMARY KEY (id)'),('tutor_reviews','tutor_reviews_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_reviews','tutor_reviews_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('tutor_reviews','tutor_reviews_tutor_profile_id_fkey','FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL'),('university_applications','university_applications_counselor_assigned_fkey','FOREIGN KEY (counselor_assigned) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_applications','university_applications_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_applications','university_applications_pkey','PRIMARY KEY (id)'),('university_applications','university_applications_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_applications','university_applications_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_prospectuses','university_prospectuses_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_prospectuses','university_prospectuses_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('university_prospectuses','university_prospectuses_pkey','PRIMARY KEY (id)'),('university_prospectuses','university_prospectuses_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_posts','forum_posts_author_id_fkey','FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_posts','forum_posts_edited_by_fkey','FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('forum_posts','forum_posts_pkey','PRIMARY KEY (id)'),('application_deadlines','application_deadlines_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('application_deadlines','application_deadlines_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('application_deadlines','application_deadlines_pkey','PRIMARY KEY (id)'),('application_deadlines','application_deadlines_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('educational_resources','educational_resources_pkey','PRIMARY KEY (id)'),('educational_resources','educational_resources_uploaded_by_id_fkey','FOREIGN KEY (uploaded_by_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('platform_announcements','platform_announcements_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('platform_announcements','platform_announcements_pkey','PRIMARY KEY (id)'),('platform_announcements','platform_announcements_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_approved_by_fkey','FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_duplicate_of_id_fkey','FOREIGN KEY (duplicate_of_id) REFERENCES pending_application_deadlines(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_pkey','PRIMARY KEY (id)'),('pending_application_deadlines','pending_application_deadlines_reviewed_by_fkey','FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_submitted_by_fkey','FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('pending_application_deadlines','pending_application_deadlines_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('weekly_goals','weekly_goals_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('weekly_goals','weekly_goals_pkey','PRIMARY KEY (id)'),('weekly_goals','weekly_goals_student_id_fkey','FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('weekly_goals','weekly_goals_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('universities','universities_pkey','PRIMARY KEY (id)'),('university_directory','university_directory_pkey','PRIMARY KEY (id)'),('legal_documents','legal_documents_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id)'),('legal_documents','legal_documents_pkey','PRIMARY KEY (id)'),('legal_documents','legal_documents_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id)'),('video_lessons','video_lessons_created_by_fkey','FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('video_lessons','video_lessons_pkey','PRIMARY KEY (id)'),('video_lessons','video_lessons_tutor_id_fkey','FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL'),('video_lessons','video_lessons_updated_by_fkey','FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL'),('user_consents','user_consents_pkey','PRIMARY KEY (id)'),('user_consents','user_consents_user_id_fkey','FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),('profiles','profiles_id_fkey','FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE'),('profiles','profiles_pkey','PRIMARY KEY (id)'),('tech_guard_services','tech_guard_services_pkey','PRIMARY KEY (id)'),('tech_guard_projects','tech_guard_projects_pkey','PRIMARY KEY (id)'),('tech_guard_leads','tech_guard_leads_pkey','PRIMARY KEY (id)')) as expected(table_name,constraint_name,definition)
 where not exists(select 1 from pg_constraint co join pg_class c on c.oid=co.conrelid join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname=expected.table_name and co.conname=expected.constraint_name
 and pg_get_constraintdef(co.oid,true)=expected.definition)) then
 raise exception 'Live key constraints differ from baseline; reconcile before rollout';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname in ('activity_log','application_documents','banner_clicks','exam_schedule','bursaries','feature_toggles','opportunity_guides','forum_comments','caps_documents','chat_messages','lesson_plans','pending_opportunity_guides','discussion_answers','quiz_results','nbt_registrations','quizzes','nbt_test_dates','pending_university_prospectuses','discussion_posts','users','resources','resource_bookmarks','resource_ratings','school_counselors','student_notes','student_progress','study_reminders','subjects','study_room_posts','study_sessions','tutor_profiles','system_configuration','subscriptions','tutor_availability','tutor_bookings','tutor_payouts','tutor_reviews','university_applications','university_prospectuses','forum_posts','application_deadlines','educational_resources','platform_announcements','pending_application_deadlines','weekly_goals','universities','university_directory','legal_documents','video_lessons','user_consents','profiles','tech_guard_services','tech_guard_projects','tech_guard_leads') and not c.relrowsecurity) then
 raise exception 'Baseline tables must retain row level security';end if;
 return;
end if;
execute $baseline_ddl$create extension if not exists pg_trgm with schema public;$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."activity_log" (
  "id" uuid default gen_random_uuid() not null,
  "event_type" text not null,
  "user_email" text not null,
  "description" text not null,
  "metadata" jsonb,
  "user_id" uuid,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."application_deadlines" (
  "id" uuid default gen_random_uuid() not null,
  "event_name" text not null,
  "university" text,
  "date" date not null,
  "description" text,
  "link" text,
  "category" text not null,
  "is_active" boolean default true,
  "is_approved" boolean default false,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "reminder_sent" boolean default false,
  "reminder_sent_at" timestamp with time zone,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."application_documents" (
  "id" uuid default gen_random_uuid() not null,
  "application_id" text not null,
  "student_email" text not null,
  "university_name" text,
  "doc_type" text not null,
  "file_url" text not null,
  "file_name" text,
  "status" text default 'uploaded'::text,
  "notes" text,
  "student_id" uuid,
  "uploaded_at" timestamp with time zone default now(),
  "submitted_at" timestamp with time zone,
  "verified_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejected_reason" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."banner_clicks" (
  "id" uuid default gen_random_uuid() not null,
  "banner_name" text not null,
  "user_email" text,
  "user_id" uuid,
  "click_timestamp" timestamp with time zone default now(),
  "ip_address" inet,
  "user_agent" text,
  "referrer" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."bursaries" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "provider" text not null,
  "description" text,
  "apply_link" text not null,
  "fields_of_study" text[],
  "max_household_income" numeric(15,2),
  "min_average" numeric(5,2),
  "covers" text,
  "deadline" date,
  "is_active" boolean default true,
  "provinces" text[],
  "logo_url" text,
  "contact_email" text,
  "contact_phone" text,
  "website" text,
  "application_fee" numeric(10,2),
  "requires_interview" boolean default false,
  "requires_essay" boolean default false,
  "requires_recommendations" boolean default false,
  "academic_year" integer,
  "total_funding_amount" numeric(15,2),
  "number_of_awards" integer,
  "target_citizenship" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."caps_documents" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "description" text,
  "file_url" text not null,
  "document_type" text not null,
  "subject" text not null,
  "grade" text not null,
  "year" numeric,
  "official_doc_number" text,
  "download_count" numeric default 0,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "file_extension" text,
  "is_active" boolean default true,
  "is_featured" boolean default false,
  "published_date" timestamp with time zone,
  "publisher" text,
  "language" text default 'English'::text,
  "caps_phase" text,
  "curriculum_year" integer,
  "version" text default '1.0'::text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."chat_messages" (
  "id" uuid default gen_random_uuid() not null,
  "room_id" text not null,
  "sender_email" text not null,
  "sender_name" text,
  "message" text not null,
  "sender_id" uuid,
  "recipient_email" text,
  "recipient_id" uuid,
  "message_type" text default 'text'::text,
  "is_read" boolean default false,
  "read_at" timestamp with time zone,
  "is_delivered" boolean default false,
  "delivered_at" timestamp with time zone,
  "is_deleted" boolean default false,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."discussion_answers" (
  "id" uuid default gen_random_uuid() not null,
  "post_id" text not null,
  "author_email" text not null,
  "author_name" text not null,
  "author_role" text default 'student'::text,
  "answer" text not null,
  "is_accepted" boolean default false,
  "upvotes" integer default 0,
  "author_id" uuid,
  "downvotes" integer default 0,
  "is_edited" boolean default false,
  "edited_at" timestamp with time zone,
  "edited_by" uuid,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_hidden" boolean default false,
  "moderated_by" uuid,
  "moderated_at" timestamp with time zone,
  "moderation_notes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."discussion_posts" (
  "id" uuid default gen_random_uuid() not null,
  "author_email" text not null,
  "author_name" text not null,
  "author_role" text default 'student'::text,
  "subject" text,
  "topic" text,
  "question" text not null,
  "is_answered" boolean default false,
  "answer_count" integer default 0,
  "upvotes" integer default 0,
  "author_id" uuid,
  "downvotes" integer default 0,
  "is_edited" boolean default false,
  "edited_at" timestamp with time zone,
  "edited_by" uuid,
  "is_removed" boolean default false,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_pinned" boolean default false,
  "is_locked" boolean default false,
  "view_count" integer default 0,
  "tags" text[],
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."educational_resources" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "resource_url" text not null,
  "subject" text not null,
  "grade" text not null,
  "caps_alignment_tag" text,
  "description" text,
  "uploaded_by" text,
  "is_active" boolean default true,
  "uploaded_by_id" uuid,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "document_type" text default 'PDF'::text,
  "download_count" integer default 0,
  "view_count" integer default 0,
  "is_featured" boolean default false,
  "is_premium" boolean default false,
  "tags" text[],
  "language" text default 'English'::text,
  "published_date" timestamp with time zone,
  "last_updated_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."exam_schedule" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "subject" text not null,
  "grade" text not null,
  "exam_date" date not null,
  "exam_type" text not null,
  "notes" text,
  "student_id" uuid,
  "exam_time" time without time zone,
  "exam_duration_minutes" integer,
  "venue" text,
  "venue_address" text,
  "exam_code" text,
  "total_marks" integer,
  "weight_percentage" numeric(5,2),
  "is_published" boolean default false,
  "published_date" timestamp with time zone,
  "is_completed" boolean default false,
  "completed_at" timestamp with time zone,
  "results_available" boolean default false,
  "results_published_at" timestamp with time zone,
  "score" numeric(5,2),
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."feature_toggles" (
  "id" uuid default gen_random_uuid() not null,
  "feature_key" text not null,
  "label" text not null,
  "description" text,
  "is_enabled" boolean default true,
  "locked_message" text,
  "disabled_for_emails" text[] default '{}'::text[],
  "enabled_for_emails" text[] default '{}'::text[],
  "feature_category" text default 'system'::text,
  "environment" text default 'production'::text,
  "audience_percentage" integer,
  "rollout_started_at" timestamp with time zone,
  "rollout_completed_at" timestamp with time zone,
  "updated_by" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."forum_comments" (
  "id" uuid default gen_random_uuid() not null,
  "post_id" text not null,
  "body" text not null,
  "author_email" text not null,
  "author_name" text not null,
  "likes" integer default 0,
  "liked_by" text[] default '{}'::text[],
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_removed" boolean default false,
  "is_best_answer" boolean default false,
  "author_id" uuid,
  "is_edited" boolean default false,
  "edited_at" timestamp with time zone,
  "edited_by" uuid,
  "parent_comment_id" uuid,
  "is_pinned" boolean default false,
  "is_hidden" boolean default false,
  "moderated_by" uuid,
  "moderated_at" timestamp with time zone,
  "moderation_notes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."forum_posts" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "body" text not null,
  "author_email" text not null,
  "author_name" text not null,
  "category" text not null,
  "university_tag" text,
  "likes" integer default 0,
  "liked_by" text[] default '{}'::text[],
  "comment_count" integer default 0,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_removed" boolean default false,
  "is_pinned" boolean default false,
  "author_id" uuid,
  "is_edited" boolean default false,
  "edited_at" timestamp with time zone,
  "edited_by" uuid,
  "is_locked" boolean default false,
  "is_hidden" boolean default false,
  "view_count" integer default 0,
  "tags" text[],
  "is_solved" boolean default false,
  "solved_comment_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."legal_documents" (
  "id" uuid default gen_random_uuid() not null,
  "doc_key" text not null,
  "title" text not null,
  "content" text not null,
  "version" text default '1.0'::text,
  "updated_at" timestamp with time zone default now(),
  "created_at" timestamp with time zone default now(),
  "created_by" uuid,
  "updated_by" uuid
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."lesson_plans" (
  "id" uuid default gen_random_uuid() not null,
  "tutor_email" text not null,
  "student_email" text not null,
  "student_name" text,
  "session_date" date not null,
  "session_title" text not null,
  "subject" text not null,
  "grade" text not null,
  "objectives" text[],
  "resources_used" text[],
  "homework_assigned" text,
  "notes" text,
  "status" text default 'draft'::text,
  "student_progress_id" text,
  "tutor_id" uuid,
  "student_id" uuid,
  "session_time" time without time zone,
  "session_duration_minutes" integer,
  "is_cancelled" boolean default false,
  "cancelled_at" timestamp with time zone,
  "cancelled_reason" text,
  "completed_at" timestamp with time zone,
  "reflection_notes" text,
  "student_feedback" text,
  "student_rating" integer,
  "next_session_goals" text[],
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."nbt_registrations" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "student_name" text,
  "nbt_test_date_id" text not null,
  "test_date" date not null,
  "venue" text,
  "city" text,
  "tests_registered" text[],
  "status" text default 'registered'::text,
  "aql_score" numeric,
  "mat_score" numeric,
  "ql_score" numeric,
  "overall_band" text,
  "results_uploaded" boolean default false,
  "results_file_url" text,
  "reminder_sent" boolean default false,
  "student_id" uuid,
  "registration_date" timestamp with time zone default now(),
  "confirmation_date" timestamp with time zone,
  "completed_date" timestamp with time zone,
  "cancelled_date" timestamp with time zone,
  "cancelled_reason" text,
  "payment_reference" text,
  "payment_amount" numeric(10,2),
  "payment_status" text default 'pending'::text,
  "booking_reference" text,
  "special_accommodations" text,
  "notes" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."nbt_test_dates" (
  "id" uuid default gen_random_uuid() not null,
  "test_date" date not null,
  "test_time" text,
  "venue" text not null,
  "city" text not null,
  "province" text,
  "tests_available" text[],
  "registration_deadline" date,
  "available_slots" numeric,
  "registration_link" text,
  "is_active" boolean default true,
  "test_code" text,
  "test_type" text,
  "capacity" integer,
  "registered_count" integer default 0,
  "venue_latitude" numeric(10,8),
  "venue_longitude" numeric(11,8),
  "venue_contact" text,
  "venue_phone" text,
  "parking_info" text,
  "accessibility_info" text,
  "special_instructions" text,
  "is_remote" boolean default false,
  "remote_platform" text,
  "remote_meeting_link" text,
  "results_release_date" date,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."opportunity_guides" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "description" text,
  "file_url" text not null,
  "category" text not null,
  "icon" text,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "file_extension" text,
  "is_active" boolean default true,
  "is_featured" boolean default false,
  "is_pending" boolean default false,
  "pending_approval_by" uuid,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "published_date" timestamp with time zone,
  "download_count" integer default 0,
  "view_count" integer default 0,
  "tags" text[],
  "summary" text,
  "author" text,
  "author_email" text,
  "resource_type" text default 'PDF'::text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."pending_application_deadlines" (
  "id" uuid default gen_random_uuid() not null,
  "event_name" text not null,
  "university" text,
  "date" date not null,
  "description" text,
  "link" text,
  "category" text not null,
  "status" text default 'pending'::text,
  "admin_notes" text,
  "source" text,
  "submitted_by" uuid,
  "submitted_by_email" text,
  "submitted_at" timestamp with time zone default now(),
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejected_reason" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  "priority" text default 'medium'::text,
  "is_duplicate" boolean default false,
  "duplicate_of_id" uuid,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."pending_opportunity_guides" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "description" text,
  "external_link" text,
  "file_url" text,
  "category" text not null,
  "status" text default 'pending'::text,
  "admin_notes" text,
  "source" text,
  "submitted_by" uuid,
  "submitted_by_email" text,
  "submitted_at" timestamp with time zone default now(),
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejected_reason" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  "priority" text default 'medium'::text,
  "is_duplicate" boolean default false,
  "duplicate_of_id" uuid,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "icon" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."pending_university_prospectuses" (
  "id" uuid default gen_random_uuid() not null,
  "university_name" text not null,
  "year" numeric not null,
  "external_link" text,
  "file_url" text,
  "application_link" text,
  "description" text,
  "status" text default 'pending'::text,
  "admin_notes" text,
  "source" text,
  "submitted_by" uuid,
  "submitted_by_email" text,
  "submitted_at" timestamp with time zone default now(),
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "rejected_reason" text,
  "reviewed_at" timestamp with time zone,
  "reviewed_by" uuid,
  "priority" text default 'medium'::text,
  "is_duplicate" boolean default false,
  "duplicate_of_id" uuid,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "file_extension" text,
  "language" text default 'English'::text,
  "is_faculty_prospectus" boolean default false,
  "faculty_name" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."platform_announcements" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "message" text not null,
  "type" text default 'info'::text,
  "audience" text[] not null,
  "is_active" boolean default true,
  "expires_at" date,
  "created_by" uuid,
  "created_by_email" text,
  "updated_by" uuid,
  "is_pinned" boolean default false,
  "is_global" boolean default false,
  "priority" integer default 0,
  "announcement_code" text,
  "link_url" text,
  "link_text" text,
  "image_url" text,
  "icon" text,
  "viewed_count" integer default 0,
  "action_count" integer default 0,
  "published_at" timestamp with time zone default now(),
  "expires_at_timestamp" timestamp with time zone,
  "dismissed_by" text[],
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."profiles" (
  "id" uuid not null,
  "full_name" text,
  "role" text default 'user'::text,
  "onboarding_complete" boolean default false,
  "updated_at" timestamp with time zone
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."quiz_results" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "quiz_id" text not null,
  "quiz_title" text,
  "subject" text,
  "grade" text,
  "score" numeric,
  "total_questions" numeric,
  "percentage" numeric,
  "time_taken_seconds" numeric,
  "student_id" uuid,
  "quiz_uuid" uuid,
  "correct_answers" integer,
  "incorrect_answers" integer,
  "unanswered_questions" integer,
  "passed" boolean default false,
  "grade_letter" text,
  "question_results" jsonb,
  "answers" jsonb,
  "status" text default 'completed'::text,
  "completed_at" timestamp with time zone default now(),
  "started_at" timestamp with time zone,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "feedback_text" text,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."quizzes" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subject" text not null,
  "grade" text not null,
  "questions" jsonb not null,
  "created_by" text,
  "is_published" boolean default false,
  "created_by_id" uuid,
  "updated_by" uuid,
  "description" text,
  "quiz_type" text default 'practice'::text,
  "difficulty_level" text default 'medium'::text,
  "time_limit_minutes" integer,
  "passing_score_percentage" numeric(5,2) default 60.00,
  "total_questions" integer,
  "randomize_questions" boolean default false,
  "randomize_options" boolean default false,
  "show_answers_after_submission" boolean default false,
  "allow_retakes" boolean default false,
  "max_attempts" integer default 1,
  "tags" text[],
  "category" text,
  "featured" boolean default false,
  "view_count" integer default 0,
  "attempt_count" integer default 0,
  "average_score" numeric(5,2),
  "published_at" timestamp with time zone,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."resource_bookmarks" (
  "id" uuid default gen_random_uuid() not null,
  "user_email" text not null,
  "resource_id" text not null,
  "resource_title" text,
  "subject" text,
  "grade" text,
  "user_id" uuid,
  "resource_uuid" uuid,
  "bookmark_note" text,
  "category" text default 'favorite'::text,
  "is_archived" boolean default false,
  "tags" text[],
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."resource_ratings" (
  "id" uuid default gen_random_uuid() not null,
  "resource_id" text not null,
  "user_email" text not null,
  "rating" numeric not null,
  "comment" text,
  "user_id" uuid,
  "resource_uuid" uuid,
  "rating_date" timestamp with time zone default now(),
  "is_verified" boolean default false,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_hidden" boolean default false,
  "moderated_by" uuid,
  "moderated_at" timestamp with time zone,
  "moderation_notes" text,
  "helpful_count" integer default 0,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."resources" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "description" text,
  "subject" text not null,
  "grade" text not null,
  "type" text not null,
  "file_url" text,
  "is_premium" boolean default false,
  "is_approved" boolean default false,
  "is_rejected" boolean default false,
  "tutor_email" text,
  "download_count" integer default 0,
  "tutor_id" uuid,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "file_extension" text,
  "uploaded_at" timestamp with time zone default now(),
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "rejected_by" uuid,
  "rejected_at" timestamp with time zone,
  "rejection_reason" text,
  "is_featured" boolean default false,
  "view_count" integer default 0,
  "rating_average" numeric(3,2),
  "rating_count" integer default 0,
  "tags" text[],
  "caps_alignment" text,
  "language" text default 'English'::text,
  "version" text default '1.0'::text,
  "is_archived" boolean default false,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."school_counselors" (
  "id" uuid default gen_random_uuid() not null,
  "counselor_email" text not null,
  "school_name" text not null,
  "student_emails" text[],
  "schools" jsonb,
  "counselor_id" uuid,
  "counselor_name" text,
  "counselor_phone" text,
  "counselor_title" text,
  "counselor_department" text,
  "is_active" boolean default true,
  "is_verified" boolean default false,
  "verification_date" timestamp with time zone,
  "sace_number" text,
  "sace_verified" boolean default false,
  "years_experience" integer,
  "qualifications" text[],
  "specializations" text[],
  "languages_spoken" text[],
  "profile_picture_url" text,
  "bio" text,
  "office_location" text,
  "office_phone" text,
  "office_hours" text,
  "appointment_link" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."student_notes" (
  "id" uuid default gen_random_uuid() not null,
  "tutor_email" text not null,
  "student_email" text not null,
  "student_name" text,
  "subject" text,
  "note" text not null,
  "session_date" date,
  "strengths" text,
  "areas_to_improve" text,
  "next_steps" text,
  "mood" text default 'Neutral'::text,
  "tutor_id" uuid,
  "student_id" uuid,
  "note_type" text default 'general'::text,
  "is_confidential" boolean default false,
  "is_shared_with_student" boolean default false,
  "shared_at" timestamp with time zone,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_archived" boolean default false,
  "tags" text[],
  "follow_up_date" date,
  "follow_up_completed" boolean default false,
  "follow_up_notes" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."student_progress" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "subject" text not null,
  "grade" text not null,
  "resources_accessed" integer default 0,
  "last_accessed" date,
  "notes" text,
  "student_id" uuid,
  "academic_year" integer,
  "academic_term" integer,
  "current_score" numeric(5,2),
  "target_score" numeric(5,2),
  "progress_percentage" numeric(5,2),
  "sba_score" numeric(5,2),
  "exam_score" numeric(5,2),
  "overall_score" numeric(5,2),
  "attendance_percentage" numeric(5,2),
  "classes_attended" integer,
  "classes_total" integer,
  "time_spent_minutes" integer,
  "assignments_completed" integer,
  "assignments_total" integer,
  "at_risk" boolean default false,
  "risk_factors" text[],
  "intervention_recommended" boolean default false,
  "intervention_notes" text,
  "status" text default 'not_started'::text,
  "teacher_feedback" text,
  "last_feedback_date" timestamp with time zone,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."study_reminders" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "subject" text not null,
  "day_of_week" text not null,
  "time" text not null,
  "is_active" boolean default true,
  "note" text,
  "student_id" uuid,
  "reminder_type" text default 'study'::text,
  "duration_minutes" integer default 60,
  "notification_channels" text[] default ARRAY['email'::text, 'push'::text, 'sms'::text],
  "advance_notice_minutes" integer default 30,
  "is_snooze_allowed" boolean default true,
  "max_snooze_count" integer default 3,
  "location" text,
  "location_url" text,
  "study_materials" text[],
  "checklist" jsonb,
  "last_notified_at" timestamp with time zone,
  "next_notification_at" timestamp with time zone,
  "is_completed" boolean default false,
  "completed_at" timestamp with time zone,
  "time_spent_minutes" integer,
  "focus_score" integer,
  "reflection_notes" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."study_room_posts" (
  "id" uuid default gen_random_uuid() not null,
  "room_id" text not null,
  "subject" text not null,
  "author_email" text not null,
  "author_name" text not null,
  "type" text default 'Note'::text,
  "title" text,
  "body" text not null,
  "replies" jsonb default '[]'::jsonb,
  "author_id" uuid,
  "room_name" text,
  "is_pinned" boolean default false,
  "is_locked" boolean default false,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_hidden" boolean default false,
  "is_archived" boolean default false,
  "view_count" integer default 0,
  "reply_count" integer default 0,
  "upvotes" integer default 0,
  "downvotes" integer default 0,
  "tags" text[],
  "last_reply_at" timestamp with time zone,
  "last_reply_by" uuid,
  "last_reply_by_email" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."study_sessions" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "subject" text not null,
  "date" date not null,
  "hour" integer not null,
  "duration_minutes" integer default 30,
  "student_id" uuid,
  "start_time" timestamp with time zone,
  "end_time" timestamp with time zone,
  "is_completed" boolean default false,
  "is_active" boolean default true,
  "completed_at" timestamp with time zone,
  "focus_rating" integer,
  "productivity_rating" integer,
  "notes" text,
  "topics_covered" text[],
  "resources_used" text[],
  "challenges_encountered" text,
  "next_steps" text,
  "session_type" text default 'study'::text,
  "location" text,
  "location_url" text,
  "companion_email" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."subjects" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "code" text,
  "category" text,
  "description" text,
  "icon" text,
  "grades" text[],
  "subject_short_name" text,
  "caps_document_url" text,
  "caps_grade" integer,
  "caps_subject_category" text,
  "caps_outcomes" text[],
  "caps_curriculum_year" integer,
  "credit_hours" integer,
  "is_compulsory" boolean default false,
  "has_practical_component" boolean default false,
  "has_theory_component" boolean default true,
  "assessment_type" text default 'mix'::text,
  "sba_weighting" numeric(5,2),
  "exam_weighting" numeric(5,2),
  "learning_objectives" text[],
  "prerequisites" text[],
  "recommended_grade" integer,
  "textbook_recommendations" text[],
  "recommended_reading" text[],
  "online_resources" text[],
  "is_active" boolean default true,
  "is_published" boolean default false,
  "published_date" timestamp with time zone,
  "dbe_category" text,
  "dbe_tracking_code" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."subscriptions" (
  "id" uuid default gen_random_uuid() not null,
  "user_email" text not null,
  "plan" text default 'free'::text,
  "status" text default 'inactive'::text,
  "amount_paid" numeric,
  "currency" text default 'ZAR'::text,
  "payment_reference" text,
  "start_date" date,
  "end_date" date,
  "user_id" uuid,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "stripe_price_id" text,
  "interval" text default 'month'::text,
  "interval_count" integer default 1,
  "trial_start_date" timestamp with time zone,
  "trial_end_date" timestamp with time zone,
  "is_trial" boolean default false,
  "cancelled_at" timestamp with time zone,
  "cancellation_reason" text,
  "payment_method" text default 'card'::text,
  "payment_last_four" text,
  "billing_email" text,
  "billing_phone" text,
  "billing_address" text,
  "invoice_url" text,
  "receipt_url" text,
  "auto_renew" boolean default true,
  "last_payment_date" timestamp with time zone,
  "next_payment_date" timestamp with time zone,
  "payment_failed_count" integer default 0,
  "subscription_metadata" jsonb,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."system_configuration" (
  "id" uuid default gen_random_uuid() not null,
  "key" text not null,
  "label" text,
  "value" jsonb not null,
  "description" text,
  "is_active" boolean default true,
  "config_type" text default 'json'::text,
  "category" text default 'other'::text,
  "is_encrypted" boolean default false,
  "is_system" boolean default false,
  "is_editable" boolean default true,
  "updated_by" uuid,
  "updated_by_email" text,
  "version" integer default 1,
  "previous_value" jsonb,
  "history" jsonb[],
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tech_guard_leads" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text not null,
  "phone" text,
  "company" text,
  "service" text,
  "message" text not null,
  "status" text default 'new'::text not null,
  "created_at" timestamp with time zone default now() not null
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tech_guard_projects" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "category" text not null,
  "description" text not null,
  "url" text,
  "featured" boolean default true not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tech_guard_services" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "slug" text not null,
  "description" text not null,
  "featured" boolean default true not null,
  "sort_order" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tutor_availability" (
  "id" uuid default gen_random_uuid() not null,
  "tutor_email" text not null,
  "day_of_week" text not null,
  "start_time" text not null,
  "end_time" text not null,
  "is_available" boolean default true,
  "notes" text,
  "tutor_id" uuid,
  "tutor_profile_id" uuid,
  "timezone" text default 'Africa/Johannesburg'::text,
  "start_time_timestamp" timestamp with time zone,
  "end_time_timestamp" timestamp with time zone,
  "recurrence_type" text default 'weekly'::text,
  "recurrence_end_date" date,
  "slot_duration_minutes" integer default 30,
  "max_bookings_per_slot" integer default 1,
  "buffer_time_minutes" integer default 0,
  "is_recurring" boolean default false,
  "effective_start_date" date,
  "effective_end_date" date,
  "exceptions" jsonb,
  "booking_count" integer default 0,
  "max_bookings_per_day" integer default 10,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tutor_bookings" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "student_name" text,
  "tutor_email" text not null,
  "tutor_name" text,
  "subject" text not null,
  "date" date not null,
  "time" text not null,
  "duration_hours" numeric default 1,
  "status" text default 'pending'::text,
  "message" text,
  "amount" numeric,
  "session_link" text,
  "reminder_24h_sent" boolean default false,
  "reminder_1h_sent" boolean default false,
  "student_id" uuid,
  "tutor_id" uuid,
  "tutor_profile_id" uuid,
  "availability_id" uuid,
  "booking_reference" text,
  "start_time" timestamp with time zone,
  "end_time" timestamp with time zone,
  "actual_start_time" timestamp with time zone,
  "actual_end_time" timestamp with time zone,
  "duration_minutes" integer,
  "meeting_platform" text default 'zoom'::text,
  "meeting_link" text,
  "meeting_id" text,
  "meeting_password" text,
  "is_rescheduled" boolean default false,
  "rescheduled_from_id" uuid,
  "rescheduled_at" timestamp with time zone,
  "cancellation_reason" text,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "completed_at" timestamp with time zone,
  "feedback" text,
  "student_rating" integer,
  "tutor_rating" integer,
  "student_feedback" text,
  "tutor_feedback" text,
  "payment_status" text default 'pending'::text,
  "payment_intent_id" text,
  "payment_reference" text,
  "amount_paid" numeric,
  "currency" text default 'ZAR'::text,
  "reminder_sent" boolean default false,
  "reminder_sent_at" timestamp with time zone,
  "follow_up_sent" boolean default false,
  "follow_up_sent_at" timestamp with time zone,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tutor_payouts" (
  "id" uuid default gen_random_uuid() not null,
  "booking_reference" text not null,
  "tutor_email" text not null,
  "tutor_name" text not null,
  "amount" numeric not null,
  "status" text default 'pending'::text,
  "payout_date" date,
  "payment_method" text,
  "notes" text,
  "tutor_id" uuid,
  "tutor_profile_id" uuid,
  "booking_id" uuid,
  "payout_reference" text,
  "payout_amount" numeric,
  "fee_amount" numeric default 0,
  "net_amount" numeric,
  "currency" text default 'ZAR'::text,
  "payout_method" text default 'bank_transfer'::text,
  "bank_account_holder" text,
  "bank_account_number" text,
  "bank_name" text,
  "bank_branch_code" text,
  "swift_code" text,
  "paypal_email" text,
  "stripe_connect_account_id" text,
  "paid_at" timestamp with time zone,
  "failed_at" timestamp with time zone,
  "failed_reason" text,
  "cancelled_at" timestamp with time zone,
  "cancelled_reason" text,
  "processed_by" uuid,
  "processed_at" timestamp with time zone,
  "receipt_url" text,
  "batch_id" text,
  "payout_period_start" date,
  "payout_period_end" date,
  "is_auto_payout" boolean default false,
  "auto_payout_scheduled_at" timestamp with time zone,
  "auto_payout_completed_at" timestamp with time zone,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tutor_profiles" (
  "id" uuid default gen_random_uuid() not null,
  "user_email" text not null,
  "full_name" text not null,
  "bio" text,
  "avatar_url" text,
  "subjects" text[],
  "grades" text[],
  "sace_number" text,
  "qualifications" text[],
  "specializations" text[],
  "teaching_languages" text[],
  "institution" text,
  "study_field" text,
  "study_year" text,
  "session_price_per_hour" numeric,
  "group_session_price" numeric,
  "hourly_rate" numeric,
  "rating" numeric,
  "total_reviews" integer default 0,
  "is_verified" boolean default false,
  "is_premium" boolean default false,
  "user_id" uuid,
  "tutor_title" text,
  "tutor_tagline" text,
  "years_experience" integer default 0,
  "teaching_experience_years" integer default 0,
  "tutoring_experience_years" integer default 0,
  "certifications" text[],
  "subjects_taught" uuid[],
  "highest_qualification" text,
  "education_institution" text,
  "graduation_year" integer,
  "grade_levels_taught" integer[],
  "preferred_grade_levels" integer[],
  "currency" text default 'ZAR'::text,
  "is_rate_negotiable" boolean default false,
  "teaching_style" text default 'mixed'::text,
  "languages_spoken" text[],
  "preferred_teaching_days" text[],
  "preferred_teaching_times" text[],
  "offers_online_tutoring" boolean default true,
  "offers_in_person_tutoring" boolean default false,
  "travel_distance_km" integer,
  "online_platforms" text[],
  "background_check_completed" boolean default false,
  "background_check_date" timestamp with time zone,
  "clearance_certificate_url" text,
  "is_available" boolean default true,
  "is_active" boolean default true,
  "verification_date" timestamp with time zone,
  "total_bookings" integer default 0,
  "total_hours_taught" integer default 0,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."tutor_reviews" (
  "id" uuid default gen_random_uuid() not null,
  "tutor_email" text not null,
  "tutor_name" text,
  "student_email" text not null,
  "student_name" text,
  "rating" numeric not null,
  "comment" text,
  "subject" text,
  "booking_id" text,
  "tutor_id" uuid,
  "student_id" uuid,
  "tutor_profile_id" uuid,
  "booking_uuid" uuid,
  "review_date" timestamp with time zone default now(),
  "is_verified" boolean default false,
  "is_flagged" boolean default false,
  "flag_reason" text,
  "is_hidden" boolean default false,
  "is_featured" boolean default false,
  "helpful_count" integer default 0,
  "not_helpful_count" integer default 0,
  "admin_response" text,
  "admin_response_date" timestamp with time zone,
  "moderated_by" uuid,
  "moderated_at" timestamp with time zone,
  "moderation_notes" text,
  "rating_categories" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."universities" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "short_name" text,
  "website" text,
  "domain" text,
  "prospectus_url" text,
  "application_url" text,
  "faculty_count" integer default 0,
  "province" text,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."university_applications" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "university_name" text not null,
  "application_link" text,
  "faculty" text,
  "course" text,
  "stage" text default 'Saved'::text,
  "notes" text,
  "deadline" date,
  "student_id" uuid,
  "application_reference" text,
  "application_date" timestamp with time zone default now(),
  "submitted_at" timestamp with time zone,
  "accepted_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "waitlisted_at" timestamp with time zone,
  "rejection_reason" text,
  "acceptance_conditions" text,
  "waitlist_position" integer,
  "response_deadline" date,
  "deposit_amount" numeric,
  "deposit_paid" boolean default false,
  "deposit_paid_at" timestamp with time zone,
  "acceptance_response" text default 'pending'::text,
  "counselor_assigned" uuid,
  "counselor_notes" text,
  "application_fee_paid" boolean default false,
  "application_fee_amount" numeric,
  "documents_submitted" boolean default false,
  "documents_urls" text[],
  "interview_scheduled" boolean default false,
  "interview_date" timestamp with time zone,
  "interview_notes" text,
  "nbt_results_submitted" boolean default false,
  "nbt_aql_score" numeric,
  "nbt_mat_score" numeric,
  "nbt_ql_score" numeric,
  "academic_background" text,
  "is_conditional_offer" boolean default false,
  "condition_details" text,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."university_directory" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "url" text not null,
  "province" text,
  "type" text,
  "is_active" boolean default true,
  "display_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."university_prospectuses" (
  "id" uuid default gen_random_uuid() not null,
  "university_name" text not null,
  "year" numeric not null,
  "file_url" text not null,
  "logo_url" text,
  "application_link" text,
  "description" text,
  "file_name" text,
  "file_size_bytes" bigint,
  "file_type" text,
  "file_extension" text,
  "is_active" boolean default true,
  "is_featured" boolean default false,
  "is_approved" boolean default false,
  "approved_by" uuid,
  "approved_at" timestamp with time zone,
  "published_date" timestamp with time zone,
  "download_count" integer default 0,
  "view_count" integer default 0,
  "language" text default 'English'::text,
  "faculty_name" text,
  "is_faculty_prospectus" boolean default false,
  "course_categories" text[],
  "campus_location" text,
  "province" text,
  "contact_email" text,
  "contact_phone" text,
  "accreditation_info" text,
  "tags" text[],
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."user_consents" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "consent_type" text not null,
  "consent_given" boolean default true,
  "consent_date" timestamp with time zone default now(),
  "consent_source" text,
  "consent_metadata" jsonb,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."users" (
  "id" uuid not null,
  "role" text default 'user'::text,
  "onboarding_complete" boolean default false,
  "tutor_type" text,
  "sace_number" text,
  "university" text,
  "student_number" text,
  "linked_student_email" text,
  "zoom_link" text,
  "teams_link" text,
  "in_session" boolean default false,
  "session_platform" text,
  "badges" text[],
  "trial_started_at" timestamp with time zone,
  "email" text not null,
  "full_name" text,
  "display_name" text,
  "phone" text,
  "date_of_birth" date,
  "is_active" boolean default true,
  "is_verified" boolean default false,
  "is_premium" boolean default false,
  "profile_picture_url" text,
  "bio" text,
  "address" text,
  "city" text,
  "province" text,
  "postal_code" text,
  "country" text default 'South Africa'::text,
  "preferred_language" text default 'en'::text,
  "communication_preferences" text,
  "last_login" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "is_super_admin" boolean default false not null
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."video_lessons" (
  "id" uuid default gen_random_uuid() not null,
  "title" text not null,
  "subject" text not null,
  "grade" text not null,
  "description" text,
  "video_url" text not null,
  "thumbnail_url" text,
  "tutor_email" text,
  "tutor_name" text,
  "duration_minutes" numeric,
  "is_premium" boolean default false,
  "is_approved" boolean default false,
  "view_count" integer default 0,
  "topic" text,
  "tutor_id" uuid,
  "lesson_code" text,
  "video_code" text,
  "transcript_url" text,
  "captions_url" text,
  "key_takeaways" text[],
  "learning_objectives" text[],
  "supplementary_materials" text[],
  "presentation_slides_url" text,
  "handout_url" text,
  "quiz_questions" jsonb,
  "discussion_prompts" text[],
  "practice_exercises" text[],
  "is_featured" boolean default false,
  "is_published" boolean default false,
  "published_date" timestamp with time zone,
  "difficulty_level" text default 'intermediate'::text,
  "target_grade" integer,
  "tags" text[],
  "language" text default 'English'::text,
  "source_platform" text default 'youtube'::text,
  "video_quality" text default '1080p'::text,
  "total_duration_seconds" integer,
  "completion_count" integer default 0,
  "average_rating" numeric(3,2),
  "last_updated_at" timestamp with time zone,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$create table if not exists "public"."weekly_goals" (
  "id" uuid default gen_random_uuid() not null,
  "student_email" text not null,
  "goal_type" text not null,
  "subject" text,
  "target" numeric not null,
  "week_start" date not null,
  "label" text,
  "student_id" uuid,
  "week_end" date,
  "week_number" integer,
  "academic_year" integer,
  "academic_term" integer,
  "current_progress" numeric default 0,
  "progress_percentage" numeric(5,2) default 0,
  "status" text default 'not_started'::text,
  "is_completed" boolean default false,
  "completed_at" timestamp with time zone,
  "completion_notes" text,
  "challenges" text[],
  "support_needed" text[],
  "student_reflection" text,
  "teacher_reflection" text,
  "next_week_goals" text[],
  "action_items" text[],
  "priority" text default 'medium'::text,
  "reminder_sent" boolean default false,
  "reminder_sent_at" timestamp with time zone,
  "progress_updates" jsonb,
  "metadata" jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now()
);$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."activity_log"'::regclass and conname='activity_log_pkey') then alter table "public"."activity_log" add constraint "activity_log_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_doc_type_check') then alter table "public"."application_documents" add constraint "application_documents_doc_type_check" CHECK (doc_type = ANY (ARRAY['ID Copy'::text, 'Matric Certificate'::text, 'Proof of Payment'::text, 'NBT Results'::text, 'Academic Transcript'::text, 'Motivation Letter'::text, 'Reference Letter'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_pkey') then alter table "public"."application_documents" add constraint "application_documents_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_status_check') then alter table "public"."application_documents" add constraint "application_documents_status_check" CHECK (status = ANY (ARRAY['uploaded'::text, 'submitted'::text, 'verified'::text, 'rejected'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."banner_clicks"'::regclass and conname='banner_clicks_pkey') then alter table "public"."banner_clicks" add constraint "banner_clicks_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_exam_type_check') then alter table "public"."exam_schedule" add constraint "exam_schedule_exam_type_check" CHECK (exam_type = ANY (ARRAY['Test'::text, 'Mid-Year Exam'::text, 'Trial Exam'::text, 'Final Exam'::text, 'Assignment'::text, 'Oral'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_grade_check') then alter table "public"."exam_schedule" add constraint "exam_schedule_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_pkey') then alter table "public"."exam_schedule" add constraint "exam_schedule_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."bursaries"'::regclass and conname='bursaries_pkey') then alter table "public"."bursaries" add constraint "bursaries_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."bursaries"'::regclass and conname='bursaries_target_citizenship_check') then alter table "public"."bursaries" add constraint "bursaries_target_citizenship_check" CHECK (target_citizenship = ANY (ARRAY['South African Only'::text, 'Open to All'::text, 'SADC Countries'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_audience_percentage_check') then alter table "public"."feature_toggles" add constraint "feature_toggles_audience_percentage_check" CHECK (audience_percentage >= 0 AND audience_percentage <= 100); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_environment_check') then alter table "public"."feature_toggles" add constraint "feature_toggles_environment_check" CHECK (environment = ANY (ARRAY['development'::text, 'staging'::text, 'production'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_feature_category_check') then alter table "public"."feature_toggles" add constraint "feature_toggles_feature_category_check" CHECK (feature_category = ANY (ARRAY['assessment'::text, 'communication'::text, 'content'::text, 'analytics'::text, 'social'::text, 'gamification'::text, 'ai'::text, 'integration'::text, 'system'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_feature_key_key') then alter table "public"."feature_toggles" add constraint "feature_toggles_feature_key_key" UNIQUE (feature_key); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_pkey') then alter table "public"."feature_toggles" add constraint "feature_toggles_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_category_check') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_category_check" CHECK (category = ANY (ARRAY['NBT Prep'::text, 'University Requirements'::text, 'Bursaries'::text, 'Career Guidance'::text, 'General'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_pkey') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_resource_type_check') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_resource_type_check" CHECK (resource_type = ANY (ARRAY['PDF'::text, 'Document'::text, 'Link'::text, 'Video'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_comments"'::regclass and conname='forum_comments_pkey') then alter table "public"."forum_comments" add constraint "forum_comments_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_caps_phase_check') then alter table "public"."caps_documents" add constraint "caps_documents_caps_phase_check" CHECK (caps_phase = ANY (ARRAY['FET'::text, 'Senior'::text, 'Intermediate'::text, 'Foundation'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_document_type_check') then alter table "public"."caps_documents" add constraint "caps_documents_document_type_check" CHECK (document_type = ANY (ARRAY['CAPS'::text, 'ATP'::text, 'Revised ATP'::text, 'DBE Workbook'::text, 'LTSM Catalogue'::text, 'Study Guide'::text, 'Guidelines'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_grade_check') then alter table "public"."caps_documents" add constraint "caps_documents_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text, 'All Grades'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_pkey') then alter table "public"."caps_documents" add constraint "caps_documents_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_subject_check') then alter table "public"."caps_documents" add constraint "caps_documents_subject_check" CHECK (subject = ANY (ARRAY['Mathematics'::text, 'Mathematical Literacy'::text, 'Physical Sciences'::text, 'Life Sciences'::text, 'Geography'::text, 'History'::text, 'Accounting'::text, 'Business Studies'::text, 'Economics'::text, 'English Home Language'::text, 'Life Orientation'::text, 'All Subjects'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."chat_messages"'::regclass and conname='chat_messages_message_type_check') then alter table "public"."chat_messages" add constraint "chat_messages_message_type_check" CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'file'::text, 'system'::text, 'typing_indicator'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."chat_messages"'::regclass and conname='chat_messages_pkey') then alter table "public"."chat_messages" add constraint "chat_messages_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_grade_check') then alter table "public"."lesson_plans" add constraint "lesson_plans_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_pkey') then alter table "public"."lesson_plans" add constraint "lesson_plans_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_status_check') then alter table "public"."lesson_plans" add constraint "lesson_plans_status_check" CHECK (status = ANY (ARRAY['draft'::text, 'planned'::text, 'completed'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_student_rating_check') then alter table "public"."lesson_plans" add constraint "lesson_plans_student_rating_check" CHECK (student_rating >= 1 AND student_rating <= 5); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_category_check') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_category_check" CHECK (category = ANY (ARRAY['NBT Prep'::text, 'University Requirements'::text, 'Bursaries'::text, 'Career Guidance'::text, 'General'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_pkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_priority_check') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_status_check') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_answers"'::regclass and conname='discussion_answers_author_role_check') then alter table "public"."discussion_answers" add constraint "discussion_answers_author_role_check" CHECK (author_role = ANY (ARRAY['student'::text, 'tutor'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_answers"'::regclass and conname='discussion_answers_pkey') then alter table "public"."discussion_answers" add constraint "discussion_answers_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_grade_letter_check') then alter table "public"."quiz_results" add constraint "quiz_results_grade_letter_check" CHECK (grade_letter = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'F'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_pkey') then alter table "public"."quiz_results" add constraint "quiz_results_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_status_check') then alter table "public"."quiz_results" add constraint "quiz_results_status_check" CHECK (status = ANY (ARRAY['started'::text, 'in_progress'::text, 'completed'::text, 'timed_out'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_overall_band_check') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_overall_band_check" CHECK (overall_band = ANY (ARRAY['Proficient'::text, 'Intermediate'::text, 'Basic'::text, ''::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_payment_status_check') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_payment_status_check" CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_pkey') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_status_check') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_status_check" CHECK (status = ANY (ARRAY['registered'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_difficulty_level_check') then alter table "public"."quizzes" add constraint "quizzes_difficulty_level_check" CHECK (difficulty_level = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'expert'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_grade_check') then alter table "public"."quizzes" add constraint "quizzes_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_pkey') then alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_quiz_type_check') then alter table "public"."quizzes" add constraint "quizzes_quiz_type_check" CHECK (quiz_type = ANY (ARRAY['practice'::text, 'assessment'::text, 'homework'::text, 'test'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_test_dates"'::regclass and conname='nbt_test_dates_pkey') then alter table "public"."nbt_test_dates" add constraint "nbt_test_dates_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_test_dates"'::regclass and conname='nbt_test_dates_test_type_check') then alter table "public"."nbt_test_dates" add constraint "nbt_test_dates_test_type_check" CHECK (test_type = ANY (ARRAY['AQL'::text, 'MAT'::text, 'QL'::text, 'Combined'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_pkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_priority_check') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_status_check') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_posts"'::regclass and conname='discussion_posts_author_role_check') then alter table "public"."discussion_posts" add constraint "discussion_posts_author_role_check" CHECK (author_role = ANY (ARRAY['student'::text, 'tutor'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_posts"'::regclass and conname='discussion_posts_pkey') then alter table "public"."discussion_posts" add constraint "discussion_posts_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."users"'::regclass and conname='users_communication_preferences_check') then alter table "public"."users" add constraint "users_communication_preferences_check" CHECK (communication_preferences = ANY (ARRAY['email'::text, 'sms'::text, 'whatsapp'::text, 'all'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."users"'::regclass and conname='users_email_key') then alter table "public"."users" add constraint "users_email_key" UNIQUE (email); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."users"'::regclass and conname='users_pkey') then alter table "public"."users" add constraint "users_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."users"'::regclass and conname='users_role_check') then alter table "public"."users" add constraint "users_role_check" CHECK (role = ANY (ARRAY['admin'::text, 'user'::text, 'student'::text, 'parent'::text, 'sace_tutor'::text, 'student_tutor'::text, 'tutor_pending'::text, 'tutor'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_grade_check') then alter table "public"."resources" add constraint "resources_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_pkey') then alter table "public"."resources" add constraint "resources_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_type_check') then alter table "public"."resources" add constraint "resources_type_check" CHECK (type = ANY (ARRAY['Notes'::text, 'Past Paper'::text, 'Worksheet'::text, 'Video'::text, 'Summary'::text, 'Textbook'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_bookmarks"'::regclass and conname='resource_bookmarks_category_check') then alter table "public"."resource_bookmarks" add constraint "resource_bookmarks_category_check" CHECK (category = ANY (ARRAY['favorite'::text, 'to_review'::text, 'to_study'::text, 'important'::text, 'reference'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_bookmarks"'::regclass and conname='resource_bookmarks_pkey') then alter table "public"."resource_bookmarks" add constraint "resource_bookmarks_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_bookmarks"'::regclass and conname='resource_bookmarks_user_email_resource_id_key') then alter table "public"."resource_bookmarks" add constraint "resource_bookmarks_user_email_resource_id_key" UNIQUE (user_email, resource_id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_pkey') then alter table "public"."resource_ratings" add constraint "resource_ratings_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_rating_check') then alter table "public"."resource_ratings" add constraint "resource_ratings_rating_check" CHECK (rating >= 1::numeric AND rating <= 5::numeric); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_resource_id_user_email_key') then alter table "public"."resource_ratings" add constraint "resource_ratings_resource_id_user_email_key" UNIQUE (resource_id, user_email); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."school_counselors"'::regclass and conname='school_counselors_pkey') then alter table "public"."school_counselors" add constraint "school_counselors_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_notes"'::regclass and conname='student_notes_mood_check') then alter table "public"."student_notes" add constraint "student_notes_mood_check" CHECK (mood = ANY (ARRAY['Engaged'::text, 'Struggling'::text, 'Distracted'::text, 'Confident'::text, 'Neutral'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_notes"'::regclass and conname='student_notes_note_type_check') then alter table "public"."student_notes" add constraint "student_notes_note_type_check" CHECK (note_type = ANY (ARRAY['general'::text, 'progress'::text, 'behavioral'::text, 'achievement'::text, 'concern'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_notes"'::regclass and conname='student_notes_pkey') then alter table "public"."student_notes" add constraint "student_notes_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_academic_term_check') then alter table "public"."student_progress" add constraint "student_progress_academic_term_check" CHECK (academic_term >= 1 AND academic_term <= 4); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_pkey') then alter table "public"."student_progress" add constraint "student_progress_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_status_check') then alter table "public"."student_progress" add constraint "student_progress_status_check" CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'at_risk'::text, 'needs_attention'::text, 'on_track'::text, 'completed'::text, 'exceeds_expectations'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_student_email_subject_key') then alter table "public"."student_progress" add constraint "student_progress_student_email_subject_key" UNIQUE (student_email, subject); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_day_of_week_check') then alter table "public"."study_reminders" add constraint "study_reminders_day_of_week_check" CHECK (day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_focus_score_check') then alter table "public"."study_reminders" add constraint "study_reminders_focus_score_check" CHECK (focus_score >= 1 AND focus_score <= 10); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_pkey') then alter table "public"."study_reminders" add constraint "study_reminders_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_reminder_type_check') then alter table "public"."study_reminders" add constraint "study_reminders_reminder_type_check" CHECK (reminder_type = ANY (ARRAY['study'::text, 'revision'::text, 'homework'::text, 'exam_prep'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_student_email_subject_day_of_week_time_key') then alter table "public"."study_reminders" add constraint "study_reminders_student_email_subject_day_of_week_time_key" UNIQUE (student_email, subject, day_of_week, "time"); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_assessment_type_check') then alter table "public"."subjects" add constraint "subjects_assessment_type_check" CHECK (assessment_type = ANY (ARRAY['exam_only'::text, 'continuous_assessment'::text, 'mix'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_caps_grade_check') then alter table "public"."subjects" add constraint "subjects_caps_grade_check" CHECK (caps_grade >= 8 AND caps_grade <= 12); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_category_check') then alter table "public"."subjects" add constraint "subjects_category_check" CHECK (category = ANY (ARRAY['Mathematics'::text, 'Sciences'::text, 'Languages'::text, 'Commerce'::text, 'Humanities'::text, 'Life Skills'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_grades_check') then alter table "public"."subjects" add constraint "subjects_grades_check" CHECK (grades <@ ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text]); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_pkey') then alter table "public"."subjects" add constraint "subjects_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_recommended_grade_check') then alter table "public"."subjects" add constraint "subjects_recommended_grade_check" CHECK (recommended_grade >= 8 AND recommended_grade <= 12); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_pkey') then alter table "public"."study_room_posts" add constraint "study_room_posts_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_type_check') then alter table "public"."study_room_posts" add constraint "study_room_posts_type_check" CHECK (type = ANY (ARRAY['Note'::text, 'Question'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_focus_rating_check') then alter table "public"."study_sessions" add constraint "study_sessions_focus_rating_check" CHECK (focus_rating >= 1 AND focus_rating <= 5); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_pkey') then alter table "public"."study_sessions" add constraint "study_sessions_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_productivity_rating_check') then alter table "public"."study_sessions" add constraint "study_sessions_productivity_rating_check" CHECK (productivity_rating >= 1 AND productivity_rating <= 5); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_session_type_check') then alter table "public"."study_sessions" add constraint "study_sessions_session_type_check" CHECK (session_type = ANY (ARRAY['study'::text, 'revision'::text, 'homework'::text, 'exam_prep'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_pkey') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_study_year_check') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_study_year_check" CHECK (study_year = ANY (ARRAY['1st Year'::text, '2nd Year'::text, '3rd Year'::text, '4th Year'::text, 'Honours'::text, 'Masters'::text, 'PhD'::text, 'Graduated'::text, 'N/A'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_teaching_style_check') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_teaching_style_check" CHECK (teaching_style = ANY (ARRAY['formal'::text, 'interactive'::text, 'student_centered'::text, 'project_based'::text, 'mixed'::text, 'adaptive'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."system_configuration"'::regclass and conname='system_configuration_category_check') then alter table "public"."system_configuration" add constraint "system_configuration_category_check" CHECK (category = ANY (ARRAY['ai'::text, 'chat'::text, 'academic'::text, 'payment'::text, 'notification'::text, 'security'::text, 'feature'::text, 'other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."system_configuration"'::regclass and conname='system_configuration_config_type_check') then alter table "public"."system_configuration" add constraint "system_configuration_config_type_check" CHECK (config_type = ANY (ARRAY['string'::text, 'number'::text, 'boolean'::text, 'array'::text, 'object'::text, 'json'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."system_configuration"'::regclass and conname='system_configuration_key_key') then alter table "public"."system_configuration" add constraint "system_configuration_key_key" UNIQUE (key); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."system_configuration"'::regclass and conname='system_configuration_pkey') then alter table "public"."system_configuration" add constraint "system_configuration_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_interval_check') then alter table "public"."subscriptions" add constraint "subscriptions_interval_check" CHECK ("interval" = ANY (ARRAY['day'::text, 'week'::text, 'month'::text, 'year'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_payment_method_check') then alter table "public"."subscriptions" add constraint "subscriptions_payment_method_check" CHECK (payment_method = ANY (ARRAY['card'::text, 'payfast'::text, 'manual'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_pkey') then alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_plan_check') then alter table "public"."subscriptions" add constraint "subscriptions_plan_check" CHECK (plan = ANY (ARRAY['free'::text, 'premium'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_status_check') then alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK (status = ANY (ARRAY['active'::text, 'inactive'::text, 'cancelled'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_day_of_week_check') then alter table "public"."tutor_availability" add constraint "tutor_availability_day_of_week_check" CHECK (day_of_week = ANY (ARRAY['Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text, 'Sunday'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_pkey') then alter table "public"."tutor_availability" add constraint "tutor_availability_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_recurrence_type_check') then alter table "public"."tutor_availability" add constraint "tutor_availability_recurrence_type_check" CHECK (recurrence_type = ANY (ARRAY['none'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_tutor_email_day_of_week_start_time_end_t_key') then alter table "public"."tutor_availability" add constraint "tutor_availability_tutor_email_day_of_week_start_time_end_t_key" UNIQUE (tutor_email, day_of_week, start_time, end_time); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_booking_reference_key') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_booking_reference_key" UNIQUE (booking_reference); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_meeting_platform_check') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_meeting_platform_check" CHECK (meeting_platform = ANY (ARRAY['zoom'::text, 'teams'::text, 'google_meet'::text, 'in_person'::text, 'other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_payment_status_check') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_payment_status_check" CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'refunded'::text, 'failed'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_pkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_status_check') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_student_rating_check') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_student_rating_check" CHECK (student_rating >= 1 AND student_rating <= 5); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_tutor_rating_check') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_tutor_rating_check" CHECK (tutor_rating >= 1 AND tutor_rating <= 5); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_payout_method_check') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_payout_method_check" CHECK (payout_method = ANY (ARRAY['bank_transfer'::text, 'paypal'::text, 'stripe'::text, 'manual'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_payout_reference_key') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_payout_reference_key" UNIQUE (payout_reference); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_pkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_status_check') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'cancelled'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_pkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_rating_check') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_rating_check" CHECK (rating >= 1::numeric AND rating <= 5::numeric); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_student_email_booking_id_key') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_student_email_booking_id_key" UNIQUE (student_email, booking_id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_acceptance_response_check') then alter table "public"."university_applications" add constraint "university_applications_acceptance_response_check" CHECK (acceptance_response = ANY (ARRAY['accepted'::text, 'declined'::text, 'pending'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_application_reference_key') then alter table "public"."university_applications" add constraint "university_applications_application_reference_key" UNIQUE (application_reference); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_pkey') then alter table "public"."university_applications" add constraint "university_applications_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_stage_check') then alter table "public"."university_applications" add constraint "university_applications_stage_check" CHECK (stage = ANY (ARRAY['Saved'::text, 'Started'::text, 'Submitted'::text, 'Pending NBT'::text, 'Accepted'::text, 'Rejected'::text, 'Waitlisted'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_student_email_university_name_cours_key') then alter table "public"."university_applications" add constraint "university_applications_student_email_university_name_cours_key" UNIQUE (student_email, university_name, course); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_prospectuses"'::regclass and conname='university_prospectuses_pkey') then alter table "public"."university_prospectuses" add constraint "university_prospectuses_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_prospectuses"'::regclass and conname='university_prospectuses_university_name_year_key') then alter table "public"."university_prospectuses" add constraint "university_prospectuses_university_name_year_key" UNIQUE (university_name, year); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_posts"'::regclass and conname='forum_posts_category_check') then alter table "public"."forum_posts" add constraint "forum_posts_category_check" CHECK (category = ANY (ARRAY['University Questions'::text, 'NBT Prep'::text, 'Course Choices'::text, 'Bursaries'::text, 'General'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_posts"'::regclass and conname='forum_posts_pkey') then alter table "public"."forum_posts" add constraint "forum_posts_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_deadlines"'::regclass and conname='application_deadlines_category_check') then alter table "public"."application_deadlines" add constraint "application_deadlines_category_check" CHECK (category = ANY (ARRAY['University Application'::text, 'NBT'::text, 'Bursary'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_deadlines"'::regclass and conname='application_deadlines_pkey') then alter table "public"."application_deadlines" add constraint "application_deadlines_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."educational_resources"'::regclass and conname='educational_resources_document_type_check') then alter table "public"."educational_resources" add constraint "educational_resources_document_type_check" CHECK (document_type = ANY (ARRAY['PDF'::text, 'Word'::text, 'PowerPoint'::text, 'Excel'::text, 'Image'::text, 'Video'::text, 'Audio'::text, 'Link'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."educational_resources"'::regclass and conname='educational_resources_grade_check') then alter table "public"."educational_resources" add constraint "educational_resources_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text, 'All Grades'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."educational_resources"'::regclass and conname='educational_resources_pkey') then alter table "public"."educational_resources" add constraint "educational_resources_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."educational_resources"'::regclass and conname='educational_resources_subject_check') then alter table "public"."educational_resources" add constraint "educational_resources_subject_check" CHECK (subject = ANY (ARRAY['Mathematics'::text, 'Mathematical Literacy'::text, 'Physical Sciences'::text, 'Life Sciences'::text, 'Geography'::text, 'History'::text, 'Accounting'::text, 'Business Studies'::text, 'Economics'::text, 'English Home Language'::text, 'Life Orientation'::text, 'All Subjects'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."platform_announcements"'::regclass and conname='platform_announcements_pkey') then alter table "public"."platform_announcements" add constraint "platform_announcements_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."platform_announcements"'::regclass and conname='platform_announcements_type_check') then alter table "public"."platform_announcements" add constraint "platform_announcements_type_check" CHECK (type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'urgent'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_category_check') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_category_check" CHECK (category = ANY (ARRAY['University Application'::text, 'NBT'::text, 'Bursary'::text, 'Other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_pkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_priority_check') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_status_check') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_academic_term_check') then alter table "public"."weekly_goals" add constraint "weekly_goals_academic_term_check" CHECK (academic_term >= 1 AND academic_term <= 4); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_goal_type_check') then alter table "public"."weekly_goals" add constraint "weekly_goals_goal_type_check" CHECK (goal_type = ANY (ARRAY['quizzes_completed'::text, 'study_sessions'::text, 'subjects_studied'::text, 'tutoring_sessions'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_pkey') then alter table "public"."weekly_goals" add constraint "weekly_goals_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_priority_check') then alter table "public"."weekly_goals" add constraint "weekly_goals_priority_check" CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_status_check') then alter table "public"."weekly_goals" add constraint "weekly_goals_status_check" CHECK (status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'almost_there'::text, 'completed'::text, 'missed'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_student_email_goal_type_week_start_subject_key') then alter table "public"."weekly_goals" add constraint "weekly_goals_student_email_goal_type_week_start_subject_key" UNIQUE (student_email, goal_type, week_start, subject); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_week_number_check') then alter table "public"."weekly_goals" add constraint "weekly_goals_week_number_check" CHECK (week_number >= 1 AND week_number <= 53); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."universities"'::regclass and conname='universities_pkey') then alter table "public"."universities" add constraint "universities_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_directory"'::regclass and conname='university_directory_pkey') then alter table "public"."university_directory" add constraint "university_directory_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_directory"'::regclass and conname='university_directory_type_check') then alter table "public"."university_directory" add constraint "university_directory_type_check" CHECK (type = ANY (ARRAY['Traditional'::text, 'Comprehensive'::text, 'Distance'::text, 'University of Technology'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."legal_documents"'::regclass and conname='legal_documents_doc_key_key') then alter table "public"."legal_documents" add constraint "legal_documents_doc_key_key" UNIQUE (doc_key); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."legal_documents"'::regclass and conname='legal_documents_pkey') then alter table "public"."legal_documents" add constraint "legal_documents_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_difficulty_level_check') then alter table "public"."video_lessons" add constraint "video_lessons_difficulty_level_check" CHECK (difficulty_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text, 'expert'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_grade_check') then alter table "public"."video_lessons" add constraint "video_lessons_grade_check" CHECK (grade = ANY (ARRAY['Grade 10'::text, 'Grade 11'::text, 'Grade 12'::text, 'All Grades'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_lesson_code_key') then alter table "public"."video_lessons" add constraint "video_lessons_lesson_code_key" UNIQUE (lesson_code); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_pkey') then alter table "public"."video_lessons" add constraint "video_lessons_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_source_platform_check') then alter table "public"."video_lessons" add constraint "video_lessons_source_platform_check" CHECK (source_platform = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'own'::text, 'other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_target_grade_check') then alter table "public"."video_lessons" add constraint "video_lessons_target_grade_check" CHECK (target_grade >= 8 AND target_grade <= 12); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_video_quality_check') then alter table "public"."video_lessons" add constraint "video_lessons_video_quality_check" CHECK (video_quality = ANY (ARRAY['720p'::text, '1080p'::text, '4k'::text, 'other'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."user_consents"'::regclass and conname='user_consents_pkey') then alter table "public"."user_consents" add constraint "user_consents_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."profiles"'::regclass and conname='profiles_pkey') then alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tech_guard_services"'::regclass and conname='tech_guard_services_pkey') then alter table "public"."tech_guard_services" add constraint "tech_guard_services_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tech_guard_services"'::regclass and conname='tech_guard_services_slug_key') then alter table "public"."tech_guard_services" add constraint "tech_guard_services_slug_key" UNIQUE (slug); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tech_guard_projects"'::regclass and conname='tech_guard_projects_pkey') then alter table "public"."tech_guard_projects" add constraint "tech_guard_projects_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tech_guard_leads"'::regclass and conname='tech_guard_leads_pkey') then alter table "public"."tech_guard_leads" add constraint "tech_guard_leads_pkey" PRIMARY KEY (id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tech_guard_leads"'::regclass and conname='tech_guard_leads_status_check') then alter table "public"."tech_guard_leads" add constraint "tech_guard_leads_status_check" CHECK (status = ANY (ARRAY['new'::text, 'contacted'::text, 'closed'::text])); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."activity_log"'::regclass and conname='activity_log_user_id_fkey') then alter table "public"."activity_log" add constraint "activity_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_created_by_fkey') then alter table "public"."application_documents" add constraint "application_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_student_id_fkey') then alter table "public"."application_documents" add constraint "application_documents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_documents"'::regclass and conname='application_documents_updated_by_fkey') then alter table "public"."application_documents" add constraint "application_documents_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."banner_clicks"'::regclass and conname='banner_clicks_user_id_fkey') then alter table "public"."banner_clicks" add constraint "banner_clicks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_created_by_fkey') then alter table "public"."exam_schedule" add constraint "exam_schedule_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_student_id_fkey') then alter table "public"."exam_schedule" add constraint "exam_schedule_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."exam_schedule"'::regclass and conname='exam_schedule_updated_by_fkey') then alter table "public"."exam_schedule" add constraint "exam_schedule_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."bursaries"'::regclass and conname='bursaries_created_by_fkey') then alter table "public"."bursaries" add constraint "bursaries_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."bursaries"'::regclass and conname='bursaries_updated_by_fkey') then alter table "public"."bursaries" add constraint "bursaries_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."feature_toggles"'::regclass and conname='feature_toggles_updated_by_fkey') then alter table "public"."feature_toggles" add constraint "feature_toggles_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_approved_by_fkey') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_created_by_fkey') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_pending_approval_by_fkey') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_pending_approval_by_fkey" FOREIGN KEY (pending_approval_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."opportunity_guides"'::regclass and conname='opportunity_guides_updated_by_fkey') then alter table "public"."opportunity_guides" add constraint "opportunity_guides_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_comments"'::regclass and conname='forum_comments_author_id_fkey') then alter table "public"."forum_comments" add constraint "forum_comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_comments"'::regclass and conname='forum_comments_edited_by_fkey') then alter table "public"."forum_comments" add constraint "forum_comments_edited_by_fkey" FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_comments"'::regclass and conname='forum_comments_moderated_by_fkey') then alter table "public"."forum_comments" add constraint "forum_comments_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_comments"'::regclass and conname='forum_comments_parent_comment_id_fkey') then alter table "public"."forum_comments" add constraint "forum_comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES forum_comments(id) ON DELETE CASCADE; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_created_by_fkey') then alter table "public"."caps_documents" add constraint "caps_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."caps_documents"'::regclass and conname='caps_documents_updated_by_fkey') then alter table "public"."caps_documents" add constraint "caps_documents_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."chat_messages"'::regclass and conname='chat_messages_deleted_by_fkey') then alter table "public"."chat_messages" add constraint "chat_messages_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."chat_messages"'::regclass and conname='chat_messages_recipient_id_fkey') then alter table "public"."chat_messages" add constraint "chat_messages_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."chat_messages"'::regclass and conname='chat_messages_sender_id_fkey') then alter table "public"."chat_messages" add constraint "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_student_id_fkey') then alter table "public"."lesson_plans" add constraint "lesson_plans_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."lesson_plans"'::regclass and conname='lesson_plans_tutor_id_fkey') then alter table "public"."lesson_plans" add constraint "lesson_plans_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_approved_by_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_created_by_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_duplicate_of_id_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_duplicate_of_id_fkey" FOREIGN KEY (duplicate_of_id) REFERENCES pending_opportunity_guides(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_reviewed_by_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_submitted_by_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_opportunity_guides"'::regclass and conname='pending_opportunity_guides_updated_by_fkey') then alter table "public"."pending_opportunity_guides" add constraint "pending_opportunity_guides_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_answers"'::regclass and conname='discussion_answers_author_id_fkey') then alter table "public"."discussion_answers" add constraint "discussion_answers_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_answers"'::regclass and conname='discussion_answers_edited_by_fkey') then alter table "public"."discussion_answers" add constraint "discussion_answers_edited_by_fkey" FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_answers"'::regclass and conname='discussion_answers_moderated_by_fkey') then alter table "public"."discussion_answers" add constraint "discussion_answers_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_quiz_uuid_fkey') then alter table "public"."quiz_results" add constraint "quiz_results_quiz_uuid_fkey" FOREIGN KEY (quiz_uuid) REFERENCES quizzes(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_reviewed_by_fkey') then alter table "public"."quiz_results" add constraint "quiz_results_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quiz_results"'::regclass and conname='quiz_results_student_id_fkey') then alter table "public"."quiz_results" add constraint "quiz_results_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_created_by_fkey') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_student_id_fkey') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_registrations"'::regclass and conname='nbt_registrations_updated_by_fkey') then alter table "public"."nbt_registrations" add constraint "nbt_registrations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_created_by_id_fkey') then alter table "public"."quizzes" add constraint "quizzes_created_by_id_fkey" FOREIGN KEY (created_by_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."quizzes"'::regclass and conname='quizzes_updated_by_fkey') then alter table "public"."quizzes" add constraint "quizzes_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_test_dates"'::regclass and conname='nbt_test_dates_created_by_fkey') then alter table "public"."nbt_test_dates" add constraint "nbt_test_dates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."nbt_test_dates"'::regclass and conname='nbt_test_dates_updated_by_fkey') then alter table "public"."nbt_test_dates" add constraint "nbt_test_dates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_approved_by_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_created_by_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_duplicate_of_id_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_duplicate_of_id_fkey" FOREIGN KEY (duplicate_of_id) REFERENCES pending_university_prospectuses(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_reviewed_by_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_submitted_by_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_university_prospectuses"'::regclass and conname='pending_university_prospectuses_updated_by_fkey') then alter table "public"."pending_university_prospectuses" add constraint "pending_university_prospectuses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_posts"'::regclass and conname='discussion_posts_author_id_fkey') then alter table "public"."discussion_posts" add constraint "discussion_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."discussion_posts"'::regclass and conname='discussion_posts_edited_by_fkey') then alter table "public"."discussion_posts" add constraint "discussion_posts_edited_by_fkey" FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."users"'::regclass and conname='users_id_fkey') then alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_approved_by_fkey') then alter table "public"."resources" add constraint "resources_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_rejected_by_fkey') then alter table "public"."resources" add constraint "resources_rejected_by_fkey" FOREIGN KEY (rejected_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resources"'::regclass and conname='resources_tutor_id_fkey') then alter table "public"."resources" add constraint "resources_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_bookmarks"'::regclass and conname='resource_bookmarks_resource_uuid_fkey') then alter table "public"."resource_bookmarks" add constraint "resource_bookmarks_resource_uuid_fkey" FOREIGN KEY (resource_uuid) REFERENCES resources(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_bookmarks"'::regclass and conname='resource_bookmarks_user_id_fkey') then alter table "public"."resource_bookmarks" add constraint "resource_bookmarks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_moderated_by_fkey') then alter table "public"."resource_ratings" add constraint "resource_ratings_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_resource_uuid_fkey') then alter table "public"."resource_ratings" add constraint "resource_ratings_resource_uuid_fkey" FOREIGN KEY (resource_uuid) REFERENCES resources(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."resource_ratings"'::regclass and conname='resource_ratings_user_id_fkey') then alter table "public"."resource_ratings" add constraint "resource_ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."school_counselors"'::regclass and conname='school_counselors_counselor_id_fkey') then alter table "public"."school_counselors" add constraint "school_counselors_counselor_id_fkey" FOREIGN KEY (counselor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."school_counselors"'::regclass and conname='school_counselors_created_by_fkey') then alter table "public"."school_counselors" add constraint "school_counselors_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."school_counselors"'::regclass and conname='school_counselors_updated_by_fkey') then alter table "public"."school_counselors" add constraint "school_counselors_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_notes"'::regclass and conname='student_notes_student_id_fkey') then alter table "public"."student_notes" add constraint "student_notes_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_notes"'::regclass and conname='student_notes_tutor_id_fkey') then alter table "public"."student_notes" add constraint "student_notes_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_created_by_fkey') then alter table "public"."student_progress" add constraint "student_progress_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_student_id_fkey') then alter table "public"."student_progress" add constraint "student_progress_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."student_progress"'::regclass and conname='student_progress_updated_by_fkey') then alter table "public"."student_progress" add constraint "student_progress_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_created_by_fkey') then alter table "public"."study_reminders" add constraint "study_reminders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_student_id_fkey') then alter table "public"."study_reminders" add constraint "study_reminders_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_reminders"'::regclass and conname='study_reminders_updated_by_fkey') then alter table "public"."study_reminders" add constraint "study_reminders_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_created_by_fkey') then alter table "public"."subjects" add constraint "subjects_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subjects"'::regclass and conname='subjects_updated_by_fkey') then alter table "public"."subjects" add constraint "subjects_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_author_id_fkey') then alter table "public"."study_room_posts" add constraint "study_room_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_created_by_fkey') then alter table "public"."study_room_posts" add constraint "study_room_posts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_last_reply_by_fkey') then alter table "public"."study_room_posts" add constraint "study_room_posts_last_reply_by_fkey" FOREIGN KEY (last_reply_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_room_posts"'::regclass and conname='study_room_posts_updated_by_fkey') then alter table "public"."study_room_posts" add constraint "study_room_posts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_created_by_fkey') then alter table "public"."study_sessions" add constraint "study_sessions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_student_id_fkey') then alter table "public"."study_sessions" add constraint "study_sessions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."study_sessions"'::regclass and conname='study_sessions_updated_by_fkey') then alter table "public"."study_sessions" add constraint "study_sessions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_created_by_fkey') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_updated_by_fkey') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_profiles"'::regclass and conname='tutor_profiles_user_id_fkey') then alter table "public"."tutor_profiles" add constraint "tutor_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."system_configuration"'::regclass and conname='system_configuration_updated_by_fkey') then alter table "public"."system_configuration" add constraint "system_configuration_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_created_by_fkey') then alter table "public"."subscriptions" add constraint "subscriptions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_updated_by_fkey') then alter table "public"."subscriptions" add constraint "subscriptions_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."subscriptions"'::regclass and conname='subscriptions_user_id_fkey') then alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_created_by_fkey') then alter table "public"."tutor_availability" add constraint "tutor_availability_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_tutor_id_fkey') then alter table "public"."tutor_availability" add constraint "tutor_availability_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_tutor_profile_id_fkey') then alter table "public"."tutor_availability" add constraint "tutor_availability_tutor_profile_id_fkey" FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_availability"'::regclass and conname='tutor_availability_updated_by_fkey') then alter table "public"."tutor_availability" add constraint "tutor_availability_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_availability_id_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_availability_id_fkey" FOREIGN KEY (availability_id) REFERENCES tutor_availability(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_cancelled_by_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_created_by_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_rescheduled_from_id_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_rescheduled_from_id_fkey" FOREIGN KEY (rescheduled_from_id) REFERENCES tutor_bookings(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_student_id_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_tutor_id_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_tutor_profile_id_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_tutor_profile_id_fkey" FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_bookings"'::regclass and conname='tutor_bookings_updated_by_fkey') then alter table "public"."tutor_bookings" add constraint "tutor_bookings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_booking_id_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES tutor_bookings(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_created_by_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_processed_by_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_tutor_id_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_tutor_profile_id_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_tutor_profile_id_fkey" FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_payouts"'::regclass and conname='tutor_payouts_updated_by_fkey') then alter table "public"."tutor_payouts" add constraint "tutor_payouts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_booking_uuid_fkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_booking_uuid_fkey" FOREIGN KEY (booking_uuid) REFERENCES tutor_bookings(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_moderated_by_fkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_student_id_fkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_tutor_id_fkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."tutor_reviews"'::regclass and conname='tutor_reviews_tutor_profile_id_fkey') then alter table "public"."tutor_reviews" add constraint "tutor_reviews_tutor_profile_id_fkey" FOREIGN KEY (tutor_profile_id) REFERENCES tutor_profiles(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_counselor_assigned_fkey') then alter table "public"."university_applications" add constraint "university_applications_counselor_assigned_fkey" FOREIGN KEY (counselor_assigned) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_created_by_fkey') then alter table "public"."university_applications" add constraint "university_applications_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_student_id_fkey') then alter table "public"."university_applications" add constraint "university_applications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_applications"'::regclass and conname='university_applications_updated_by_fkey') then alter table "public"."university_applications" add constraint "university_applications_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_prospectuses"'::regclass and conname='university_prospectuses_approved_by_fkey') then alter table "public"."university_prospectuses" add constraint "university_prospectuses_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_prospectuses"'::regclass and conname='university_prospectuses_created_by_fkey') then alter table "public"."university_prospectuses" add constraint "university_prospectuses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."university_prospectuses"'::regclass and conname='university_prospectuses_updated_by_fkey') then alter table "public"."university_prospectuses" add constraint "university_prospectuses_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_posts"'::regclass and conname='forum_posts_author_id_fkey') then alter table "public"."forum_posts" add constraint "forum_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."forum_posts"'::regclass and conname='forum_posts_edited_by_fkey') then alter table "public"."forum_posts" add constraint "forum_posts_edited_by_fkey" FOREIGN KEY (edited_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_deadlines"'::regclass and conname='application_deadlines_approved_by_fkey') then alter table "public"."application_deadlines" add constraint "application_deadlines_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_deadlines"'::regclass and conname='application_deadlines_created_by_fkey') then alter table "public"."application_deadlines" add constraint "application_deadlines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."application_deadlines"'::regclass and conname='application_deadlines_updated_by_fkey') then alter table "public"."application_deadlines" add constraint "application_deadlines_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."educational_resources"'::regclass and conname='educational_resources_uploaded_by_id_fkey') then alter table "public"."educational_resources" add constraint "educational_resources_uploaded_by_id_fkey" FOREIGN KEY (uploaded_by_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."platform_announcements"'::regclass and conname='platform_announcements_created_by_fkey') then alter table "public"."platform_announcements" add constraint "platform_announcements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."platform_announcements"'::regclass and conname='platform_announcements_updated_by_fkey') then alter table "public"."platform_announcements" add constraint "platform_announcements_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_approved_by_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_created_by_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_duplicate_of_id_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_duplicate_of_id_fkey" FOREIGN KEY (duplicate_of_id) REFERENCES pending_application_deadlines(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_reviewed_by_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_submitted_by_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."pending_application_deadlines"'::regclass and conname='pending_application_deadlines_updated_by_fkey') then alter table "public"."pending_application_deadlines" add constraint "pending_application_deadlines_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_created_by_fkey') then alter table "public"."weekly_goals" add constraint "weekly_goals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_student_id_fkey') then alter table "public"."weekly_goals" add constraint "weekly_goals_student_id_fkey" FOREIGN KEY (student_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."weekly_goals"'::regclass and conname='weekly_goals_updated_by_fkey') then alter table "public"."weekly_goals" add constraint "weekly_goals_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."legal_documents"'::regclass and conname='legal_documents_created_by_fkey') then alter table "public"."legal_documents" add constraint "legal_documents_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."legal_documents"'::regclass and conname='legal_documents_updated_by_fkey') then alter table "public"."legal_documents" add constraint "legal_documents_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id); end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_created_by_fkey') then alter table "public"."video_lessons" add constraint "video_lessons_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_tutor_id_fkey') then alter table "public"."video_lessons" add constraint "video_lessons_tutor_id_fkey" FOREIGN KEY (tutor_id) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."video_lessons"'::regclass and conname='video_lessons_updated_by_fkey') then alter table "public"."video_lessons" add constraint "video_lessons_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."user_consents"'::regclass and conname='user_consents_user_id_fkey') then alter table "public"."user_consents" add constraint "user_consents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$do $constraint$ begin if not exists(select 1 from pg_constraint where conrelid='"public"."profiles"'::regclass and conname='profiles_id_fkey') then alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; end if;end $constraint$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.sync_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.users
  SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    role,
    full_name,
    onboarding_complete,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    FALSE,
    TRUE,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.is_tutor(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM tutor_profiles
    WHERE user_id = user_id::UUID
    AND is_verified = true
  );
END;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.protect_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- If the caller is not an admin, they cannot touch privileged columns.
  if not public.is_admin(auth.uid()) then
    if new.role is distinct from old.role then
      raise exception 'Not allowed to modify role column';
    end if;
    if new.is_super_admin is distinct from old.is_super_admin then
      raise exception 'Not allowed to modify is_super_admin column';
    end if;
    if new.is_premium is distinct from old.is_premium then
      raise exception 'Not allowed to modify is_premium column';
    end if;
  end if;
  return new;
end;
$function$;$baseline_ddl$;
execute $baseline_ddl$CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = user_id
      AND is_super_admin = true
  );
$function$;$baseline_ddl$;
execute $baseline_ddl$create or replace view public."user_profiles" with (security_invoker=on) as  SELECT id,
    email,
    session_platform,
    in_session
   FROM users;$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_activity_log_user_email ON public.activity_log USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON public.activity_log USING btree (event_type);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."activity_log" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."activity_log" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."activity_log" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."activity_log" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."activity_log" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_doc_type ON public.application_documents USING btree (doc_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_status ON public.application_documents USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_created_at ON public.application_documents USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_student_id ON public.application_documents USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_student_email ON public.application_documents USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON public.application_documents USING btree (application_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."application_documents" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."application_documents" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_documents" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_documents" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_documents" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_banner_clicks_user_email ON public.banner_clicks USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_banner_clicks_click_timestamp ON public.banner_clicks USING btree (click_timestamp DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_banner_clicks_user_id ON public.banner_clicks USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_banner_clicks_banner_name ON public.banner_clicks USING btree (banner_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_banner_clicks_created_at ON public.banner_clicks USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."banner_clicks" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."banner_clicks" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."banner_clicks" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."banner_clicks" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."banner_clicks" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_student_email ON public.exam_schedule USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_is_published ON public.exam_schedule USING btree (is_published);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_exam_type ON public.exam_schedule USING btree (exam_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_exam_date ON public.exam_schedule USING btree (exam_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_subject ON public.exam_schedule USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_student_id ON public.exam_schedule USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_grade ON public.exam_schedule USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_exam_schedule_created_at ON public.exam_schedule USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."exam_schedule" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."exam_schedule" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."exam_schedule" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."exam_schedule" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."exam_schedule" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_is_active ON public.bursaries USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_min_average ON public.bursaries USING btree (min_average);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_fields_of_study ON public.bursaries USING gin (fields_of_study);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_max_household_income ON public.bursaries USING btree (max_household_income);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_provider ON public.bursaries USING btree (provider);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_name ON public.bursaries USING btree (name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_deadline ON public.bursaries USING btree (deadline);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_created_at ON public.bursaries USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_bursaries_provinces ON public.bursaries USING gin (provinces);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."bursaries" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."bursaries" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."bursaries" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."bursaries" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."bursaries" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_feature_toggles_created_at ON public.feature_toggles USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_feature_toggles_feature_category ON public.feature_toggles USING btree (feature_category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_feature_toggles_environment ON public.feature_toggles USING btree (environment);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_feature_toggles_feature_key ON public.feature_toggles USING btree (feature_key);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_feature_toggles_is_enabled ON public.feature_toggles USING btree (is_enabled);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."feature_toggles" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."feature_toggles" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."feature_toggles" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."feature_toggles" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."feature_toggles" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_download_count ON public.opportunity_guides USING btree (download_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_tags ON public.opportunity_guides USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_category ON public.opportunity_guides USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_is_active ON public.opportunity_guides USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_title ON public.opportunity_guides USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_is_featured ON public.opportunity_guides USING btree (is_featured);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_opportunity_guides_created_at ON public.opportunity_guides USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."opportunity_guides" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."opportunity_guides" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."opportunity_guides" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."opportunity_guides" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."opportunity_guides" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_created_at ON public.forum_comments USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_is_removed ON public.forum_comments USING btree (is_removed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_post_id ON public.forum_comments USING btree (post_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_likes ON public.forum_comments USING btree (likes DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_is_best_answer ON public.forum_comments USING btree (is_best_answer);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_author_id ON public.forum_comments USING btree (author_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_comments_author_email ON public.forum_comments USING btree (author_email);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."forum_comments" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."forum_comments" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_comments" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_comments" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_comments" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_subject ON public.caps_documents USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_grade ON public.caps_documents USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_is_active ON public.caps_documents USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_title ON public.caps_documents USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_created_at ON public.caps_documents USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_download_count ON public.caps_documents USING btree (download_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_document_type ON public.caps_documents USING btree (document_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_caps_documents_year ON public.caps_documents USING btree (year);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."caps_documents" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."caps_documents" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."caps_documents" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."caps_documents" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."caps_documents" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_email ON public.chat_messages USING btree (sender_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_email ON public.chat_messages USING btree (recipient_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages USING btree (sender_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_recipient_id ON public.chat_messages USING btree (recipient_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages USING btree (room_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_is_read ON public.chat_messages USING btree (is_read);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."chat_messages" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."chat_messages" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."chat_messages" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."chat_messages" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."chat_messages" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_tutor_id ON public.lesson_plans USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_grade ON public.lesson_plans USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_tutor_email ON public.lesson_plans USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_session_date ON public.lesson_plans USING btree (session_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_student_id ON public.lesson_plans USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_status ON public.lesson_plans USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON public.lesson_plans USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_created_at ON public.lesson_plans USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_lesson_plans_student_email ON public.lesson_plans USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."lesson_plans" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."lesson_plans" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."lesson_plans" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."lesson_plans" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."lesson_plans" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_opportunity_guides_category ON public.pending_opportunity_guides USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_opportunity_guides_created_at ON public.pending_opportunity_guides USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_opportunity_guides_status ON public.pending_opportunity_guides USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_opportunity_guides_submitted_by ON public.pending_opportunity_guides USING btree (submitted_by);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_opportunity_guides_title ON public.pending_opportunity_guides USING btree (title);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."pending_opportunity_guides" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."pending_opportunity_guides" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_opportunity_guides" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_opportunity_guides" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_opportunity_guides" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_post_id ON public.discussion_answers USING btree (post_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_author_email ON public.discussion_answers USING btree (author_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_is_accepted ON public.discussion_answers USING btree (is_accepted);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_upvotes ON public.discussion_answers USING btree (upvotes DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_author_id ON public.discussion_answers USING btree (author_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_answers_created_at ON public.discussion_answers USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."discussion_answers" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."discussion_answers" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_answers" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_answers" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_answers" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_subject ON public.quiz_results USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_student_email ON public.quiz_results USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_grade ON public.quiz_results USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_percentage ON public.quiz_results USING btree (percentage DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_uuid ON public.quiz_results USING btree (quiz_uuid);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_created_at ON public.quiz_results USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON public.quiz_results USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results USING btree (quiz_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_passed ON public.quiz_results USING btree (passed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quiz_results_completed_at ON public.quiz_results USING btree (completed_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."quiz_results" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."quiz_results" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quiz_results" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quiz_results" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quiz_results" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_created_at ON public.nbt_registrations USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_status ON public.nbt_registrations USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_nbt_test_date_id ON public.nbt_registrations USING btree (nbt_test_date_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_tests_registered ON public.nbt_registrations USING gin (tests_registered);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_student_id ON public.nbt_registrations USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_student_email ON public.nbt_registrations USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_registrations_test_date ON public.nbt_registrations USING btree (test_date);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."nbt_registrations" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."nbt_registrations" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_registrations" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_registrations" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_registrations" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON public.quizzes USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes USING btree (created_by);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_created_by_id ON public.quizzes USING btree (created_by_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_tags ON public.quizzes USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_title ON public.quizzes USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON public.quizzes USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON public.quizzes USING btree (is_published);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_difficulty_level ON public.quizzes USING btree (difficulty_level);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON public.quizzes USING btree (quiz_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_quizzes_grade ON public.quizzes USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."quizzes" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."quizzes" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quizzes" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quizzes" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."quizzes" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_province ON public.nbt_test_dates USING btree (province);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_is_active ON public.nbt_test_dates USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_venue ON public.nbt_test_dates USING btree (venue);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_test_date ON public.nbt_test_dates USING btree (test_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_city ON public.nbt_test_dates USING btree (city);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_created_at ON public.nbt_test_dates USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_registration_deadline ON public.nbt_test_dates USING btree (registration_deadline);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_nbt_test_dates_tests_available ON public.nbt_test_dates USING gin (tests_available);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."nbt_test_dates" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."nbt_test_dates" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_test_dates" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_test_dates" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."nbt_test_dates" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_university_prospectuses_status ON public.pending_university_prospectuses USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_university_prospectuses_year ON public.pending_university_prospectuses USING btree (year);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_university_prospectuses_submitted_by ON public.pending_university_prospectuses USING btree (submitted_by);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_university_prospectuses_university_name ON public.pending_university_prospectuses USING btree (university_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_university_prospectuses_created_at ON public.pending_university_prospectuses USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."pending_university_prospectuses" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."pending_university_prospectuses" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_university_prospectuses" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_university_prospectuses" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_university_prospectuses" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_is_removed ON public.discussion_posts USING btree (is_removed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_subject ON public.discussion_posts USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_upvotes ON public.discussion_posts USING btree (upvotes DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_topic ON public.discussion_posts USING btree (topic);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_at ON public.discussion_posts USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_author_email ON public.discussion_posts USING btree (author_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_is_answered ON public.discussion_posts USING btree (is_answered);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_tags ON public.discussion_posts USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_discussion_posts_author_id ON public.discussion_posts USING btree (author_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."discussion_posts" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."discussion_posts" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_posts" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_posts" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."discussion_posts" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_is_premium ON public.users USING btree (is_premium);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_role ON public.users USING btree (role);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_province ON public.users USING btree (province);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_linked_student_email ON public.users USING btree (linked_student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_sace_number ON public.users USING btree (sace_number);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_users_email ON public.users USING btree (email);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."users" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."users" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."users" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."users" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."users" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_tutor_id ON public.resources USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources USING btree (type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_grade ON public.resources USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_is_premium ON public.resources USING btree (is_premium);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_tags ON public.resources USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_download_count ON public.resources USING btree (download_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_title ON public.resources USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_is_approved ON public.resources USING btree (is_approved);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_tutor_email ON public.resources USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resources_subject ON public.resources USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."resources" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."resources" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resources" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resources" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resources" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_resource_id ON public.resource_bookmarks USING btree (resource_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_resource_uuid ON public.resource_bookmarks USING btree (resource_uuid);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_category ON public.resource_bookmarks USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_created_at ON public.resource_bookmarks USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_grade ON public.resource_bookmarks USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_user_email ON public.resource_bookmarks USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_user_id ON public.resource_bookmarks USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_subject ON public.resource_bookmarks USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."resource_bookmarks" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."resource_bookmarks" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_bookmarks" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_bookmarks" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_bookmarks" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource_uuid ON public.resource_ratings USING btree (resource_uuid);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_created_at ON public.resource_ratings USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_rating ON public.resource_ratings USING btree (rating);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_user_email ON public.resource_ratings USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_user_id ON public.resource_ratings USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_resource_ratings_resource_id ON public.resource_ratings USING btree (resource_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."resource_ratings" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."resource_ratings" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_ratings" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_ratings" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."resource_ratings" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_counselor_email ON public.school_counselors USING btree (counselor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_is_active ON public.school_counselors USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_counselor_id ON public.school_counselors USING btree (counselor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_school_name ON public.school_counselors USING btree (school_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_is_verified ON public.school_counselors USING btree (is_verified);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_school_counselors_created_at ON public.school_counselors USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."school_counselors" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."school_counselors" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."school_counselors" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."school_counselors" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."school_counselors" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_session_date ON public.student_notes USING btree (session_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_student_email ON public.student_notes USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_tutor_id ON public.student_notes USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_subject ON public.student_notes USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_mood ON public.student_notes USING btree (mood);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_tutor_email ON public.student_notes USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_created_at ON public.student_notes USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON public.student_notes USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."student_notes" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."student_notes" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_notes" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_notes" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_notes" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON public.student_progress USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_student_email ON public.student_progress USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_grade ON public.student_progress USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_at_risk ON public.student_progress USING btree (at_risk);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_subject ON public.student_progress USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_status ON public.student_progress USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_last_accessed ON public.student_progress USING btree (last_accessed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_student_progress_created_at ON public.student_progress USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."student_progress" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."student_progress" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_progress" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_progress" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."student_progress" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_created_at ON public.study_reminders USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_student_email ON public.study_reminders USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_is_active ON public.study_reminders USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_day_of_week ON public.study_reminders USING btree (day_of_week);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_subject ON public.study_reminders USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_reminders_student_id ON public.study_reminders USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."study_reminders" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."study_reminders" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_reminders" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_reminders" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_reminders" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_category ON public.subjects USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_is_active ON public.subjects USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_is_published ON public.subjects USING btree (is_published);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects USING btree (name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_code ON public.subjects USING btree (code);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_grades ON public.subjects USING gin (grades);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_caps_grade ON public.subjects USING btree (caps_grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subjects_created_at ON public.subjects USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."subjects" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."subjects" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subjects" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subjects" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subjects" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_room_id ON public.study_room_posts USING btree (room_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_author_id ON public.study_room_posts USING btree (author_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_created_at ON public.study_room_posts USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_view_count ON public.study_room_posts USING btree (view_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_author_email ON public.study_room_posts USING btree (author_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_type ON public.study_room_posts USING btree (type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_is_hidden ON public.study_room_posts USING btree (is_hidden);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_is_pinned ON public.study_room_posts USING btree (is_pinned);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_room_posts_subject ON public.study_room_posts USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."study_room_posts" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."study_room_posts" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_room_posts" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_room_posts" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_room_posts" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON public.study_sessions USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_student_id ON public.study_sessions USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON public.study_sessions USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_hour ON public.study_sessions USING btree (hour);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON public.study_sessions USING btree (date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_student_email ON public.study_sessions USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_study_sessions_is_completed ON public.study_sessions USING btree (is_completed);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."study_sessions" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."study_sessions" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_sessions" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_sessions" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."study_sessions" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_rating ON public.tutor_profiles USING btree (rating);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_verified ON public.tutor_profiles USING btree (is_verified);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_subjects ON public.tutor_profiles USING gin (subjects);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_teaching_languages ON public.tutor_profiles USING gin (teaching_languages);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_premium ON public.tutor_profiles USING btree (is_premium);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_grades ON public.tutor_profiles USING gin (grades);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_email ON public.tutor_profiles USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_active ON public.tutor_profiles USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_created_at ON public.tutor_profiles USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_is_available ON public.tutor_profiles USING btree (is_available);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_profiles_user_id ON public.tutor_profiles USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tutor_profiles" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tutor_profiles" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_profiles" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_profiles" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_profiles" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_system_configuration_is_active ON public.system_configuration USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_system_configuration_key ON public.system_configuration USING btree (key);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_system_configuration_created_at ON public.system_configuration USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_system_configuration_category ON public.system_configuration USING btree (category);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."system_configuration" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."system_configuration" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."system_configuration" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."system_configuration" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."system_configuration" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at ON public.subscriptions USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions USING btree (end_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions USING btree (plan);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_start_date ON public.subscriptions USING btree (start_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_user_email ON public.subscriptions USING btree (user_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."subscriptions" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."subscriptions" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subscriptions" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subscriptions" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."subscriptions" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_id ON public.tutor_availability USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_is_available ON public.tutor_availability USING btree (is_available);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_profile_id ON public.tutor_availability USING btree (tutor_profile_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_created_at ON public.tutor_availability USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_start_time ON public.tutor_availability USING btree (start_time);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_day_of_week ON public.tutor_availability USING btree (day_of_week);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_end_time ON public.tutor_availability USING btree (end_time);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_availability_tutor_email ON public.tutor_availability USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tutor_availability" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tutor_availability" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_availability" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_availability" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_availability" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_student_id ON public.tutor_bookings USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_subject ON public.tutor_bookings USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_availability_id ON public.tutor_bookings USING btree (availability_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_status ON public.tutor_bookings USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_student_email ON public.tutor_bookings USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_tutor_email ON public.tutor_bookings USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_date ON public.tutor_bookings USING btree (date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_tutor_profile_id ON public.tutor_bookings USING btree (tutor_profile_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_created_at ON public.tutor_bookings USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_booking_reference ON public.tutor_bookings USING btree (booking_reference);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_bookings_tutor_id ON public.tutor_bookings USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tutor_bookings" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tutor_bookings" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_bookings" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_bookings" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_bookings" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_tutor_id ON public.tutor_payouts USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_payout_reference ON public.tutor_payouts USING btree (payout_reference);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_created_at ON public.tutor_payouts USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_payout_date ON public.tutor_payouts USING btree (payout_date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_status ON public.tutor_payouts USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_tutor_email ON public.tutor_payouts USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_booking_id ON public.tutor_payouts USING btree (booking_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_payouts_booking_reference ON public.tutor_payouts USING btree (booking_reference);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tutor_payouts" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tutor_payouts" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_payouts" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_payouts" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_payouts" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_email ON public.tutor_reviews USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_student_id ON public.tutor_reviews USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_email ON public.tutor_reviews USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_rating ON public.tutor_reviews USING btree (rating);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_id ON public.tutor_reviews USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_booking_id ON public.tutor_reviews USING btree (booking_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_booking_uuid ON public.tutor_reviews USING btree (booking_uuid);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_tutor_profile_id ON public.tutor_reviews USING btree (tutor_profile_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_subject ON public.tutor_reviews USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_tutor_reviews_created_at ON public.tutor_reviews USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tutor_reviews" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tutor_reviews" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_reviews" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_reviews" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tutor_reviews" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_student_id ON public.university_applications USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_university_name ON public.university_applications USING btree (university_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_application_reference ON public.university_applications USING btree (application_reference);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_created_at ON public.university_applications USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_deadline ON public.university_applications USING btree (deadline);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_student_email ON public.university_applications USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_applications_stage ON public.university_applications USING btree (stage);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."university_applications" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."university_applications" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_applications" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_applications" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_applications" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_created_at ON public.university_prospectuses USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_download_count ON public.university_prospectuses USING btree (download_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_university_name ON public.university_prospectuses USING btree (university_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_year ON public.university_prospectuses USING btree (year);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_is_featured ON public.university_prospectuses USING btree (is_featured);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_tags ON public.university_prospectuses USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_is_approved ON public.university_prospectuses USING btree (is_approved);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_university_prospectuses_is_active ON public.university_prospectuses USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."university_prospectuses" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."university_prospectuses" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_prospectuses" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_prospectuses" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_prospectuses" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_is_pinned ON public.forum_posts USING btree (is_pinned);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_author_email ON public.forum_posts USING btree (author_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_is_removed ON public.forum_posts USING btree (is_removed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_comment_count ON public.forum_posts USING btree (comment_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_tags ON public.forum_posts USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_likes ON public.forum_posts USING btree (likes DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_category ON public.forum_posts USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_created_at ON public.forum_posts USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_university_tag ON public.forum_posts USING btree (university_tag);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_forum_posts_author_id ON public.forum_posts USING btree (author_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."forum_posts" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."forum_posts" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_posts" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_posts" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."forum_posts" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_deadlines_created_at ON public.application_deadlines USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_deadlines_category ON public.application_deadlines USING btree (category);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_deadlines_university ON public.application_deadlines USING btree (university);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_deadlines_date ON public.application_deadlines USING btree (date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_application_deadlines_is_active ON public.application_deadlines USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."application_deadlines" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."application_deadlines" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_deadlines" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_deadlines" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."application_deadlines" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_uploaded_by ON public.educational_resources USING btree (uploaded_by);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_caps_alignment_tag ON public.educational_resources USING btree (caps_alignment_tag);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_title ON public.educational_resources USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_is_active ON public.educational_resources USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_grade ON public.educational_resources USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_tags ON public.educational_resources USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_subject ON public.educational_resources USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_download_count ON public.educational_resources USING btree (download_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_educational_resources_created_at ON public.educational_resources USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."educational_resources" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."educational_resources" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."educational_resources" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."educational_resources" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."educational_resources" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_created_at ON public.platform_announcements USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_priority ON public.platform_announcements USING btree (priority DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_is_pinned ON public.platform_announcements USING btree (is_pinned);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_type ON public.platform_announcements USING btree (type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_audience ON public.platform_announcements USING gin (audience);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_is_active ON public.platform_announcements USING btree (is_active);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_platform_announcements_expires_at ON public.platform_announcements USING btree (expires_at);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."platform_announcements" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."platform_announcements" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."platform_announcements" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."platform_announcements" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."platform_announcements" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_event_name ON public.pending_application_deadlines USING btree (event_name);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_university ON public.pending_application_deadlines USING btree (university);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_date ON public.pending_application_deadlines USING btree (date);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_created_at ON public.pending_application_deadlines USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_submitted_by ON public.pending_application_deadlines USING btree (submitted_by);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_status ON public.pending_application_deadlines USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_pending_application_deadlines_category ON public.pending_application_deadlines USING btree (category);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."pending_application_deadlines" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."pending_application_deadlines" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_application_deadlines" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_application_deadlines" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."pending_application_deadlines" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_student_email ON public.weekly_goals USING btree (student_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_is_completed ON public.weekly_goals USING btree (is_completed);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_student_id ON public.weekly_goals USING btree (student_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_created_at ON public.weekly_goals USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_goal_type ON public.weekly_goals USING btree (goal_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_week_start ON public.weekly_goals USING btree (week_start);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_status ON public.weekly_goals USING btree (status);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_weekly_goals_subject ON public.weekly_goals USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."weekly_goals" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."weekly_goals" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."weekly_goals" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."weekly_goals" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."weekly_goals" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."universities" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."universities" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."universities" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."universities" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."universities" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."university_directory" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."university_directory" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_directory" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_directory" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."university_directory" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."legal_documents" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."legal_documents" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."legal_documents" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."legal_documents" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."legal_documents" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_lesson_code ON public.video_lessons USING btree (lesson_code);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_subject ON public.video_lessons USING btree (subject);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_title ON public.video_lessons USING btree (title);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_created_at ON public.video_lessons USING btree (created_at DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_tutor_email ON public.video_lessons USING btree (tutor_email);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_is_premium ON public.video_lessons USING btree (is_premium);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_tutor_id ON public.video_lessons USING btree (tutor_id);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_tags ON public.video_lessons USING gin (tags);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_is_approved ON public.video_lessons USING btree (is_approved);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_grade ON public.video_lessons USING btree (grade);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_view_count ON public.video_lessons USING btree (view_count DESC);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_video_lessons_is_published ON public.video_lessons USING btree (is_published);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."video_lessons" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."video_lessons" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."video_lessons" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."video_lessons" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."video_lessons" to "service_role";$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_user_consents_consent_type ON public.user_consents USING btree (consent_type);$baseline_ddl$;
execute $baseline_ddl$CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents USING btree (user_id);$baseline_ddl$;
execute $baseline_ddl$alter table "public"."user_consents" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."user_consents" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."user_consents" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."user_consents" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."user_consents" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."profiles" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."profiles" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."profiles" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."profiles" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."profiles" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tech_guard_services" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tech_guard_services" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_services" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_services" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_services" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tech_guard_projects" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tech_guard_projects" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_projects" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_projects" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_projects" to "service_role";$baseline_ddl$;
execute $baseline_ddl$alter table "public"."tech_guard_leads" enable row level security;$baseline_ddl$;
execute $baseline_ddl$revoke all on table "public"."tech_guard_leads" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_leads" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_leads" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table "public"."tech_guard_leads" to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function sync_user_update() from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function sync_user_update() to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function sync_user_update() to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function sync_user_update() to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function sync_user_update() to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function update_updated_at_column() from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function update_updated_at_column() to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function update_updated_at_column() to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function update_updated_at_column() to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function update_updated_at_column() to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function handle_new_user() from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function handle_new_user() to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function handle_new_user() to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function handle_new_user() to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function handle_new_user() to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function rls_auto_enable() from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function rls_auto_enable() to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function rls_auto_enable() to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function rls_auto_enable() to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function rls_auto_enable() to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function is_tutor(uuid) from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_tutor(uuid) to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_tutor(uuid) to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_tutor(uuid) to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_tutor(uuid) to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function protect_privileged_columns() from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function protect_privileged_columns() to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function protect_privileged_columns() to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function protect_privileged_columns() to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function protect_privileged_columns() to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on function is_admin(uuid) from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_admin(uuid) to public;$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_admin(uuid) to "anon";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_admin(uuid) to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant EXECUTE on function is_admin(uuid) to "service_role";$baseline_ddl$;
execute $baseline_ddl$revoke all on table public."user_profiles" from public,anon,authenticated,service_role;$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table public."user_profiles" to "anon";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table public."user_profiles" to "authenticated";$baseline_ddl$;
execute $baseline_ddl$grant DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE on table public."user_profiles" to "service_role";$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."activity_log"'::regclass and polname='Only admins can delete activity logs') then create policy "Only admins can delete activity logs" on "public"."activity_log" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."activity_log"'::regclass and polname='Only admins can view activity logs') then create policy "Only admins can view activity logs" on "public"."activity_log" as permissive for select to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."activity_log"'::regclass and polname='System can insert activity logs') then create policy "System can insert activity logs" on "public"."activity_log" as permissive for insert to public with check (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."application_documents"'::regclass and polname='Only admins can delete app documents') then create policy "Only admins can delete app documents" on "public"."application_documents" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."application_documents"'::regclass and polname='Students can create app documents') then create policy "Students can create app documents" on "public"."application_documents" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."application_documents"'::regclass and polname='Students can update own app documents') then create policy "Students can update own app documents" on "public"."application_documents" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."application_documents"'::regclass and polname='Students can view own app documents') then create policy "Students can view own app documents" on "public"."application_documents" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_comments"'::regclass and polname='Anyone can view forum comments') then create policy "Anyone can view forum comments" on "public"."forum_comments" as permissive for select to public using (((is_removed = false) OR (is_removed IS NULL)));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_comments"'::regclass and polname='Users can create forum comments') then create policy "Users can create forum comments" on "public"."forum_comments" as permissive for insert to public with check ((auth.uid() = author_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_comments"'::regclass and polname='Users can delete own comments') then create policy "Users can delete own comments" on "public"."forum_comments" as permissive for delete to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_comments"'::regclass and polname='Users can update own comments') then create policy "Users can update own comments" on "public"."forum_comments" as permissive for update to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."caps_documents"'::regclass and polname='Anyone can view CAPS documents') then create policy "Anyone can view CAPS documents" on "public"."caps_documents" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."caps_documents"'::regclass and polname='Only admins can manage CAPS documents') then create policy "Only admins can manage CAPS documents" on "public"."caps_documents" as permissive for all to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."chat_messages"'::regclass and polname='Only admins can delete messages') then create policy "Only admins can delete messages" on "public"."chat_messages" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."chat_messages"'::regclass and polname='Users can send messages') then create policy "Users can send messages" on "public"."chat_messages" as permissive for insert to public with check ((auth.uid() = sender_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."chat_messages"'::regclass and polname='Users can update own messages') then create policy "Users can update own messages" on "public"."chat_messages" as permissive for update to public using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id)));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."chat_messages"'::regclass and polname='Users can view own messages') then create policy "Users can view own messages" on "public"."chat_messages" as permissive for select to public using (((auth.uid() = sender_id) OR (auth.uid() = recipient_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."lesson_plans"'::regclass and polname='Students can view lesson plans') then create policy "Students can view lesson plans" on "public"."lesson_plans" as permissive for select to public using ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."lesson_plans"'::regclass and polname='Tutors can create lesson plans') then create policy "Tutors can create lesson plans" on "public"."lesson_plans" as permissive for insert to public with check (((auth.uid() = tutor_id) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."lesson_plans"'::regclass and polname='Tutors can update own lesson plans') then create policy "Tutors can update own lesson plans" on "public"."lesson_plans" as permissive for update to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."lesson_plans"'::regclass and polname='Tutors can view own lesson plans') then create policy "Tutors can view own lesson plans" on "public"."lesson_plans" as permissive for select to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_answers"'::regclass and polname='Anyone can view discussion answers') then create policy "Anyone can view discussion answers" on "public"."discussion_answers" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_answers"'::regclass and polname='Users can create discussion answers') then create policy "Users can create discussion answers" on "public"."discussion_answers" as permissive for insert to public with check ((auth.uid() = author_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_answers"'::regclass and polname='Users can delete own discussion answers') then create policy "Users can delete own discussion answers" on "public"."discussion_answers" as permissive for delete to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_answers"'::regclass and polname='Users can update own discussion answers') then create policy "Users can update own discussion answers" on "public"."discussion_answers" as permissive for update to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quiz_results"'::regclass and polname='Only admins can delete quiz results') then create policy "Only admins can delete quiz results" on "public"."quiz_results" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quiz_results"'::regclass and polname='Only admins can manage quiz results') then create policy "Only admins can manage quiz results" on "public"."quiz_results" as permissive for update to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quiz_results"'::regclass and polname='Students can create quiz results') then create policy "Students can create quiz results" on "public"."quiz_results" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quiz_results"'::regclass and polname='Students can view own quiz results') then create policy "Students can view own quiz results" on "public"."quiz_results" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."nbt_registrations"'::regclass and polname='Students can create NBT registrations') then create policy "Students can create NBT registrations" on "public"."nbt_registrations" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."nbt_registrations"'::regclass and polname='Students can update own NBT registrations') then create policy "Students can update own NBT registrations" on "public"."nbt_registrations" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."nbt_registrations"'::regclass and polname='Students can view own NBT registrations') then create policy "Students can view own NBT registrations" on "public"."nbt_registrations" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quizzes"'::regclass and polname='Anyone can view published quizzes') then create policy "Anyone can view published quizzes" on "public"."quizzes" as permissive for select to public using (((is_published = true) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quizzes"'::regclass and polname='Only admins can delete quizzes') then create policy "Only admins can delete quizzes" on "public"."quizzes" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quizzes"'::regclass and polname='Tutors can create quizzes') then create policy "Tutors can create quizzes" on "public"."quizzes" as permissive for insert to public with check (((auth.uid() = created_by_id) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."quizzes"'::regclass and polname='Tutors can update own quizzes') then create policy "Tutors can update own quizzes" on "public"."quizzes" as permissive for update to public using (((auth.uid() = created_by_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_posts"'::regclass and polname='Anyone can view discussion posts') then create policy "Anyone can view discussion posts" on "public"."discussion_posts" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_posts"'::regclass and polname='Users can create discussion posts') then create policy "Users can create discussion posts" on "public"."discussion_posts" as permissive for insert to public with check ((auth.uid() = author_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_posts"'::regclass and polname='Users can delete own discussion posts') then create policy "Users can delete own discussion posts" on "public"."discussion_posts" as permissive for delete to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."discussion_posts"'::regclass and polname='Users can update own discussion posts') then create policy "Users can update own discussion posts" on "public"."discussion_posts" as permissive for update to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Admins can delete users') then create policy "Admins can delete users" on "public"."users" as permissive for delete to "authenticated" using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Admins can read all users') then create policy "Admins can read all users" on "public"."users" as permissive for select to "authenticated" using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Admins can update any user') then create policy "Admins can update any user" on "public"."users" as permissive for update to "authenticated" using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Users can insert own row safely') then create policy "Users can insert own row safely" on "public"."users" as permissive for insert to "authenticated" with check (((auth.uid() = id) AND (role = 'user'::text) AND (is_super_admin = false) AND (COALESCE(is_premium, false) = false)));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Users can read own row') then create policy "Users can read own row" on "public"."users" as permissive for select to "authenticated" using ((auth.uid() = id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."users"'::regclass and polname='Users can update own row') then create policy "Users can update own row" on "public"."users" as permissive for update to "authenticated" using ((auth.uid() = id)) with check ((auth.uid() = id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resources"'::regclass and polname='Anyone can view approved resources') then create policy "Anyone can view approved resources" on "public"."resources" as permissive for select to public using ((is_approved = true));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resources"'::regclass and polname='Only admins can delete resources') then create policy "Only admins can delete resources" on "public"."resources" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resources"'::regclass and polname='Tutors can insert resources') then create policy "Tutors can insert resources" on "public"."resources" as permissive for insert to public with check (((auth.uid() = tutor_id) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resources"'::regclass and polname='Tutors can update own resources') then create policy "Tutors can update own resources" on "public"."resources" as permissive for update to public using ((auth.uid() = tutor_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resources"'::regclass and polname='Tutors can view own resources') then create policy "Tutors can view own resources" on "public"."resources" as permissive for select to public using ((auth.uid() = tutor_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_bookmarks"'::regclass and polname='Users can delete own bookmarks') then create policy "Users can delete own bookmarks" on "public"."resource_bookmarks" as permissive for delete to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_bookmarks"'::regclass and polname='Users can insert own bookmarks') then create policy "Users can insert own bookmarks" on "public"."resource_bookmarks" as permissive for insert to public with check ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_bookmarks"'::regclass and polname='Users can update own bookmarks') then create policy "Users can update own bookmarks" on "public"."resource_bookmarks" as permissive for update to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_bookmarks"'::regclass and polname='Users can view own bookmarks') then create policy "Users can view own bookmarks" on "public"."resource_bookmarks" as permissive for select to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_ratings"'::regclass and polname='Anyone can view ratings') then create policy "Anyone can view ratings" on "public"."resource_ratings" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_ratings"'::regclass and polname='Users can delete own ratings') then create policy "Users can delete own ratings" on "public"."resource_ratings" as permissive for delete to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_ratings"'::regclass and polname='Users can insert ratings') then create policy "Users can insert ratings" on "public"."resource_ratings" as permissive for insert to public with check ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."resource_ratings"'::regclass and polname='Users can update own ratings') then create policy "Users can update own ratings" on "public"."resource_ratings" as permissive for update to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."school_counselors"'::regclass and polname='Counselors can update own profile') then create policy "Counselors can update own profile" on "public"."school_counselors" as permissive for update to public using (((auth.uid() = counselor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."school_counselors"'::regclass and polname='Only admins can delete counselors') then create policy "Only admins can delete counselors" on "public"."school_counselors" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."school_counselors"'::regclass and polname='Students can view counselor') then create policy "Students can view counselor" on "public"."school_counselors" as permissive for select to public using (((auth.uid() = counselor_id) OR (auth.uid() IN ( SELECT users.id
   FROM users
  WHERE (users.email = ANY (school_counselors.student_emails)))) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_notes"'::regclass and polname='Students can view notes about themselves') then create policy "Students can view notes about themselves" on "public"."student_notes" as permissive for select to public using ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_notes"'::regclass and polname='Tutors can create notes') then create policy "Tutors can create notes" on "public"."student_notes" as permissive for insert to public with check (((auth.uid() = tutor_id) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_notes"'::regclass and polname='Tutors can update own notes') then create policy "Tutors can update own notes" on "public"."student_notes" as permissive for update to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_notes"'::regclass and polname='Tutors can view own notes') then create policy "Tutors can view own notes" on "public"."student_notes" as permissive for select to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_progress"'::regclass and polname='Students can update own progress') then create policy "Students can update own progress" on "public"."student_progress" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_progress"'::regclass and polname='Students can view own progress') then create policy "Students can view own progress" on "public"."student_progress" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."student_progress"'::regclass and polname='Tutors can view student progress') then create policy "Tutors can view student progress" on "public"."student_progress" as permissive for select to public using ((EXISTS ( SELECT 1
   FROM tutor_bookings
  WHERE ((tutor_bookings.tutor_id = auth.uid()) AND (tutor_bookings.student_id = student_progress.student_id)))));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_reminders"'::regclass and polname='Students can create reminders') then create policy "Students can create reminders" on "public"."study_reminders" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_reminders"'::regclass and polname='Students can delete own reminders') then create policy "Students can delete own reminders" on "public"."study_reminders" as permissive for delete to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_reminders"'::regclass and polname='Students can update own reminders') then create policy "Students can update own reminders" on "public"."study_reminders" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_reminders"'::regclass and polname='Students can view own reminders') then create policy "Students can view own reminders" on "public"."study_reminders" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_room_posts"'::regclass and polname='Anyone can view study room posts') then create policy "Anyone can view study room posts" on "public"."study_room_posts" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_room_posts"'::regclass and polname='Users can create study room posts') then create policy "Users can create study room posts" on "public"."study_room_posts" as permissive for insert to public with check ((auth.uid() = author_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_room_posts"'::regclass and polname='Users can delete own study room posts') then create policy "Users can delete own study room posts" on "public"."study_room_posts" as permissive for delete to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_room_posts"'::regclass and polname='Users can update own study room posts') then create policy "Users can update own study room posts" on "public"."study_room_posts" as permissive for update to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_sessions"'::regclass and polname='Students can create study sessions') then create policy "Students can create study sessions" on "public"."study_sessions" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_sessions"'::regclass and polname='Students can delete own study sessions') then create policy "Students can delete own study sessions" on "public"."study_sessions" as permissive for delete to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_sessions"'::regclass and polname='Students can update own study sessions') then create policy "Students can update own study sessions" on "public"."study_sessions" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."study_sessions"'::regclass and polname='Students can view own study sessions') then create policy "Students can view own study sessions" on "public"."study_sessions" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_profiles"'::regclass and polname='Anyone can view tutor profiles') then create policy "Anyone can view tutor profiles" on "public"."tutor_profiles" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_profiles"'::regclass and polname='Anyone can view verified tutors') then create policy "Anyone can view verified tutors" on "public"."tutor_profiles" as permissive for select to public using ((is_verified = true));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_profiles"'::regclass and polname='Only admins can delete tutor profiles') then create policy "Only admins can delete tutor profiles" on "public"."tutor_profiles" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_profiles"'::regclass and polname='Tutors can insert own profile') then create policy "Tutors can insert own profile" on "public"."tutor_profiles" as permissive for insert to public with check ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_profiles"'::regclass and polname='Tutors can update own profile') then create policy "Tutors can update own profile" on "public"."tutor_profiles" as permissive for update to public using ((auth.uid() = user_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."subscriptions"'::regclass and polname='Only admins can manage subscriptions') then create policy "Only admins can manage subscriptions" on "public"."subscriptions" as permissive for all to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."subscriptions"'::regclass and polname='Users can read own subscriptions') then create policy "Users can read own subscriptions" on "public"."subscriptions" as permissive for select to public using ((auth.email() = user_email));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."subscriptions"'::regclass and polname='Users can view own subscriptions') then create policy "Users can view own subscriptions" on "public"."subscriptions" as permissive for select to public using (((auth.uid() = user_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_availability"'::regclass and polname='Anyone can view availability') then create policy "Anyone can view availability" on "public"."tutor_availability" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_availability"'::regclass and polname='Only admins can delete availability') then create policy "Only admins can delete availability" on "public"."tutor_availability" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_availability"'::regclass and polname='Tutors can manage own availability') then create policy "Tutors can manage own availability" on "public"."tutor_availability" as permissive for all to public using ((auth.uid() = tutor_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_bookings"'::regclass and polname='Only admins can delete bookings') then create policy "Only admins can delete bookings" on "public"."tutor_bookings" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_bookings"'::regclass and polname='Students can create bookings') then create policy "Students can create bookings" on "public"."tutor_bookings" as permissive for insert to public with check (((auth.uid() = student_id) AND (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'student'::text))))));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_bookings"'::regclass and polname='Users can update own bookings') then create policy "Users can update own bookings" on "public"."tutor_bookings" as permissive for update to public using (((auth.uid() = student_id) OR (auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_bookings"'::regclass and polname='Users can view own bookings') then create policy "Users can view own bookings" on "public"."tutor_bookings" as permissive for select to public using (((auth.uid() = student_id) OR (auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_payouts"'::regclass and polname='Only admins can manage payouts') then create policy "Only admins can manage payouts" on "public"."tutor_payouts" as permissive for all to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_payouts"'::regclass and polname='Tutors can view own payouts') then create policy "Tutors can view own payouts" on "public"."tutor_payouts" as permissive for select to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_reviews"'::regclass and polname='Anyone can view reviews') then create policy "Anyone can view reviews" on "public"."tutor_reviews" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_reviews"'::regclass and polname='Only admins can delete reviews') then create policy "Only admins can delete reviews" on "public"."tutor_reviews" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_reviews"'::regclass and polname='Students can create reviews') then create policy "Students can create reviews" on "public"."tutor_reviews" as permissive for insert to public with check (((auth.uid() = student_id) AND (EXISTS ( SELECT 1
   FROM tutor_bookings
  WHERE ((tutor_bookings.id = (tutor_reviews.booking_id)::uuid) AND (tutor_bookings.student_id = auth.uid()) AND (tutor_bookings.status = 'completed'::text))))));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tutor_reviews"'::regclass and polname='Users can update own reviews') then create policy "Users can update own reviews" on "public"."tutor_reviews" as permissive for update to public using ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."university_applications"'::regclass and polname='Only admins can delete applications') then create policy "Only admins can delete applications" on "public"."university_applications" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."university_applications"'::regclass and polname='Students can create applications') then create policy "Students can create applications" on "public"."university_applications" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."university_applications"'::regclass and polname='Students can update own applications') then create policy "Students can update own applications" on "public"."university_applications" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."university_applications"'::regclass and polname='Students can view own applications') then create policy "Students can view own applications" on "public"."university_applications" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_posts"'::regclass and polname='Anyone can view forum posts') then create policy "Anyone can view forum posts" on "public"."forum_posts" as permissive for select to public using ((is_removed = false));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_posts"'::regclass and polname='Users can create forum posts') then create policy "Users can create forum posts" on "public"."forum_posts" as permissive for insert to public with check ((auth.uid() = author_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_posts"'::regclass and polname='Users can delete own posts') then create policy "Users can delete own posts" on "public"."forum_posts" as permissive for delete to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."forum_posts"'::regclass and polname='Users can update own posts') then create policy "Users can update own posts" on "public"."forum_posts" as permissive for update to public using (((auth.uid() = author_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."platform_announcements"'::regclass and polname='Anyone can view announcements') then create policy "Anyone can view announcements" on "public"."platform_announcements" as permissive for select to public using ((is_active = true));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."platform_announcements"'::regclass and polname='Only admins can manage announcements') then create policy "Only admins can manage announcements" on "public"."platform_announcements" as permissive for all to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."weekly_goals"'::regclass and polname='Students can create weekly goals') then create policy "Students can create weekly goals" on "public"."weekly_goals" as permissive for insert to public with check ((auth.uid() = student_id));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."weekly_goals"'::regclass and polname='Students can delete own weekly goals') then create policy "Students can delete own weekly goals" on "public"."weekly_goals" as permissive for delete to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."weekly_goals"'::regclass and polname='Students can update own weekly goals') then create policy "Students can update own weekly goals" on "public"."weekly_goals" as permissive for update to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."weekly_goals"'::regclass and polname='Students can view own weekly goals') then create policy "Students can view own weekly goals" on "public"."weekly_goals" as permissive for select to public using (((auth.uid() = student_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."legal_documents"'::regclass and polname='Anyone can read legal documents') then create policy "Anyone can read legal documents" on "public"."legal_documents" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."video_lessons"'::regclass and polname='Anyone can view approved videos') then create policy "Anyone can view approved videos" on "public"."video_lessons" as permissive for select to public using ((is_approved = true));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."video_lessons"'::regclass and polname='Anyone can view video lessons') then create policy "Anyone can view video lessons" on "public"."video_lessons" as permissive for select to public using (((is_approved = true) OR is_admin(auth.uid()) OR (auth.uid() = tutor_id)));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."video_lessons"'::regclass and polname='Only admins can delete video lessons') then create policy "Only admins can delete video lessons" on "public"."video_lessons" as permissive for delete to public using (is_admin(auth.uid()));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."video_lessons"'::regclass and polname='Tutors can create video lessons') then create policy "Tutors can create video lessons" on "public"."video_lessons" as permissive for insert to public with check (((auth.uid() = tutor_id) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."video_lessons"'::regclass and polname='Tutors can update own video lessons') then create policy "Tutors can update own video lessons" on "public"."video_lessons" as permissive for update to public using (((auth.uid() = tutor_id) OR is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Admins can upload CAPS docs') then create policy "Admins can upload CAPS docs" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'caps_documents'::text) AND is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Admins can upload opportunity guides') then create policy "Admins can upload opportunity guides" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'opportunity_guides'::text) AND is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Admins can upload prospectus') then create policy "Admins can upload prospectus" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'prospectus'::text) AND is_admin(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Public can view files') then create policy "Public can view files" on "storage"."objects" as permissive for select to public using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Tutors can upload to resources') then create policy "Tutors can upload to resources" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'resources'::text) AND (auth.role() = 'authenticated'::text) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Tutors can upload videos') then create policy "Tutors can upload videos" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'videos'::text) AND (auth.role() = 'authenticated'::text) AND is_tutor(auth.uid())));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Users can delete own files') then create policy "Users can delete own files" on "storage"."objects" as permissive for delete to public using (((auth.uid())::text = (storage.foldername(name))[1]));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Users can update own files') then create policy "Users can update own files" on "storage"."objects" as permissive for update to public using (((auth.uid())::text = (storage.foldername(name))[1]));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"storage"."objects"'::regclass and polname='Users can upload avatars') then create policy "Users can upload avatars" on "storage"."objects" as permissive for insert to public with check (((bucket_id = 'avatars'::text) AND (auth.role() = 'authenticated'::text)));end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tech_guard_services"'::regclass and polname='public can read services') then create policy "public can read services" on "public"."tech_guard_services" as permissive for select to "anon","authenticated" using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tech_guard_projects"'::regclass and polname='public can read projects') then create policy "public can read projects" on "public"."tech_guard_projects" as permissive for select to "anon","authenticated" using (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$do $policy$ begin if not exists(select 1 from pg_policy where polrelid='"public"."tech_guard_leads"'::regclass and polname='public can submit leads') then create policy "public can submit leads" on "public"."tech_guard_leads" as permissive for insert to "anon","authenticated" with check (true);end if;end $policy$;$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_activity_log_updated_at BEFORE UPDATE ON activity_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW WHEN (old.email::text IS DISTINCT FROM new.email::text) EXECUTE FUNCTION sync_user_update();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_application_documents_updated_at BEFORE UPDATE ON application_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_banner_clicks_updated_at BEFORE UPDATE ON banner_clicks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_exam_schedule_updated_at BEFORE UPDATE ON exam_schedule FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_bursaries_updated_at BEFORE UPDATE ON bursaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_feature_toggles_updated_at BEFORE UPDATE ON feature_toggles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_opportunity_guides_updated_at BEFORE UPDATE ON opportunity_guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_forum_comments_updated_at BEFORE UPDATE ON forum_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_caps_documents_updated_at BEFORE UPDATE ON caps_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON lesson_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_pending_opportunity_guides_updated_at BEFORE UPDATE ON pending_opportunity_guides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_discussion_answers_updated_at BEFORE UPDATE ON discussion_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_quiz_results_updated_at BEFORE UPDATE ON quiz_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_nbt_registrations_updated_at BEFORE UPDATE ON nbt_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_nbt_test_dates_updated_at BEFORE UPDATE ON nbt_test_dates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_pending_university_prospectuses_updated_at BEFORE UPDATE ON pending_university_prospectuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_discussion_posts_updated_at BEFORE UPDATE ON discussion_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER trg_protect_privileged_columns BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION protect_privileged_columns();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_resource_bookmarks_updated_at BEFORE UPDATE ON resource_bookmarks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_resource_ratings_updated_at BEFORE UPDATE ON resource_ratings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_school_counselors_updated_at BEFORE UPDATE ON school_counselors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_student_notes_updated_at BEFORE UPDATE ON student_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_study_reminders_updated_at BEFORE UPDATE ON study_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_study_room_posts_updated_at BEFORE UPDATE ON study_room_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_study_sessions_updated_at BEFORE UPDATE ON study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_tutor_profiles_updated_at BEFORE UPDATE ON tutor_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_tutor_availability_updated_at BEFORE UPDATE ON tutor_availability FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_tutor_bookings_updated_at BEFORE UPDATE ON tutor_bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_tutor_payouts_updated_at BEFORE UPDATE ON tutor_payouts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_tutor_reviews_updated_at BEFORE UPDATE ON tutor_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_university_applications_updated_at BEFORE UPDATE ON university_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_university_prospectuses_updated_at BEFORE UPDATE ON university_prospectuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_forum_posts_updated_at BEFORE UPDATE ON forum_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_application_deadlines_updated_at BEFORE UPDATE ON application_deadlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_educational_resources_updated_at BEFORE UPDATE ON educational_resources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_platform_announcements_updated_at BEFORE UPDATE ON platform_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_pending_application_deadlines_updated_at BEFORE UPDATE ON pending_application_deadlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_weekly_goals_updated_at BEFORE UPDATE ON weekly_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$CREATE TRIGGER update_video_lessons_updated_at BEFORE UPDATE ON video_lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('resources','resources',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('videos','videos',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('avatars','avatars',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('caps_documents','caps_documents',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('prospectus','prospectus',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('opportunity_guides','opportunity_guides',true,null,null) on conflict(id) do nothing;$baseline_ddl$;
execute $baseline_ddl$create event trigger ensure_rls on ddl_command_end when tag in ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') execute function public.rls_auto_enable();$baseline_ddl$;
end $baseline$;
