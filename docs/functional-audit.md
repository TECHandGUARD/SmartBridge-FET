# Functional blocker audit — 11 October 2026

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


The app builds and the checked routes render, but several advertised features still cannot work against the connected backend. This audit focuses on failures that prevent execution, saving, loading, uploading or completing workflows. Cosmetic changes and curriculum content are outside scope.

## Coverage and evidence

- Read/scanned all 308 tracked files at the source checkpoint, including 241 JavaScript/JSX/TypeScript modules, the entity JSON/JSONC files, migrations, configuration, dependency manifest/lockfile and existing tests/docs.
- Parsed every code module for syntax and local import resolution. Compared 437 literal table, RPC, function and storage calls against the connected project's schema, function inventory, bucket names and policies. This catches static contracts; variable payloads and dynamic queries require manual tracing and are not exhaustively proven by this scan.
- Extended normal lint coverage to UI primitives. Lint, typecheck, six unit tests and the production build pass.
- Nineteen focused mocked browser checks pass, including saving a reminder and goal with the canonical fields/ownership IDs. Additional rendering checks cover 19 public/shared routes, 22 learner/parent/tutor dashboard sections, four admin routes and their visible tabs. These check rendering, not successful live execution of every feature. Existing core/UX checks remain intact.
- Initially retrieved eight live function sources; the follow-up reconciliation retrieved all 21. The deployed code differs from the repository. Read-only metadata/source checks made no production changes and sent no real email, payment or AI request.
- `functional-audit-coverage.csv` records the source checkpoint inventory. `functional-blockers.csv` lists remaining static contract findings plus confirmed service/storage/deployment blockers. Staged migrations and dormant modules are labelled separately.

The subsequent environment/configuration changes are documented in [environment-configuration.md](environment-configuration.md). That guide records the new public/server settings and additional configuration tests.

## Corrected in this branch

| Area | Failure and correction |
| --- | --- |
| Study reminders | `reminder_time` did not exist. Reads/writes/rendering now use `time`, and inserts include the learner ID. Report queries now use `student_email`. |
| Weekly goals | Wrong week/target/label fields and booking date prevented loading/saving. Uses `week_start`, `target`, `label`, real booking dates and individual study-session rows. Counts multiple sessions rather than one aggregate per subject; local week calculation avoids UTC day drift. |
| Tutor discovery | Parent and subject pages read private tutor profiles; they now use the same staged safe directory as other discovery pages. |
| Session links | Tutor bookings tried to read Zoom/Teams links from tutor profiles. Those fields are on `users`; the query now reads the tutor's own account. |
| Basic chat | Tutor/counselor messages now use `message` and `is_read`, not nonexistent `content` and `read` fields. Advanced typing, application and attachment features remain blocked below. |
| Forum post creation | Removed the nonexistent `author_role` field from community forum inserts and supplies the author ID. The separate discussion/question feature remains incompatible. |
| Admin forms | Corrected subscription `plan`, learner ID on grants, CAPS official document number/active flag, banner timestamp and manual opportunity publication fields. Guide URLs/source metadata now use the actual schema. |
| Upload aliases | CAPS, lesson video, tutor avatar/video and prospectus uploads now address existing public buckets. This does not create missing private buckets or solve upload/delete permission issues. |
| Tutor profile saves | Video/social fields were being written as nonexistent columns. They now round-trip through existing metadata. The edited hourly price also updates the canonical rate used by the booking RPC. |
| Resources/exams | Study assistant loads approved `resources`, and the exam planner uses `exam_schedule`. Permission and AI-service blockers still apply. |
| Roles/premium | A verified legacy `tutor` role was sent to a route that rejected it; relevant routes now accept that existing role. Premium checks filter for an actual premium plan rather than treating a free active subscription as paid access. |
| Repository function sources | Corrected canonical configuration/activity/users names and the subscription-expiry administrator lookup. These source edits have not been deployed and do not replace live functions. |

## Remaining blockers, in dependency order

1. **Core migrations are staged, not deployed.** The live project lacks `complete_onboarding`, `create_booking`, parent-link RPCs, `log_study_session`, `tutor_directory` and `study_progress`. The first three migrations supply them; do not mistake their absence for a new duplicate feature request. New-account setup, reservations, report consent and progress depend on deployment. Existing SQL rollback fixtures validate the migrations against the connected schema, but a complete empty-database baseline is still absent.

