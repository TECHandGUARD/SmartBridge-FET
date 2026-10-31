# SmartBridge FET — Transformation Baseline

**Assessment date:** 31 October 2026  
**Repository:** `TECHandGUARD/SmartBridge-FET`  
**Baseline commit:** `246643caa822009d80e82cfcd85f8413af60e53f`  
**Working branch:** `transformation/phase-1-baseline`  
**Supabase project:** `bbhrnidzjeccggununzq` (SmartBridge FET; ACTIVE_HEALTHY)

## Purpose and operating rules

This document establishes a read-only baseline for the complete SmartBridge FET transformation. Preserve existing working functionality. Implement changes on controlled branches, test them, and use reviewed pull requests. Do not make destructive production changes, alter live payment settings, send real customer communications, or enable scheduled jobs without a separate explicit approval and a verified rollback plan.

A feature is not complete merely because code exists. Track each item as **implemented**, **tested**, **deployed**, and **production-verified** separately.

## Verified inventory

- GitHub repository exists and the latest commit returned by the connected GitHub account is `246643caa822009d80e82cfcd85f8413af60e53f`.
- The repository owner has explicitly confirmed that **public visibility is intentional for now** to support development and collaboration. Treat this as a deliberate founder decision, not an outstanding defect. Reassess only if the owner requests it. Public source visibility does not permit publishing secrets, production credentials, private learner records, identity documents, payment data or confidential tutor information.
- Supabase project reports `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.
- The public schema inventory contains **103 tables**.
- Supabase reports **48 active Edge Functions**.
- The repository has a Vite/React application, Supabase functions and migrations, Amplify build configuration, a GitHub Actions quality workflow, automated unit/API checks and a large browser-test suite.
- Package scripts include lint, typecheck, unit tests, browser tests, API/Edge checks, DB checks and production build.
- The current quality workflow runs on pull requests and pushes to main. Its application job uses synthetic public Supabase values and includes a broad browser test suite. Passing this workflow is not proof of live provider integrations or production user journeys.
- The repository contains extensive prior repair, rollout and operational documentation. Some documents describe historical checkpoints and must be reconciled against current live state before being treated as current truth.

## Current live-state reconciliation (31 October 2026)

A second read-only pass against the live database corrects several historical audit statements:

- Supabase migration history contains **66 applied migrations**.
- All **103 public tables** have RLS enabled. A direct catalogue query found **9 public tables with no policies**: `adult_call_push_subscriptions`, `coo_automation_settings`, `coo_daily_reports`, `coo_reminder_suppressions`, `coo_reminder_unsubscribe_tokens`, `coo_tutor_email_log`, `peer_call_age_verifications`, `peer_call_guardian_grants` and `peer_call_moderators`. These are operational/safeguarding tables; their deny-by-default behavior appears intentional pending individual access review.
- The security advisor's **34 RLS-without-policy** findings include tables in the non-public `smartbridge_private` schema. They must not be treated as 34 public application tables or repaired by adding broad client policies.
- The advisor flags one anonymous-executable and 27 authenticated-executable SECURITY DEFINER functions in the exposed `public` schema. This is an execution-surface review list, not proof of vulnerabilities. For example, the anonymous `public_tutors` function returns a limited verified-tutor directory projection; admin review RPCs inspected so far contain server-side permission checks. Every flagged function still requires individual review and negative tests.
- The repository's `main` branch currently reports `protected=false` with no required status checks. This is a release-governance gap. No branch-protection change has been made because the available GitHub connection does not expose repository ruleset administration.
- The latest `main` commit is `246643caa822009d80e82cfcd85f8413af60e53f` (30 October 2026). Its commit-status endpoint returned no status records. The available workflow-run lookup is PR-filtered, so this is not evidence that no GitHub Actions runs exist; it does mean CI evidence for that commit has not yet been verified.
- Current AI Board tables contain 1 training record, 0 executive reviews, 0 proposals and 1 training-audit row. These counts do not demonstrate that any executive has passed certification or is operating autonomously.
- The private scheduled-job configuration has `subscriptions` enabled; `coo-onboarding` and the other listed jobs are disabled. This is configuration state, not proof of scheduler delivery or execution.
- The Yoco payment-order table currently contains 7 rows: 2 paid live-mode, 1 pending live-mode, 2 paid test-mode and 2 pending test-mode. This is not a merchant-dashboard reconciliation and does not prove successful live checkout-to-settlement end-to-end.

The older `docs/functional-audit.md` is explicitly a historical 11 October repair checkpoint. Its statements that core migrations are staged, and that 18 named relations are missing, must be reconciled with the 66 current migrations and current catalogue before they are used to direct new work.

## Live Edge Function and permission review (31 October 2026)

A read-only comparison of Supabase's live Edge Function registry with the repository manifest found:

- **48 live Edge Functions, all reporting ACTIVE.**
- The repository deployment manifest contains **42 slugs**; all 42 are present live, but **six live slugs are absent from the manifest**: `groq-study-assistant`, `gateway-readiness-diagnostic`, `coo-tutor-onboarding`, `coo-delivery-smoke`, `coo-reminder-unsubscribe` and `coo-ai-scenario-test`.
- `coo-tutor-onboarding` and `coo-ai-scenario-test` have corresponding source files in the repository but are not yet represented in the manifest. `groq-study-assistant` and `coo-reminder-unsubscribe` have live source but no matching repository source file. `gateway-readiness-diagnostic` and `coo-delivery-smoke` currently return HTTP 410 and are closed diagnostic endpoints; their continued deployment should be reviewed and either tracked or retired deliberately.
- **18 functions have gateway JWT verification disabled.** Source review found expected alternate controls for the main categories: signed Yoco/Paystack/Resend webhooks; job-secret or administrator-JWT authorization for scheduled jobs and notification handlers; and a one-time UUID confirmation token for the public COO unsubscribe page. This is not a blanket finding of unauthenticated access. The one-time unsubscribe token is currently non-expiring, and the live unsubscribe function is not represented in source control. Its token issuance/redeeming database primitives are service-role-only.
- The current COO onboarding Edge Function is source-controlled but not included in the deployment manifest. It has a dedicated scheduler-token check, defaults to dry-run, requires explicit automation enablement and fails closed for unsupported communication-preference values. Its database scheduler setting is currently disabled. The current email body does not include the separate unsubscribe endpoint, so the unsubscribe path is not yet demonstrated end-to-end.
- The `groq-study-assistant` live function requires a valid Supabase user session, restricts use to active administrators and applies the shared AI quota. It is a separate admin-only pilot, not proof of learner-facing AI readiness.
- The `coo-ai-scenario-test` function is admin-only and explicitly returns simulation mode with zero emails sent and zero actions taken. It is not autonomous execution.

### Database role-boundary spot checks

- All **103 public tables have RLS enabled**. The 9 policy-less public tables remain deny-by-default pending individual review; do not add broad policies to silence advisor warnings.
- Anonymous execution is granted to one public SECURITY DEFINER RPC, `public_tutors(uuid)`. Its inspected projection contains only verified/active tutor directory fields (name, biography, avatar, subjects, grades, rate and free-intro flag), not tutor email or private account fields. This appears intentional public-directory behavior but should remain covered by an anonymous-access test.
- The 27 authenticated-executable public SECURITY DEFINER functions inspected include admin RPCs with database-side permission checks, account-owned actions and session/call functions. Continue individual review; do not revoke them as a group.
- Public-schema CREATE privilege is false for both `anon` and `authenticated`; the private schema is also non-writable to those roles. This reduces the risk from older SECURITY DEFINER functions whose `search_path` is not empty, but empty/fixed search paths should remain the standard for new or revised functions.
- The `users` self-update policy is paired with a trigger that blocks privilege, identity and protected onboarding-field changes. Tutor profile changes have a separate privilege guard. Booking updates have multiple database triggers protecting cancellation, financial receipts, sponsorship and booking-finance fields. These controls need explicit negative tests (attempt to self-promote, self-verify, alter prices/receipts, change another person's booking, or bypass parent consent).
- Parent–learner link reads are restricted to participants and require an active account. Payment orders expose owner/admin reads; writes are intended to occur through server-side RPCs.
- AI executive training, reviews and proposals have administrator-only table policies. Proposal insertion requires a pending-founder-review state and marks CFO proposals as requiring founder approval. The founder-approval transition itself still needs a dedicated end-to-end authorization test.

These checks are focused spot checks, not a penetration test or a complete policy proof. The public repository search did not find obvious live credential values in the checked key patterns; matches were configuration variable names or explicit test fixtures. GitHub secret-scanning alert access was not available through the connected integration, and full Git-history secret scanning remains outstanding.

### Migration-history reconciliation — critical release blocker

A direct comparison of the live Supabase migration history with the current repository tree found a material mismatch:

- Live database: **66 applied migration versions**.
- Repository: **44 migration files**.
- **29 applied versions are absent from the repository.**
- **7 repository migration files are not recorded as applied in the live database.**

The seven repository-only versions are:
- `20261024150000_instant_adult_call_requests`
- `20261024150100_instant_adult_call_signaling`
- `20261024150200_instant_adult_contact_lookup`
- `20261025203000_coo_tutor_onboarding`
- `20261025220000_coo_autonomous_schedule_and_reporting`
- `20261026153000_ai_executive_reviews_and_proposals`
- `20261026153100_ai_board_operating_snapshot`

The 29 live-only versions cluster around:
- PostgreSQL extension cleanup (2 versions).
- Peer study/adult-call safeguarding and signaling (14 versions).
- COO onboarding, reminder opt-out, scheduler and reporting (9 versions).
- AI executive training, review and operating snapshots (4 versions).

Several live-only versions have similarly named repository migrations with different timestamps. Do not assume they are interchangeable or apply them again. This mismatch means the current repository migration folder is **not yet a reliable replay history for the live project**. The schema snapshot is useful evidence but does not replace the migration source and ordering.

**Release hold:** Do not run `supabase db push`, apply the seven pending repository migrations, reset production migration history, or merge a backend migration rollout until every mismatch has been classified as (a) equivalent migration with reconciled versioning, (b) live-only change requiring recovered source, or (c) obsolete/intentional change with a documented replacement. Build a clean disposable replay from the repository, compare its resulting schema with the live schema snapshot, and test all changes in an isolated staging project before requesting production approval.

### Supabase branch / staging status

The Supabase branch listing currently returns only one branch, `main`; no separate staging/development branch is listed. Its branch record reports `MIGRATIONS_FAILED`, while the parent project itself reports `ACTIVE_HEALTHY`. These are distinct status fields: do not interpret the branch status as proof that the production project is down, but do treat it as an unresolved migration/branching signal. No new Supabase branch was created because the migration-history mismatch must be resolved first and branch creation can incur additional cost.

## Current Supabase advisor baseline

### Security

| Finding | Count / level | Initial interpretation |
|---|---:|---|
| RLS enabled with no policies | 34 / INFO | Includes intentionally private-schema tables and public-schema service tables. Verify intended access model table by table; do not add broad policies automatically. |
| Extension installed in public schema | 1 / WARN | `pg_net`; assess supported relocation and dependencies before change. |
| Anonymous SECURITY DEFINER execution | 1 / WARN | `public.public_tutors(uuid)`; inspect function body, grants and intended public exposure. |
| Authenticated SECURITY DEFINER execution | 27 / WARN | Review every function's authorization checks, search_path, grants and caller requirements. Do not revoke wholesale without dependency analysis. |
| Leaked-password protection disabled | 1 / WARN | Enable after checking auth configuration and rollout implications. |

### Performance

| Finding | Count / level | Initial interpretation |
|---|---:|---|
| Unindexed foreign keys | 133 / INFO | Prioritise high-write/high-read relationships; inspect existing indexes and query plans before adding. |
| RLS auth-function initplan warnings | 133 / WARN | Review policy expressions and safely apply `(select auth.uid())`-style optimisation where semantically correct. |
| Unused indexes | 280 / INFO | Do not drop based on advisor output alone; usage may be reset or workload-specific. |
| Multiple permissive policies | 85 / WARN | Review policy composition and role semantics; multiple policies can be intentional but OR-composition can widen access. |

Advisor counts are findings, not a count of confirmed exploitable vulnerabilities. Private tables with RLS and no policies may intentionally deny all direct access.

## Priority risks requiring resolution

1. **Public source exposure controls:** Public visibility is an intentional founder decision for now. Audit repository history and current files for accidentally committed credentials, tokens, private learner/tutor data and other secrets. Rotate any exposed credentials and remove sensitive data from history using an approved procedure; never publish secrets in source.
2. **Release governance:** `main` is not protected and has no required status checks. Establish pull-request review, required CI checks and a controlled release path before relying on the public repository for production changes.
2. **Privileged database functions:** Review all 28 SECURITY DEFINER functions, starting with anonymous execution and administrator/AI/payment functions. Confirm caller authorization, fixed search_path, least-privilege grants and auditability.
3. **RLS policy correctness:** Build a table-by-table access matrix for learner, parent, tutor, administrator, staff, anonymous and service contexts. Test cross-account isolation, parent-child relationship scope, tutor booking scope and staff delegation.
4. **Payment integrity:** Reconcile Yoco checkout/webhook verification, idempotency, order/subscription state transitions, refunds and ledger records. No live payment was initiated.
5. **AI executive governance:** Validate each executive's tools, permission boundaries, approvals, action logs, schedules, retries and actual outcomes. Scenario-test endpoints alone do not prove autonomous production execution.
6. **Minor safety and privacy:** Review consent, parent/guardian relationships, communications, age verification and collection/retention of identity documents. Minimise sensitive data and define retention/deletion.
7. **Integration truth:** Distinguish deployed Edge Functions from verified provider connectivity, email deliverability, cron execution, storage access and real learner/tutor flows.
8. **Academic quality:** Verify CAPS source, grade, subject, topic, term, reviewer and version metadata; assess generated questions and explanations against curriculum evidence.

## Transformation workstreams

- **W0 — Baseline and governance:** architecture map, deployment map, environment inventory, release controls, risk register and acceptance criteria.
- **W1 — Security and privacy:** RLS, privileged functions, auth, storage, secrets, rate limits, audit, POPIA and minor safeguarding.
- **W2 — Reliability and performance:** CI, build reproducibility, monitoring, backups/restore evidence, database indexing and error recovery.
- **W3 — Core journeys:** learner onboarding/study, tutor verification/availability/booking/session, parent linking/consent/progress, admin operations.
- **W4 — Payments and commercial rules:** one source of truth for pricing, Yoco, webhook signatures, idempotency, subscriptions, commissions and reconciliation.
- **W5 — AI Executive Board:** six-role charter, capability registry, permission matrix, founder approvals, action ledger, evaluations and operating reports.
- **W6 — Academic intelligence:** CAPS content governance, assessment quality, grounded AI answers, learner progress and measurable learning outcomes.
- **W7 — Product experience and growth:** accessibility, mobile usability, onboarding conversion, tutor supply, learner retention and business analytics.

## Release gates

A release must not be called production-ready until the relevant evidence exists:

- No unresolved critical/high security defect in the changed scope.
- Cross-user and role-boundary tests pass, including negative tests.
- Payment tests prove signature verification, idempotency and correct state transitions in a safe test environment.
- AI executives cannot perform unauthorised financial, policy, account or production actions.
- Critical user journeys pass automated and manual acceptance tests.
- Database migrations replay cleanly in an isolated environment and have a rollback/forward-recovery plan.
- Backups and restore procedure are tested.
- The deployed commit and environment are identified and verified.
- Monitoring, support ownership and incident/rollback procedures are documented.

## Immediate next actions

1. Audit public repository contents and history for secrets and personal data; remediate any exposure with a controlled rotation and history-cleanup plan.
2. Map the main branch, open PRs, deployment commit and Amplify branch/environment state; add reviewed branch protection and required checks once the existing workflow is confirmed stable.
3. Read the existing functional audit, action items, release gates and migration baseline; reconcile historical claims with the live project.
4. Produce a table/function-level security review and access matrix before changing RLS or grants.
5. Run local lint, typecheck, unit, database, Edge, build and browser checks from a clean checkout or reproducible CI environment.
6. Convert verified defects into sequenced issues/PRs on transformation branches; never bypass review for production changes.

## Status

This is a baseline and work plan, not a certification. No production database schema, live payment configuration, customer data, scheduler state or production deployment was changed as part of this baseline.
