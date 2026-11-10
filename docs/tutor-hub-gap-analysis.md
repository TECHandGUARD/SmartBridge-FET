# SmartBridge Tutor Hub — gap analysis and prioritised development specification

**Repository:** `TECHandGUARD/SmartBridge-FET`  
**Baseline inspected:** GitHub `main`, commit `246643caa822009d80e82cfcd85f8413af60e53f` (30 October 2026)  
**Backend inspected:** connected production Supabase schema and RLS policy metadata, 10 November 2026  
**Status:** source/backend gap analysis; not a production browser acceptance certificate

## Executive finding

The Tutor Dashboard is more substantial than a registration/profile screen. The source already contains profile editing and media upload, tutor rates, weekly availability, booking requests/calendar, messaging, learner notes, lesson planning, resource uploads, reviews, a lesson-design studio, session links and an earnings/payout interface.

The main problem is **release readiness and integration**, not simply a lack of screens. Several capabilities are hidden behind release flags or premium gates; some source components call tables/columns that do not exist in the live schema; and financial workflows are not safe to present as operational. Do not rebuild features that already exist. First make the existing core reliable, visible and testable.

The recommended identity is **SmartBridge Tutor Hub — A professional space to teach, earn and grow.**

## Evidence and limitations

Inspected the tutor route, navigation, profile editor, availability manager, booking calendar and requests, student CRM, progress chart, lesson planner, lesson studio, resource uploader, messaging wrapper, reviews, upcoming sessions, earnings dashboard, release-scope flags, launch-readiness checklist, and relevant live Supabase tables/columns/RLS policies.

Live schema confirms these tables: `tutor_profiles`, `tutor_availability`, `tutor_bookings`, `lesson_plans`, `student_progress`, `tutor_reviews`, `tutor_payouts`, and `resources`. The live schema does **not** contain `study_progress` or `booking_reschedule_requests` at the time of inspection. `users` does not contain the `grade` or `parent_email` fields selected by the current progress chart.

No authenticated tutor test account was used, no real booking/payment/email was created, and the Amplify browser session could not be driven in this audit. Source presence and database metadata are not proof that a user-facing workflow works in production. All acceptance tests below must run on a staging/test account before release.

## 1. Current dashboard map

| Tutor area | Existing implementation | Current assessment |
|---|---|---|
| Overview | Welcome header, verification/Pro status, announcements, resource upload/download counters | Present, but not a joined-up teaching overview; booking and learner indicators are missing from the default overview |
| Professional profile | `TutorProfileEditor`: bio, institution, study field/year, SACE number, qualifications, subjects, grades, specialisations, languages, rates, avatar/video upload, autosave draft, preview | Strong foundation; add missing professional fields and verify public-profile privacy/media round-trip |
| Availability | `TutorAvailabilityManager`: weekly recurring day/time slots, edit/delete/bulk add and conflict checks | Present; validate timezone, booking collisions, exceptions and public directory/booking consistency |
| Booking calendar | `BookingCalendar`: monthly calendar and tutor booking records | Present; validate lifecycle, timezone, event updates and race conditions |
| Booking requests | `BookingRequests`: accept/decline, meeting platform/link, completion, attendance UI and reschedule UI | Core actions exist; reschedule path is release-flagged and live table is absent; attendance feature is disabled |
| Learners | `StudentCRM`: derives learners from bookings, records private session notes, strengths, areas to improve, next steps and mood | Useful foundation; `student_notes` contract/RLS and linked-parent/child-data permissions need live role testing |
| Progress | `TutorStudentProgressChart`: charts/trends, reports and parent contact | Currently incompatible with live schema: queries `study_progress`, `users.grade`, and `users.parent_email`; live alternatives/columns differ |
| Lesson planning | `LessonPlanner`: CRUD, statuses, batch actions, booking-linked learners, share action and AI-plan invocation | `lesson_plans` exists with tutor/student RLS; sharing and AI generation depend on deployed/working functions and premium access |
| Lesson design | `TutorLessonStudio`: CAPS FET lesson structure, objectives, misconceptions, teaching method, differentiation, assessment, preview, print/export | Useful standalone workspace; saves drafts to browser local storage, not the tutor's account or learner record |
| Resources | `ResourceTemplateUploader`: notes, practice papers, study guides, worksheets; private storage upload and metadata | Present; verify private bucket, review/publishing, file access and deletion on real tutor/student accounts |
| Communication | `ChatInbox` wraps shared `MessagingInbox`; meeting links and presentation/meeting routes | UI exists; end-to-end delivery, attachments, moderation, parent permissions and notification receipts need tests |
| Reviews | `TutorReviews`: ratings, distribution and feedback | Read view exists; verify only completed-booking learners can review, moderation and public visibility |
| Earnings | `TutorBusinessSummary` and `TutorEarningsDashboard` | **Not ready:** hidden by release flag; reads/writes bank fields on `tutor_profiles` that do not exist; payout is not a verified payment workflow |
| Professional development | Links to Virtual Meetings and Presentation Studio; reflection/professional development copy | Not a structured course/certificate centre; do not build this before core tutoring operations work |
| Help/support | General platform support paths exist outside the tutor-specific sections | Add a tutor-specific help route, issue reporting and workflow guidance after core fixes |