2. **Backend reconciliation is staged, with rollout wiring still outstanding.** All 21 live function implementations are now reconciled into the repair branch, preserving 11 real Resend email handlers, configuring the five AI handlers and adding explicit user/admin/job authorization. Production remains unchanged. The observed public database triggers contain no notification webhooks, and `cron.job` is absent; external scheduling has not been verified. See [backend reconciliation](backend-reconciliation.md) for the source/deployment map, tests and remaining rollout requirements. Select an available Google model and test authenticated staging calls before deployment.

3. **Missing API implementations are now staged.** `invoke-llm`, `generate-lesson-plan` and scoped `send-email` are implemented in the follow-up API repair, alongside Yoco checkout/payment callbacks and Resend delivery callbacks. They remain undeployed and require the fourth migration, provider configuration and staging verification. `find_matching_bursaries_v2` remains absent; the recommendation page has a direct-query fallback requiring usable data/read policies. See [API integrations](api-integrations.md).

4. **Eighteen live RLS tables have no policies.** Ordinary clients cannot read/write their feature data; SELECT can look like an empty dataset. They are: application_deadlines, banner_clicks, bursaries, educational_resources, exam_schedule, feature_toggles, nbt_test_dates, opportunity_guides, pending_application_deadlines, pending_opportunity_guides, pending_university_prospectuses, profiles, subjects, system_configuration, universities, university_directory, university_prospectuses and user_consents. The staged repairs address configuration/consent; other tables still need explicit, tested access rules. Do not remove RLS to make the UI work. [Supabase RLS behaviour](https://supabase.com/docs/guides/database/postgres/row-level-security).

5. **Eighteen other referenced relations are absent**, excluding the two staged views: booking_reschedule_requests, chat_rooms, chat_typing_status, feature_user_overrides, flashcards, forum_answers, nbt_planner_progress, nbt_resources, school_subject_averages, sim_quizzes, simulations, student_analytics, student_requests, syllabus_progress, tutor_applications, tutor_verification_requests, unified_resources and weak_concepts. Some already have canonical alternatives (`discussion_answers` and `resources`); others have no implementation. This blocks simulations, flashcards, syllabus/NBT progress, tutor applications/verification requests and advanced chat. `ChatService.ts` and `useFeatureFlags.js` are currently outside the app import graph; their failures are dormant, not startup failures.

6. **Additional field/type mismatches remain.** The discussion board uses community-forum tables/fields rather than the existing `discussion_posts`/`discussion_answers` contracts. Tutor earnings reads/writes nonexistent bank columns, attendance writes a nonexistent status field, comparison charts read nonexistent learner grade/parent-email columns, and manual tutor creation uses nonexistent credential columns plus a string for an array of qualifications. The file-level CSV gives locations. Bank details require an intentional private data design rather than putting them into the public tutor directory.

7. **Private storage controls are now staged, with activation outstanding.** Migration six creates the five missing private buckets and restricts the currently empty resource bucket. Account paths, the legacy public-read policy, paid-file access and upload/download callers are repaired. Actual binary uploads, legacy references, replacement/deletion, staging deployment and counselor sharing still require verification. See [operational integrations](operational-integrations.md).

8. **Approval/delivery fixes are staged, with integration work outstanding.** Reconciled sources correct guide fields, reviewer authorization and standard/legacy webhook shapes. Reminder sources now send through the provider and check tracking failures. The API follow-up adds private delivery records and suppression. Publishing and pending-review tracking still require an atomic RPC; real delivery, provider wiring and live deployment remain unverified.

9. **Payments and hosting remain operational dependencies.** There is no complete verified provider-webhook/activation/payout flow. Frontend premium gates do not validate payment processing or storage access. The Amplify rewrite rules in the build file and the root `_redirects` file do not prove the hosting service actually has an SPA rewrite configured; Vite does not copy a root `_redirects` file into its build output. Refresh/deep-link behaviour needs a deployed-host test. No cloud hosting settings were changed. [Amplify SPA rewrite examples](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).

## What passing checks mean

No syntax, missing-local-import or undefined-name blocker was found in the scanned frontend modules. The production bundle builds. That is separate from backend readiness: mocks can render pages whose real table/service is absent or whose policy denies access. The review is not a security certification or proof of every data-dependent workflow. Live OAuth/email, provider keys/model access, storage writes/deletes, payment webhooks, realistic data and business/user acceptance remain unverified. Main, live functions and the database remain unchanged; this work is reviewable on the existing draft PR.
