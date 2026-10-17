# SmartBridge FET — launch-readiness programme (excluding Yoco)

**Owner:** Tech & GUARD | **Repository:** `TECHandGUARD/SmartBridge-FET` | **Started:** 17 October 2026

This is an execution backlog, not a claim that the features below have been deployed or independently certified. The project owner explicitly excluded **all Yoco payment implementation/configuration/testing** from this workstream. Do not change Yoco keys, webhooks, merchant settings, callback endpoints, checkout code or production payment records. Payment-dependent end-to-end acceptance remains **blocked by that exclusion**, not passed.

## Non-negotiable release rules

- Use feature branches and PR review, CI and preview verification before merging. Never silently change live customer data, authentication domains, billing or permission boundaries.
- Do not disable RLS to make an API work. All client operations must be tested as anonymous, learner, parent, pending tutor, approved tutor and admin; privilege must be verified by the database, not by client role labels.
- Preserve existing CAPS Grades 10–12 routes and established user journeys. Do not add unverified product claims, tutor earning guarantees or promises of teaching-practice credit.
- Do not use real learner identities, student numbers, contact details or other private information in screenshots, test fixtures, telemetry or promotional materials.
- For children, complete consent, tutor verification, report/block escalation and moderated contact controls before broad marketing. Obtain qualified South African legal review of safeguarding, POPIA and consumer policies.
- Avoid breaking active sign-in; custom Google OAuth branding needs Google Cloud and Supabase dashboard configuration and, for a custom Supabase auth domain, relevant paid plan/add-on.

## Track A — Tutor onboarding and verified directory (P0)

- [x] Existing student-tutor/SACE-tutor onboarding, credentials collection and admin-review flow exist in application code. **Not a claim of successful live verification.**
- [x] This PR clarifies that application approval, bookings and earnings are not guaranteed.
- [ ] Create test accounts and verify: student tutor applies → application pending → admin reviews/approves/rejects → approved profile visible → rejected/pending profile never listed → suspended tutor loses access.
- [ ] Test duplicate applications, lost connection, session expiry, repeated submit, and private student-number exposure. Only reviewers should access private credentials.
- [ ] Verify tutor rates (including subject overrides and free intro) match server-side booking quotes. Confirm profile image/video uploads on actual iPhone Safari and Android Chrome, including HEIC/MOV rejection guidance and media size/duration.
- [ ] Define verified tutor badges, appeal process, safeguarding training and audit trail. No unverified public badges.

**Acceptance:** An approved tutor is discoverable with accurate subjects, availability and prices; pending/rejected tutors cannot appear or receive bookings; credentials are private.

## Track B — Learner, parent and booking journey (P0)

- [ ] Run authenticated live tests for Grades 10–12 learner signup, subject search, tutor filters, profile, availability, booking request, tutor acceptance, cancellation and rescheduling.
- [ ] Verify parent–learner linking requires learner consent, and parent visibility is limited to the linked learner.
- [ ] Confirm cancellation windows, tutor notifications, timezone, race conditions, duplicate requests, missed sessions and dispute escalation.
- [ ] Test booking lifecycle without invoking a real payment provider; mark payment-confirmation and payout transitions blocked until separate payment approval.
- [ ] Test low-bandwidth and 320–768px layouts, empty states, interrupted connectivity, retry behavior and accessible keyboard/screen reader paths.

**Acceptance:** Booking state changes are idempotent and correctly authorized; no false 'paid' or 'completed' status can be set by an ordinary client.

## Track C — Security and privacy (P0)

- [ ] Review Supabase Security Advisor warnings as of 17 Oct 2026: leaked-password protection disabled; `pgjwt` and `pg_trgm` in `public`; 17 `smartbridge_private` tables have RLS but no policies. **Private no-policy tables may be intentional deny-by-default. Do not auto-create policies.**
- [ ] Enable compromised-password checks through Supabase Auth settings when supported, then test existing signup and reset.
- [ ] Audit Storage policies, public tutor-media disclosure, signed private document URLs, IDOR, file MIME/size validation and cleanup of abandoned media.
- [ ] Audit functions for admin authorization, input validation, rate limiting, least-privilege service keys and non-leaking errors.
- [ ] Run role/RLS tests on an isolated staging database; review data retention, deletion, incident response, audit logs and backups.

