# Tutor Hub MLP implementation readiness

## Scope delivered on this branch

This branch repairs and hardens the existing tutor workspace rather than adding a second dashboard or introducing paid services. The navigation now defines ten destinations and separates Profile from Reviews. Students and Earnings remain release-gated, so eight destinations are currently visible.

- **Learner progress:** reads the live `student_progress` and `study_sessions` tables, joins by `student_id`, and starts from bookings owned by the authenticated tutor. It no longer queries the absent `study_progress` view or missing `users.grade` / `users.parent_email` fields.
- **Learner CRM:** loads notes and bookings using `tutor_id`, keeps learner identity by UUID, and writes `student_id` with each note. It only builds the tutor's learner list from confirmed/completed bookings.
- **Lesson planning:** scopes plans/bookings by tutor UUID, links plans to learner UUIDs, reads canonical progress rows, and stores the selected booking reference in the existing `metadata` JSON column because `lesson_plans.booking_id` is not in the live schema.
- **Booking requests:** scopes list/realtime updates to the authenticated tutor UUID and constrains session completion to the tutor's own confirmed booking.
- **Resource management:** loads tutor-owned active resources by UUID and archives a resource by setting `is_archived=true` and `is_approved=false`. It no longer calls a DELETE operation that the live tutor RLS policy does not permit.

## Live evidence checked

The connected Supabase project currently reports:

- 6 tutor profile rows
- 1 confirmed booking, 1 pending booking and 4 cancelled bookings
- 0 rows in `student_progress`
- 0 rows in `study_sessions`

Therefore the learner analytics UI can be made schema-correct, but real score/progress charts cannot yet be validated against live learner activity. The UI explicitly shows when learning data has not been recorded and does not invent scores.

## Release gates that remain

1. **Do not enable the Students section yet.** The live `student_notes` student-read policy currently checks only `auth.uid() = student_id`; it does not enforce `is_shared_with_student`, `is_confidential`, or archive state. Decide the intended student/parent visibility model and tighten/test RLS before presenting tutor notes as confidential.
2. **Populate and verify learning data.** Complete an authenticated student study session and confirm that `student_progress` and `study_sessions` update; then verify that only the tutor with a confirmed/completed booking can read those rows.
3. **Run end-to-end tutor tests with separate tutor and learner accounts.** Cover profile save/reload, availability changes, booking request transitions, lesson-plan create/edit, CRM note create/read, resource upload/archive, and messaging.
4. **Keep earnings and banking disabled.** Payout details, payout ledger, fee calculation, statements and reconciliation still require a private server-side design and separate tests.
5. **Keep rescheduling and attendance disabled** until the relevant backend contracts, schema and ownership checks are confirmed.

## Verification status

- Six focused Node unit tests for learner aggregation, risk flags, grade filtering, date cutoffs and CSV escaping passed in an isolated local test run.
- Full repository install/build/lint and authenticated browser tests have not yet run in this environment.
- No production schema, user data, payment configuration or production deployment was changed.
- This branch is a draft implementation for review; it is not a live release.
