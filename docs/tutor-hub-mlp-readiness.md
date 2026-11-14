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

1. The local Supabase Auth/PostgREST suite passed, including the numeric SACE redaction regression across both qualifications and certifications, after aligning profile choices and fixtures with the live study-year and teaching-style constraints.
2. Complete the full GitHub Actions suite, including build and Playwright browser suites. The unrelated Opportunities browser test timed out in an earlier run; latest run status is tracked in PR #103.
3. Perform authenticated end-to-end acceptance with separate tutor and learner accounts: profile save/reload, availability, booking request transitions, lesson-plan create/edit/email share, CRM note privacy/share/unshare, resource upload/archive/moderation, and messaging.
4. Apply reviewed database migrations and deploy the matching code only after CI and acceptance tests pass. Then verify the live app with non-production test accounts before enabling the Students section.
5. Generate real learner progress and completed study-session records and verify that only the tutor with a confirmed/completed booking can read the learner data.
6. Keep Earnings/banking disabled until private payout details, ledger, fee calculation, statements and reconciliation have a secure server-side implementation.
7. Keep rescheduling and attendance disabled until their backend contracts, schema and ownership checks are confirmed.
8. Review the dependency audit before launch. `npm ci` currently reports 9 dependency vulnerabilities (4 low, 4 moderate and 1 high); identify affected direct/transitive packages and apply only compatible, tested fixes.

## Verification status

- Six focused Node unit tests for learner aggregation, risk flags, grade filtering, date cutoffs and CSV escaping passed in an isolated local test run.
- Mobile checks, ESLint, TypeScript, repository unit tests, Python tests, database/API/Edge checks and production build have passed on recent full Actions snapshots. Local Supabase Auth/PostgREST tests passed, including the numeric SACE-redaction regression. The broad Playwright suite passed content, Opportunities, marketing, staff, payments, drafts, presentations, meetings, live-classroom, config and audit on a recent run; the tutor-specific browser test exposed an exact-heading selector issue in the calendar test. That selector is corrected, and the latest run adds public-profile display assertions for experience, approach, delivery modes, certifications and SACE-submission wording.
- Dependency installation reports 9 advisories in the current dependency tree (4 low, 4 moderate, 1 high); remediation is a pre-launch gate and has not been attempted blindly.
- No production schema, user data, payment configuration or production deployment was changed.
- PR #103 remains a draft. This branch is not a live release.


## Integrated readiness update — 14 November 2026

The MLP implementation has now been combined with the 14 November privacy and ownership hardening work.

- Tutor profiles distinguish formal classroom teaching experience from tutoring experience, record teaching approach and online/in-person delivery, and publish only approved professional fields. A typed SACE number is not treated as proof of verification.
- Learner progress reads the live `student_progress`, `study_sessions` and tutor-booking relationship by learner UUID. Missing scores remain unrecorded; future bookings are not counted as learner activity.
- Tutor CRM notes are private by default, can be explicitly shared/unshared, and are hidden from learners when confidential or archived. Notes and lesson plans require a confirmed/completed tutor relationship.
- Lesson plans support archiving; learner access to the underlying tutor reflection record is removed.
- Resource moderation remains administrator-controlled; tutors can archive their own resources without changing approval history.
- Booking Calendar is read-only for booking state changes; Booking Requests remains the single place to accept/decline eligible requests and preserves payment checks.
- Availability, bookings, CRM, lesson planning and upcoming-session queries use authenticated tutor UUIDs.
- Profile and Reviews are separate destinations. Assessment Centre is discoverable in the professional workspace.

The latest pre-integration PR #109 CI run passed all configured checks, including build, lint, typecheck, unit tests, local Supabase service tests and browser suites. The integrated commit must pass a fresh full CI run before it is considered release-ready.

**Production rollout remains gated:** apply the reviewed migrations only after the integrated CI passes, then run separate tutor, learner and administrator acceptance tests in an isolated test environment. Keep Student CRM/Progress hidden until that migration and acceptance sequence is verified. Earnings/banking, rescheduling and attendance remain disabled.


Implementation review is tracked in PR #110. The integrated branch is based directly on the current main commit so the PR contains only the outstanding MLP changes, not a duplicate of the merged privacy hardening.


Migration ordering note: the already-merged 20261114170000 privacy migration is preserved unchanged. Follow-on migrations are versioned after it; the learner-note archive visibility policy is a separate follow-on migration, and the lesson-plan relationship migration does not duplicate the note policies already installed by #109.


Production migration reconciliation: the privacy/ownership migration filename is aligned to the recorded Supabase version `20261114163002`; the follow-on MLP migrations start at `20261114175000` and remain pending until the reviewed release is applied.
