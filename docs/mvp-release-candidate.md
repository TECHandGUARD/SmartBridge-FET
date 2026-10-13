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
the absence of requests to deferred tables. Final candidate CI run 38472404384 passed both verify and real-service jobs.

The `supabase-services` CI job creates a disposable Docker stack on the runner,
using pinned CLI 2.120.0 and the actual migrations. It tests real Auth signup,
PostgREST/RLS, booking/consent/progress, private Storage binary upload/download/
replacement/delete, and Deno Edge study submission/retry. It refuses hosted API
targets, never prints local keys, and stops afterward. Local email confirmation is
disabled only in its copied test config. No production records or credentials are
used. Startup/runtime failures cannot be skipped or treated as successful.

## Owner-approved deployed status (13 October 2026 UTC)

PR #1 merged as `c2062c27528bceb5beab065fc8eecdf3eb30d289`. Amplify production job 100 succeeded for that commit. The live app is `https://main.d2pos7eidu5lbk.amplifyapp.com`; no custom domain is attached. Main branch public origin settings use that hostname. Developer/admin bypass and automatic approval controls are disabled. Supabase organization remains Free; no hosted staging branch or paid upgrade was created.

All 13 migration versions/names now match the repository. The baseline/repairs were applied atomically after a rolled-back production rehearsal. The original migration was preserved. All 38 reviewed functions are active with matching JWT settings. All eight SQL suites pass on hosted PostgreSQL in a rolled-back transaction; catalogue-count assertions were scoped to disposable fixture markers to allow existing published rows. No public RLS tables lack policies; payment gateways and jobs remain disabled.

Actual hosted service checks pass for password login with dedicated confirmed test accounts, onboarding with protected metadata, booking retry/server price/ownership/confirmation, parent consent/progress/revocation, syllabus/NBT persistence/isolation, private binary upload/download/signed URL/replacement/deletion/cross-account denial, and Deno Edge queued study submission/retries. These confirmed test accounts do not prove real signup or reset email delivery. Storage deletion is verified through absent listings and refusal to issue a fresh signed URL; already downloaded or CDN-cached bytes cannot be recalled. All disposable accounts and their test records are removed after verification; four original accounts remain. HTTP checks confirm live assets use the correct project and deep links serve the SPA. Full role/browser audit remains the CI mock-backed check, not a claimed authenticated hosted browser run.

## Remaining public-onboarding requirements

Before inviting public learners, confirm Supabase Auth Site URL and redirect allow-list for the actual origin (`/auth/callback` and `/reset-password`) and verify real signup-confirmation/password-reset delivery with approved SMTP/sender configuration. Hosted Auth currently enables email and Google, disables anonymous signup, and requires email confirmation. No SMTP credential or Auth redirect change was made through the deployment connector. The existing support contact is `aneleq@techandguard.co.za`; the owner must confirm approved content/privacy terms and an identity-verified deletion/support process. A custom domain is optional for the pilot and requires its own verified DNS/HTTPS association before using it as an origin.

Security advisor has no public missing-policy findings. It still flags legacy `pgjwt`/`pg_trgm` extensions in public and disabled leaked-password protection. Private operational tables intentionally deny browser roles and have RLS without browser policies; do not grant access to silence informational findings. References: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . These findings remain tracked; no paid feature was activated. Recovery currently has the captured schema and tested transactional rollout, not a claimed full managed data-backup/restore exercise.

This is the deployed focused MVP candidate. Public onboarding is not certified until the remaining Auth/email and owner-controlled requirements above are satisfied. Keep optional providers/jobs inactive until separately accepted.

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
