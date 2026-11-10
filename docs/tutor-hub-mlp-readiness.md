# Tutor Hub MLP implementation readiness

## Scope implemented on this branch

This branch repairs and hardens the existing tutor workspace rather than adding a second dashboard or paid services. Navigation defines ten destinations and separates Profile from Reviews. Students and Earnings remain release-gated, leaving eight visible destinations.

- **Professional profile:** adds structured teaching experience and tutoring experience years, teaching approach, and online/in-person delivery options using existing live profile columns. These are separate fields so student tutors do not have to imply formal classroom experience. Teaching-approach choices use the exact values allowed by the live database constraint. The public tutor directory now returns those safe professional fields, qualifications/certifications, and academic background while deliberately withholding the SACE number (including copies embedded in onboarding qualifications or certifications) and private metadata; the public profile modal displays the experience and delivery details. SACE is labelled only as details submitted, not as independently verified.
- **Learner progress:** reads canonical `student_progress`, `study_sessions`, and `tutor_bookings` data using learner UUIDs and the authenticated tutor's booking relationships. It no longer queries the absent `study_progress` view or missing `users.grade` / `users.parent_email` fields. It shows an explicit no-data state rather than inventing scores.
- **Learner CRM:** uses tutor and learner UUIDs. Notes default to private; tutors can explicitly share/unshare notes. A migration restricts learner reads to shared, non-confidential, non-archived notes. Parent accounts do not receive note access through this policy. Another migration requires a confirmed/completed tutor booking before a tutor can create or reassign a note.
- **Lesson-plan privacy:** the underlying `lesson_plans` row contains private tutor reflection notes. A migration removes the learner SELECT policy so learners cannot read the raw row. The existing `sendEmail` lesson-plan action was inspected: it checks verified tutor role, tutor ownership, and a confirmed/completed booking, and emails only title, objectives, resources and homework.
- **Lesson-plan archiving:** adds `is_archived`, filters archived plans from the active list, and replaces a tutor DELETE operation with an owner-scoped archive update. Tutor create/update RLS also requires a confirmed/completed booking relationship.
- **Booking workflow:** scopes requests and realtime updates to the authenticated tutor UUID. Completion is constrained to the tutor's own confirmed booking. The calendar is read-only for booking state changes and routes pending requests to Booking Requests, preserving the payment gate.
- **Availability:** scopes loading and deletion to the authenticated tutor UUID.
- **Resources:** loads tutor-owned active resources by UUID and archives owned resources by setting `is_archived=true` without changing administrator approval history. RLS hides archived resources from public listings. A database trigger prevents tutors from self-approving, rejecting, featuring, or changing moderation/engagement metrics. Tutors can still edit their own content and archive it; authorised staff/service-role moderation remains available.
- **CSV export:** escapes spreadsheet formula-leading values to reduce formula-injection risk.

## Live evidence inspected (read-only)

The connected Supabase project reported:
- 6 tutor profile rows
- 1 confirmed booking, 1 pending booking and 4 cancelled bookings
- 0 rows in `student_progress`
- 0 rows in `study_sessions`

Live RLS policies and table columns were inspected for tutor bookings, learner progress, study sessions, lesson plans, CRM notes, resources, availability and tutor profiles. The migrations in this branch have **not** been applied to production.

Because live progress/session tables are empty, real score/progress charts cannot yet be validated against learner activity. The UI shows an explicit awaiting-data state.

## Release gates remaining

1. Complete the latest local Supabase Auth/PostgREST test run against the note-sharing, tutor/learner relationship, lesson-plan privacy/archive, resource moderation and expanded public tutor directory. A previous run exposed an invalid test fixture (unsupported study-year and teaching-style values); the fixture and profile choices now use the live database's allowed values.
2. Complete the full GitHub Actions suite, including build and Playwright browser suites. The unrelated Opportunities browser test timed out in an earlier run; latest run status is tracked in PR #103.
3. Perform authenticated end-to-end acceptance with separate tutor and learner accounts: profile save/reload, availability, booking request transitions, lesson-plan create/edit/email share, CRM note privacy/share/unshare, resource upload/archive/moderation, and messaging.
4. Apply reviewed database migrations and deploy the matching code only after CI and acceptance tests pass. Then verify the live app with non-production test accounts before enabling the Students section.
5. Generate real learner progress and completed study-session records and verify that only the tutor with a confirmed/completed booking can read the learner data.
6. Keep Earnings/banking disabled until private payout details, ledger, fee calculation, statements and reconciliation have a secure server-side implementation.
7. Keep rescheduling and attendance disabled until their backend contracts, schema and ownership checks are confirmed.

## Verification status

- Six focused Node unit tests for learner aggregation, risk flags, grade filtering, date cutoffs and CSV escaping passed in an isolated local test run.
- On the latest full Actions run snapshot before the most recent RLS/resource tests, mobile checks, ESLint, TypeScript, repository unit tests, Python tests, database/API/Edge checks and production build passed. The local Supabase service and Playwright suites were still running at last check.
- No production schema, user data, payment configuration or production deployment was changed.
- PR #103 remains a draft. This branch is not a live release.
