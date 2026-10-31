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
- The GitHub repository metadata currently reports **public** visibility. This conflicts with the README's statement that the repository is private and confidential. Treat this as a high-priority ownership/IP exposure issue. No visibility change has been made.
- Supabase project reports `ACTIVE_HEALTHY`, PostgreSQL 17.6.1.
- The public schema inventory contains **103 tables**.
- Supabase reports **48 active Edge Functions**.
- The repository has a Vite/React application, Supabase functions and migrations, Amplify build configuration, a GitHub Actions quality workflow, automated unit/API checks and a large browser-test suite.
- Package scripts include lint, typecheck, unit tests, browser tests, API/Edge checks, DB checks and production build.
- The current quality workflow runs on pull requests and pushes to main. Its application job uses synthetic public Supabase values and includes a broad browser test suite. Passing this workflow is not proof of live provider integrations or production user journeys.
- The repository contains extensive prior repair, rollout and operational documentation. Some documents describe historical checkpoints and must be reconciled against current live state before being treated as current truth.

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

1. **Repository visibility mismatch:** GitHub metadata says public while repository documentation says private/confidential. Confirm intended visibility with the owner and restrict access if required. No change made.
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

1. Confirm repository visibility intent; do not assume README text overrides GitHub metadata.
2. Map the main branch, open PRs, deployment commit and Amplify branch/environment state.
3. Read the existing functional audit, action items, release gates and migration baseline; reconcile historical claims with the live project.
4. Produce a table/function-level security review and access matrix before changing RLS or grants.
5. Run local lint, typecheck, unit, database, Edge, build and browser checks from a clean checkout or reproducible CI environment.
6. Convert verified defects into sequenced issues/PRs on transformation branches; never bypass review for production changes.

## Status

This is a baseline and work plan, not a certification. No production database schema, live payment configuration, customer data, scheduler state or production deployment was changed as part of this baseline.