**Acceptance:** No known critical unauthorized read/write path; security findings resolved or documented with evidence and explicit owner-approved exceptions.

Supabase references:
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Track D — Communications, operations and reliability (P1)

- [ ] Verify sender domain, SPF/DKIM/DMARC, Supabase auth SMTP, email confirmation, reset and transactional notifications using non-production test accounts.
- [ ] Activate scheduler only after checking Vault secrets, job idempotency, delivery and opt-out rules; never enable all jobs blindly.
- [ ] Configure host-level uptime monitoring and alert destination independent of app email. Review error/event privacy, retention and operational dashboards.
- [ ] Run build/lint/typecheck/SQL/edge/browser suites on every PR; add production smoke tests for public pages and login without accessing private accounts.
- [ ] Document rollback, restoration, secret rotation, backups, rate limits and an incident contact.

**Acceptance:** Test emails actually arrive; failed jobs and outages are visible; a rollback is rehearsed on staging.

## Track E — Legal and child protection (P0 before scaling)

- [ ] Inventory tutor agreements, parent consent, student terms, privacy notice, cancellation/refund rules, safeguarding policy, acceptable use, complaints and data-subject requests.
- [ ] Verify admin-managed publication/versioning, document audience permissions and acceptance records; confidential tutor forms and student numbers must not be publicly accessible.
- [ ] Commission qualified legal review for POPIA, children, platform role and fee/refund obligations; avoid unconditional 'non-refundable' claims unsupported by applicable law.
- [ ] Test abuse reporting, moderation, session conduct rules, consent withdrawal and escalation to human administrators.

**Acceptance:** Versioned documents, valid consents, privacy boundaries and tested reporting workflow.

## Track F — Tutor recruitment, market validation and growth (P1)

- [ ] Pilot with 10–20 tutor applicants from one campus/region, verify eligible tutors, then recruit a comparable cohort of learners/parents. These are pilot targets, not existing users.
- [ ] Track application-to-approval, tutor profile completion, learner search-to-booking, attendance, cancellations, support tickets and satisfaction. Record actual completed sessions before making income claims.
- [ ] Make landing pages clear about eligibility, verification, CAPS grades, rates, availability and support; provide an accessible tutor-application CTA.
- [ ] Test outreach and consent-based referral processes. Collect explicit permission for testimonials and photos, especially from minors.
- [ ] Define a sustainable operating model (support workload, unit economics, platform fees, sponsored tutoring, school/NPO partnerships) without touching Yoco implementation.

**Acceptance:** Pilot report demonstrates real learner demand and tutor activity; marketing claims match observed outcomes.

## Track G — Brand and access (P2)

- [ ] Configure Google Cloud OAuth consent branding and authorized domain; plan `auth.techandguard.co.za` only if the required Supabase custom-domain plan/add-on is approved. GoDaddy DNS changes need domain administrator action.
- [ ] Test sign-in, password recovery, callbacks and logout before switching live auth configuration.
- [ ] Audit mobile performance, offline/error messaging and actual low-data behavior; do not advertise fully offline learning unless demonstrated.

## Delivery gates

1. **Gate 1 — Internal functional candidate:** CI passes; no P0 critical security findings; tutor and learner role boundaries tested.
2. **Gate 2 — Limited pilot:** tutor approvals, discoverability, bookings, safeguarding, notifications and support are demonstrated with real test accounts. Payment-dependent steps remain explicitly blocked by Yoco exclusion.
3. **Gate 3 — Commercial launch:** separate explicit approval and verified live payment/payout operations are required. Do not call this gate complete under the current exclusion.

## Evidence ledger

| Check | Evidence at programme start | Status |
| --- | --- | --- |
| GitHub `main` application checks | Run 39026048500, commit `9d23774a3f4978dc4437611dff320a88b0652cc5` | Passed automated checks |
| Tutor media mobile UI | PR #8 merged; iPhone HEIC/MOV not natively supported | Device validation pending |
| Google sign-in branding | Google shows Supabase hostname | Pending external config |
| Supabase Security Advisor | 17 private no-policy tables; 2 public extensions; leaked-password protection disabled | Review pending |
| Real email, scheduled tasks, parent and tutor journeys | Docs record outstanding activation and real-world testing | Unverified |
| Yoco and payout | Explicitly out of scope | Not touched |

Update this ledger only with reproducible test evidence, date, environment, and operator; do not infer operational success from a green frontend build.
