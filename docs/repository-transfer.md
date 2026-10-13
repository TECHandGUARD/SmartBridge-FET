# SmartBridge-FET repair and verification

Updated 13 October 2026. Target: `TECHandGUARD/SmartBridge-FET`, based on main `59f8ea4dc66de5b93a6b2da6b03d32dfe5d1b9d0`. Repairs previously merged in `SmartBridge-correction` did not update this repository. The correct repository already connects to active Supabase project `bbhrnidzjeccggununzq`; reconnecting another repository is not the fix.

## Implemented repairs

The [focused MVP candidate](mvp-release-candidate.md) completes local learning
progress and defers unfinished features. Current replay is eleven migrations/eight
SQL suites; an isolated Docker service CI gate supplements SQL and browser mocks.

The subsequent local MVP access work is recorded in [mvp-backend-access.md](mvp-backend-access.md).
It adds catalogue/queue/exam policies and atomic opportunity review after the verified baseline,
bringing fresh replay to ten migrations and seven SQL suites. Production remains unchanged.

The reconciled code includes database-backed onboarding and account permissions, role navigation, owned bookings with server prices, learner-approved parent access, study logging, private-file references, scoped AI/email APIs, configurable Yoco/Paystack providers, authenticated/signed callbacks, disabled-by-default scheduled jobs, admin Operations controls and sanitized monitoring. Existing university administration, paginated administrator loading, configurable UI primitives, query/realtime helpers, entity definitions and app assets are retained.

Broad frontend typechecking now passes without narrowing its source include scope or adding blanket suppression. UI primitives have actual HTML/Radix prop contracts; genuine incompatible callers, numeric attributes, subject-object rendering, calendar/checkbox props, dashboard props and optional callbacks were corrected. Supabase JavaScript is pinned to 2.117.3 with its lockfile.

The missing `check-rate-limit`, `moderate-post`, `moderate-reply` and `report-content` endpoints are implemented. Study rooms use an explicit catalogue and membership, database-owned authorship, fixed atomic quotas, idempotent submission and manual administrator review. Posts/replies queue before publication. Reports and moderator audit records stay private. Public room reads omit author emails; direct client post/reply writes are revoked. Author withdrawal archives a post while preserving moderation evidence. Admin review verifies the active database administrator account. No browser-supplied role, actor, price or moderation result is trusted.

Amplify's failed preview build incorrectly rejected the public settings `VITE_RESET_PASSWORD_ROUTE` and `VITE_MIN_PASSWORD_LENGTH` as secrets. The validator now narrowly allows the three public password-form settings while continuing to reject server credentials. The existing Amplify app is `d2pos7eidu5lbk`, region `eu-west-1`, linked to the correct repository. Its hosting SPA rewrite is already configured. No AWS environment value or hosting setting was changed.

The Subjects category controls now wrap at narrow screen widths. Buttons used as links/labels now pass their child through Radix Slottable, preserving icon/loading support and preventing the runtime single-child error; disabled delegated controls prevent activation. Browser regression tests cover study-room membership, quota-service failure preventing writes, retry request IDs, queued content, reports and withdrawal. Browser failure output records the route and visible page text. A GitHub Actions workflow runs lint, broad typechecking, unit/API checks, Edge source/hash checks, build and mocked browser regression for PRs and main.

## Verification and limits

- 48 unit/API tests pass.
- Full frontend typecheck and lint pass.
- Production build passes with synthetic public connection settings.
- All 40 literal frontend function calls map to the 38 implementation slugs.
- All 48 Edge TypeScript/local-import modules pass checks. Remote SDK declarations are stubbed in that check; this is not a deployed Deno runtime test.
- All 38 deployment bundles pass transitive source-hash verification. `supabase/config.toml` maps custom entrypoints and JWT settings consistently with the manifest.
- All seven migrations and six SQL security/workflow fixtures pass against the connected schema in one transaction that is rolled back. Fixtures include onboarding, bookings, parent consent, API quotas, gateways, operational controls and study-room permissions/moderation. No production schema change results from these tests.
- Mocked Chromium checks exercise learner/parent/tutor onboarding, password reset, quizzes, booking retries, parent consent, reminders/goals, dashboard history, study-room submission and 320/768/1024/1440px layouts. Missing or privileged browser connection settings show a usable error without backend requests. Broad route rendering is checked separately from real backend execution.

## Live rollout remains blocked

Read-only checks on 13 October confirm that the repaired onboarding RPC, study-progress relation and study-room catalogue are absent from the live project. Its migration history contains only `20260822153131_create_tech_guard_website_tables`; the repository now includes a captured schema-only baseline and recovered original migration, locally verified on PostgreSQL 17 with all seven repair patches. Hosted Supabase replay and service checks remain outstanding. Schema/history reconciliation and an isolated staging rollout are required before a main merge can safely trigger connected backend deployment. Main, production functions and persistent database state remain unchanged by these repairs.

The live security advisor still reports 18 RLS-enabled tables with no policies. RLS denies their ordinary-client operations; do not disable it to make pages work. Historical `functional-audit.md` and `functional-blockers.csv` identify additional missing relations, field contracts and feature policies. This round resolves the study-room endpoints and frontend/type/build blockers; it does not certify every advertised legacy feature. Simulations, advanced chat, some tutor/admin workflows and opportunity data still need their own schema/permission implementation or explicit MVP scope decisions.

Email requires verified sender/SMTP configuration and a real delivery test. AI needs available model access and authenticated staging tests. Payments require merchant credentials, registered signed callbacks and provider sandbox verification; inactive gateways remain unavailable. Private storage needs actual upload/download/replacement/deletion tests. Scheduled jobs remain disabled until their configuration and deliberate activation are verified. No real email, AI generation, payment or scheduled job was initiated.

Amplify preview job 2 and GitHub Actions passed for the repaired source checkpoint; the deployed login and signed-out deep-link redirects were verified. The baseline follow-up adds a database replay gate to CI. A successful frontend deployment will not supply missing Supabase migrations or prove live onboarding/storage/provider flows. This PR remains draft while the backend rollout and live acceptance checks are unresolved; it is not public-MVP readiness approval.

The baseline and hosted-staging execution gate are documented in `db/baseline/README.md` and `staging-rollout.md`. No hosted branch has been created: the connector's required branch-cost operation is unavailable.