## 2. Confirmed blockers and high-risk mismatches

### P0 — resolve before inviting tutors to rely on these workflows

1. **Progress chart uses the wrong live data contract.** The component queries `study_progress.user_email/last_access` and selects `users.grade,parent_email`. Live schema has `student_progress` with `student_id/student_email`, academic term/year, scores and progress fields; live `users` does not have `grade` or `parent_email`. The chart can fail or show empty data. Reconcile the component to the canonical live schema and enforce tutor-to-booking/learner scope. Do not add duplicate progress tables to preserve the stale query.

2. **Earnings dashboard reads non-existent bank columns.** It selects and updates `bank_name, account_number, account_holder, branch_code` on `tutor_profiles`; those columns are absent. The live `tutor_payouts` table has payout/bank-related columns, but bank details must not be moved into public profile data. Design a restricted private payout-details store or secure provider-managed payout token, with strict tutor/admin access, masking, retention and audit controls. Do not store full bank details in `tutor_profiles`.

3. **Earnings are deliberately unavailable in the release scope.** `RELEASE_FEATURES.tutorBanking=false`; `isDashboardSectionEnabled('tutor','earnings')` also hides the earnings navigation item. The current component's direct insert into `tutor_payouts` and hard-coded fees/minimum payout are not a verified settlement process. Keep payout requests and payment claims disabled until an approved payment provider, server-side ledger, fee calculation, reconciliation, statements and payout controls are verified. This workstream must not change Yoco settings, keys, webhooks or payment records without separate explicit approval.

4. **Learner/progress navigation is hidden.** `isDashboardSectionEnabled` defers `students` and `earnings`; this means the existing student CRM/progress and earnings views are not exposed through TutorQuickActions. Re-enable learner management only after the progress chart and privacy boundaries are fixed. Keep earnings deferred until P0 financial controls are satisfied.

5. **Rescheduling is not backed by the current live schema.** BookingRequests conditionally queries `booking_reschedule_requests`, but the table is absent and `bookingReschedule=false`. Keep the UI unavailable until the migration/RPC, authorization, notifications and state transitions are deployed and tested. Do not show a button that cannot complete.

6. **Attendance and completion need authoritative state transitions.** Attendance is disabled in release scope. The client-side booking UI must not be the authority for marking paid/completed/attended. Use server-side validation/RPCs with booking ownership, allowed status transitions, timestamps, dispute handling and audit trail. Payment confirmation must remain independent of tutor completion.

### P1 — core tutor usability and trust

7. **Profile fields are incomplete for experienced educators.** Existing form includes university/institution, study field/year, qualifications, subjects, grades, specialisations, languages, bio, rates, image and intro video. Live profile schema already has experience fields (`years_experience`, `teaching_experience_years`, `tutoring_experience_years`), teaching style, certifications and preferred delivery modes, but the current profile form does not expose all of them. Add relevant fields without making student tutors falsely imply a teaching qualification or SACE status. Add a separate teaching philosophy prompt (or clearly label the bio as the teaching approach). Profile completion must distinguish required, recommended and optional fields.

8. **Profile media storage requires production verification.** The editor uploads to `tutor-profile-media`. Verify bucket existence, storage policies, file size/MIME validation, replacement/deletion cleanup, signed/public URL behavior, mobile Safari/Android upload and profile preview. Public profile content must exclude ID documents, SACE evidence, private contact details and banking information.

9. **Availability and booking must use one canonical rule set.** Weekly slots exist with timezone, recurrence, exceptions and booking capacity columns. Test conflict checking server-side (not only in the browser), daylight/timezone behavior, booking against availability, double booking, buffer times, unavailable dates and changes after a booking has been confirmed.

10. **Learner CRM privacy and reliability.** CRM currently builds learner lists from booking email addresses and stores notes in `student_notes`. Verify that only the assigned tutor can read/write notes for their own booked learner, that parent visibility is limited to properly linked learners and that notes are never exposed on a public profile or to other tutors. Use stable student IDs as the primary relationship, not email-only joins.

