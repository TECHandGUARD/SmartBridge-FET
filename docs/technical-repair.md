# Technical repair — 11 October 2026

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


This branch repairs core account and learner flows against the existing SmartBridge FET Supabase schema. It changes no curriculum and does not certify the whole application as secure or ready for production.

## Repaired

- Shared authentication/profile state replaces independent layout polling. Database profile permissions are authoritative; account metadata and hardcoded email addresses cannot grant administrator access in these core gates.
- Authentication requests time out and profile failures show recovery controls. Password recovery has a dedicated route.
- Initial onboarding uses one transactional database RPC. Tutors remain pending until approved; privacy and tutor agreement records are written together. Unverified parent–student linking is disabled during onboarding. The dashboards share a learner-approved request workflow; parent report policies require an approved relationship and revocation removes access. Legacy linked email fields grant no access.
- Quiz selection requires subject and grade. No unrelated Mathematics fallback is supplied. Result writes include the authenticated student ID; failed writes leave the quiz retryable without duplicating the final answer.
- Premium access queries match the real subscription schema. Entering a payment reference no longer activates a subscription, and completed users cannot reset their own trial timestamp. Payment confirmation still requires an administrator.
- Profile queries use the canonical users table; the existing user_profiles view exposes only session fields. Public tutor discovery uses a limited directory instead of returning private application documents.
- Both booking screens call one database operation. It derives ownership and price, enforces subject/duration/future-time rules, serializes bookings for a tutor to prevent overlaps with a 15-minute buffer, and returns the existing reservation when a request is retried. Ordinary users cannot edit payment status, prices, ownership or schedules.
- Progress screens read an RLS-preserving summary of the existing student_progress and study_sessions tables. Study logging is atomic and idempotent; no duplicate study counter or session table was created.
- Configuration/activity queries now use canonical table names, safe configuration keys have explicit read policies, and activity records are attributed to the authenticated caller.
- Runtime errors, invalid TypeScript syntax in JavaScript files, missing imports, and component prop contracts were corrected. The lockfile now supports npm ci.

## Validation

Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

Browser checks: `npx playwright install chromium`, then `npm run test:e2e`. They start Vite on port 5173 with fake connection settings and mock all Supabase responses. Ten checks cover login → onboarding → home, grade-specific quiz saving and retry, no premium self-activation, learner admin-route denial, password reset, booking retry IDs without client prices, parent request controls, learner approval/revocation, and session logging. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can select an installed Chromium binary. These checks do not prove live email delivery, OAuth, payment processing or live account behaviour.

Database security tests in `db/test-core-flows.sql` and `db/test-bookings-and-links.sql` were run against the connected project with the repair migration in one transaction and **rolled back**. They verify safe signup metadata, first-time student/tutor onboarding, consent validation, quiz ownership, cross-account denial, rejection of self-granted admin/premium privileges and trial extension, tutor self-verification denial, server-derived booking prices, booking retry deduplication/overlaps, rejection of financial/ownership tampering, pending/approved/revoked parent access, session retry deduplication, actor attribution and secret configuration denial. Fixtures use reserved example addresses; no customer account was retained or changed.

## Deployment order

Apply all six migrations under `supabase/migrations/` in filename order: core flows, booking/parent permissions, then study progress contracts, then API usage/payment/email contracts, then payment gateway settings, then operational integrations. It targets the existing schema, not an empty database: this repository does not contain a complete baseline migration. Review it on a staging copy of that schema. Apply it as the database owner in a transaction before deploying this frontend, because onboarding, booking, consent, progress and tutor discovery depend on the new RPCs/views. Preserve a database backup and the previous deployment for rollback. The migration restricts private tutor profile access; any external consumers should switch to the safe directory.

No permanent database migration or production deployment was performed as part of this branch. Supabase authentication redirect settings must allow `/auth/callback` and `/reset-password` on the real deployment; delivery and OAuth need a live smoke test after deployment.

## Remaining launch blockers

1. Payment processing is not end-to-end verified. Implement authenticated provider webhooks, idempotent payment records and server-derived booking prices before automating premium activation or payouts. Booking prices are now derived in the database; payment provider verification and automatic activation/payouts remain incomplete.
2. `invoke-llm`, `generate-lesson-plan`, and `send-email` are called by the app and remain absent from the live inventory. The confirmed download-caps-zip and send-counselor-reminders naming mismatches are fixed. These endpoints are now implemented on the branch; deploy and validate them using [API integrations](api-integrations.md).
3. Remaining secondary integrations (chat relationships, analytics, weekly-goal calculations and exam schedules) need contract tests against their real schema. Core progress, activity/configuration table names and study heatmap fields are repaired; this does not validate every historical query. Completing a tutor lesson plan no longer fabricates a learner study session.
4. The account consent workflow is implemented, but it does not establish legal guardian identity. Verify the intended guardian/minor consent process before launch. Email report delivery remains unverified; report reads still require database-approved relationships.
5. The live advisor still reports eighteen RLS-enabled tables without policies because these migrations are staged, not deployed; their features are blocked for ordinary clients. This branch adds narrow policies for configuration and consent; the other affected features require their own tested policies. Review premium resource/storage access on the server, exposed functions, extension placement, and leaked-password protection. A passing client check does not prove database or storage authorization.
6. The connected project currently has no resource, quiz, tutor or subscription records. After technical readiness, approved content and legitimate tutor onboarding are needed for real use. Curriculum authoring is outside this repair.

The broad diff includes removal of unused imports and accurate JSDoc contracts for UI primitives to make the existing lint/type checks useful. Build output still reports sizeable bundles; performance work should follow functional correctness.

Security advisor was checked again against the unchanged live project. Its remaining findings include public extensions and disabled leaked-password protection; rerun the advisor after migration deployment. See [Supabase advisor remediation](https://supabase.com/docs/guides/database/database-linter) and [password protection settings](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
