# Focused MVP candidate

Continues from PR #1 checkpoint `7ca815c`; completed repairs are retained. Current
fresh replay includes thirteen migrations and eight SQL security/workflow suites.

| Included in the candidate | Deferred from the first release |
| --- | --- |
| Accounts, onboarding and role navigation | Advanced tutor/counselor chat |
| Published subjects/resources/videos and practice quizzes | Simulations, flashcards and advanced discussion |
| Study logging, reminders/goals, exams and topic checklists | Tutor analytics, banking and extra verification |
| Tutor discovery, bookings, confirmation and cancellation | Rescheduling and attendance extensions |
| Learner-approved parent access and on-screen reports | Email reports and external AI generation |
| Published opportunities, NBT preparation and application tracking | Static university comparisons, lesson/quiz authoring |
| Membership-scoped study rooms and moderation | Optional providers/jobs remain inactive until separately verified |

`src/lib/release-scope.js` records the scope. `ReleaseGate` prevents deferred
components from mounting, and dashboard actions/deep links cannot activate deferred
sections. Presentation controls never replace database/API authorization. Existing
premium rules are retained; no paid provider is activated. Accept this focused scope
before publishing; the full legacy feature set is not certified.

The new learning migration supplies `syllabus_progress`, `nbt_planner_progress`
and curated `nbt_resources`. Protected learner UUIDs and canonical emails control
progress ownership; topic retries are unique and invalid NBT state is rejected.
Failed NBT saves retain the previous visible state. Topic fallback examples are
labelled as a personal checklist, not certified CAPS curriculum.

## Evidence and gates

Thirteen migrations/eight SQL suites, 49 unit/API tests, lint, full typechecking,
production build, API mappings, Edge checks and 38 hashed bundles pass locally.
New browser cases cover topic save/reload/undo, NBT failure/retry/reload/undo and
the absence of requests to deferred tables. Their latest remote CI must pass.

The `supabase-services` CI job creates a disposable Docker stack on the runner,
using pinned CLI 2.120.0 and the actual migrations. It tests real Auth signup,
PostgREST/RLS, booking/consent/progress, private Storage binary upload/download/
replacement/delete, and Deno Edge study submission/retry. It refuses hosted API
targets, never prints local keys, and stops afterward. Local email confirmation is
disabled only in its copied test config. No production records or credentials are
used. Startup/runtime failures cannot be skipped or treated as successful.

Read-only preflight on 13 October still finds only the original recorded migration
in `bbhrnidzjeccggununzq`. Repaired onboarding/progress/rooms/learning are absent;
18 live tables lack policies. There are 21 older live functions versus 38 reviewed
sources, and zero objects in the legacy resource bucket. No production schema,
history, functions, plan, hosted branch or main merge has been changed.

Before public launch, review current schema/history and recovery/export readiness;
preserve the already recorded original migration; authorize the rollout separately;
apply the baseline guard and repairs in order; deploy matching function/JWT settings;
configure actual hosting/Auth redirects and public connection settings; then run real
deployed account, booking, consent, progress and file acceptance checks plus advisors.
Do not mark unapplied migrations as applied or use production as an unreviewed staging
substitute. Keep optional providers/jobs inactive. Docker CI does not establish
production hostname, SMTP, institutional/content approval or hosting configuration.

This is a testable candidate, not a claim that unchanged production is launch-ready.
The real-service gate identified missing invoker-helper privileges during a trusted
tutor update. An incremental migration grants only `service_role` execution of the
existing administrator/tutor helpers; SQL regression also exercises that update.
Unused Vitest and React Quill packages were removed after confirming no source or
test imports. The active test runner remains Node's test runner. The dependency
audit now has zero critical advisories; nine noncritical build/router advisories
remain tracked rather than forcing major framework upgrades into this repair.
See `staging-rollout.md` and `mvp-backend-access.md` for rollout requirements.

Inactive tutor accounts lose directory visibility and tutor eligibility immediately; existing booking validation also rejects new bookings with them. SQL and real service checks cover revocation.

Self-service account deletion is deferred: the previous controls did not perform verified erasure. Before public launch, provide an approved support contact and a documented identity-verified deletion process covering Auth, database records and stored files. No deletion or POPIA compliance certification is claimed.