11. **Lesson planning has mixed persistence.** `LessonPlanner` persists to `lesson_plans`; `TutorLessonStudio` only saves in browser local storage. Add authenticated draft persistence only after a tutor-owned draft schema/API is agreed. Link plans to a booking/learner where appropriate, preserve draft autosave and export, and label AI-generated suggestions as drafts requiring educator review. Verify `generate-lesson-plan` and `send-email` are deployed and authorized before exposing their actions.

12. **Resource library needs a complete moderation lifecycle.** Upload UI exists and resource metadata supports approval/rejection. Test private storage, tutor ownership, admin review, publication visibility, student access, premium entitlement, download authorization, file deletion and audit logs. Ensure a tutor cannot self-approve content or expose private files by copying a URL.

13. **Communication needs delivery and safeguarding states.** Test tutor–learner and tutor–parent messaging against relationship/consent rules, block/report, moderation escalation, unread status, attachment scanning, push/email preferences and delivery/error states. Never expose a learner's private contact information simply because a booking exists.

## 3. Professional profile specification

**Tutor-owned fields to expose/edit:**
- Display name (account-controlled), professional title/category (student tutor / qualified educator / experienced private tutor).
- Professional photograph and optional short introduction video.
- Biography and teaching philosophy/approach.
- Institution attended, field of study, study year or completed qualification.
- Qualifications/certifications (claims only; evidence stays private for admin verification).
- Teaching experience and tutoring experience, separately stated in years.
- CAPS subjects, grades, teaching languages and specialisations.
- Online/in-person options and teaching platforms where supported.
- Base hourly/session rate and optional per-subject rates only where server-side booking quotes support them.
- Availability summary, verification state and public profile preview.

**Rules:** distinguish “admin verified” from “SACE verified”; never award a badge from a self-entered number. Keep private evidence and contact/banking details out of the public directory. Profile preview must use the same safe public projection as the actual learner/parent view. Add a clear save status and recovery path; autosaved local drafts must never be presented as saved to the server.

## 4. Recommended information architecture

Use the ten-section proposal as the long-term destination, but ship only stable areas. Proposed labels and grouping:

1. **Overview** — profile readiness, booking requests, next sessions, active learners, messages and actions requiring attention.
2. **My Professional Profile** — profile editor, verification, media and public preview.
3. **My Learners** — booking-linked learners, private session notes and progress (after schema/privacy fix).
4. **Bookings & Calendar** — requests, availability, meeting links, confirmations, cancellations; reschedule only after backend support.
5. **My Teaching Workspace** — lesson plans, lesson studio, CAPS resources, quizzes and Study Room links.
6. **Communication** — messages, parent communication where authorised, reporting/blocking.
7. **Earnings & Payments** — hidden/deferred until secure financial ledger and payment/payout integration is ready.
8. **Performance & Reviews** — factual tutoring activity, completed hours, verified feedback and progress indicators; no punitive leaderboard.
9. **Professional Development** — later-stage learning modules, workshops, certificates and reflection.
10. **Help & Support** — tutor onboarding guide, FAQs, report a problem and support status.

Keep the top-level navigation compact and mobile friendly. Avoid duplicate entry points (e.g. lesson studio and lesson planner should have distinct purposes and clear names).

## 5. Phased implementation plan

| Phase | Scope | Priority | Exit condition |
|---|---|---|---|
| 0 — Stabilise existing flows | Fix progress schema; audit RLS/IDOR; verify profile save/media; reconcile booking lifecycle; remove/disable dead controls | P0 | All core tutor screens pass authenticated role-based staging tests; no known P0 data leakage |
| 1 — Professional profile | Expose experience/teaching approach/delivery preferences; completion indicator; public projection/preview; secure media handling; confirm tutor-owned rates and server-side booking quote consistency | P1 | Profile edit → save → refresh → public preview round-trip passes for student tutor and qualified tutor |
| 2 — Availability and bookings | One canonical availability/booking ruleset; request accept/decline; cancel; meeting links; notifications; timezone and concurrency | P0/P1 | Student creates booking; tutor receives it; tutor accepts/declines; both see consistent state; double booking blocked |
| 3 — Learner management and teaching workspace | Stable learner IDs, private notes, progress record, lesson plan ↔ booking link, persistent drafts, resource moderation | P1 | Tutor sees only their learners; plan/resource creation and sharing verified with student account |
| 4 — Earnings transparency | Private payout profile, server-side fee quote, tutor net estimate, booking ledger, statements, payout status | P1 but payment-gated | Finance/security review and provider sandbox evidence; no client-created payout amounts |
| 5 — Reputation and development | Verified review moderation, teaching activity summary, development modules and certificates | P2 | Authentic activity-derived indicators and moderation; no fabricated progress or rating inflation |

## 6. Acceptance test matrix

Run in staging with synthetic identities and at least one student-tutor account, one qualified/SACE-tutor account, one learner, one linked parent and one admin.

| Test | Expected result |
|---|---|
| Tutor profile edit/save/reload | Every supported field persists; no silent local-only save |
| Avatar/video upload, replace and remove | Correct bucket/policies; safe MIME/size; no orphaned files; mobile devices tested |
| Public profile preview | Only approved public fields appear; private documents/contact/bank data absent |
| Tutor pricing | Rate and per-subject override displayed consistently; booking quote comes from server; no R0 fallback falsely presented as a set rate |
| Availability create/edit/delete | Tutor can manage own slots; other tutors cannot alter them; invalid/overlapping slots rejected server-side |
| Booking request/accept/decline | Correct tutor/student ownership; no duplicate/double booking; notifications and calendar agree |
| Cancellation/reschedule | Policy enforced; no unavailable reschedule action; both parties receive correct state |
| Completion/attendance | Only allowed transitions; attendance/disputes audited; completion does not imply payment |
| Learner CRM | Only booking-linked learners appear; notes private to assigned tutor; no cross-tutor/parent overexposure |
| Progress | Reads canonical `student_progress`; scores/trends match database; parent access requires verified link |
| Lesson plan | CRUD, autosave, student sharing and AI failure states tested; AI output marked draft |
| Resource upload | Admin approval required; only approved resource visible to intended audience; private files protected |
| Messaging | Correct relationship and consent; block/report works; delivery/unread status honest |
| Reviews | Only eligible completed booking can submit; one review per booking; moderation and appeal work |
| Earnings | Hidden until ledger, private payout details, fee calculation and provider settlement are verified |
| Role separation | Pending tutor cannot access approved tutor features; tutor A cannot access tutor B's records; learner/parent/admin scopes correct |

## 7. Metrics that support tutors without creating a ratings race

Show only activity the system can substantiate:
- Learners supported (distinct learners with a valid booking).
- Sessions completed (authoritative completed booking count).
- Teaching hours (sum of validated completed durations).
- Learner progress (only when progress records are linked and current; display sample size and date range).
- Feedback (verified reviews, count and optional category distribution; no forced public ranking).
- Earnings (only settled/ledger-backed values; distinguish gross, platform fee, net, pending and paid).
- Professional development (completed and verified modules, not clicks).

No leaderboards, pressure badges, automatic penalties for low ratings, or claims that tutor activity guarantees income or learner improvement.

## 8. Delivery guardrails

- Work on a feature branch and PR; do not commit this audit directly to `main`.
- Do not add a second table where a canonical live table already exists. Reconcile code to the deployed schema.
- Do not disable RLS or rely on frontend role checks. Test actual database policies using each role.
- Keep banking and learner notes private; use stable UUID relationships, least privilege and audit trails.
- Do not activate Yoco, payout processing, live email or AI providers as part of a UI-only change. Obtain separate approval for payment configuration or production financial actions.
- Do not call a feature “live” until a reproducible production/staging test proves the full user journey.
- Preserve the existing SmartBridge CAPS FET experience and the free tutor lesson design studio.

## Immediate developer task list

1. Fix `TutorStudentProgressChart` to use `student_progress` and actual `users` columns; add tutor-to-booking relationship filters and role tests.
2. Keep earnings hidden; remove its broken bank-field path from any reachable UI and open a separate secure payout architecture task.
3. Test profile editor save, media upload and public preview against staging; add missing teaching experience/teaching philosophy fields after confirming public-safe projection.
4. Verify availability and booking actions against the live schema and server-side booking RPC; keep reschedule/attendance controls hidden while their backend remains disabled.
5. Add an overview summary derived from real bookings/messages/profile state (not static counters), then verify with real test roles.
6. Add lesson-plan and resource end-to-end tests; verify external functions before enabling AI/share actions.
7. Run the full acceptance matrix and publish test evidence before merging/deploying.

**Decision:** build SmartBridge Tutor Hub by stabilising and connecting the existing foundation first. Do not start by adding ten new pages or activating earnings. The highest-value next development slice is learner/progress contract repair plus tutor profile and booking workflow verification.
