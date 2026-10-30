# SmartBridge FET — R0 Marketing & Growth Hub Foundation

## Status
Design proposal only. No production database, production app, third-party account, or paid service is changed by this document.

## Operating constraint
The approved marketing budget is **R0**. The system must support organic activity only until the founder explicitly approves a budget change.

- Paid campaigns default to disabled.
- No ad spend, paid subscriptions, paid automation, or paid API usage may be initiated by this hub.
- Any future spend requires an explicit founder approval record before activation.
- Prefer free native tools and manual workflows where practical.

## Existing foundation discovered
The repository already contains a marketing/security migration, `20261022110253_security_marketing_transactions.sql`, which creates:
- `public.marketing_posts` for public articles, campaigns, and events.
- Private referral codes and one-time registration attribution.
- `public.record_marketing_attribution` for registration attribution.
- `public.marketing_metrics` for admin campaign/registration and paid-member counts.
- A private audit trail for marketing-post changes.

The admin navigation currently has no Marketing & Growth Hub entry. Existing `tech_guard_leads` is the enquiry intake table and should be extended only after its full schema, dependencies, and policies are revalidated. Do not create duplicate campaign-post, referral, or registration-attribution structures.

## Proposed first release
### 1. Organic campaign planner
Use existing `marketing_posts` as the content source. Add workflow metadata only if required after reviewing all callers:
- channel: WhatsApp, Facebook, Instagram, TikTok
- content format: short video, reel, carousel, story, status, text post
- planned/published timestamps
- campaign objective and target audience (learner, parent, tutor)
- status: idea, draft, scheduled, published, archived

Scheduling is a planning aid; no automated publishing is assumed in the R0 release.

### 2. Enquiry inbox
Use existing `tech_guard_leads` as the source of truth.
- Admin-only viewing and status updates.
- Capture channel/source and optional campaign reference.
- Keep a minimal activity/history trail for follow-up.
- Do not expose leads publicly.
- Do not use learner education records as marketing data.

### 3. Attribution and reporting
Reuse existing referral and registration attribution functions.
- Report organic post/campaign referrals and registrations.
- Distinguish clicks/visits from verified registrations; do not imply a click count unless a consent-aware event is actually recorded.
- Show tutor enquiries, learner registrations, and paid conversions only where reliable source data exists.
- Clearly label unavailable metrics rather than estimating them.

### 4. Consent and privacy
Before introducing analytics cookies, pixels, retargeting, or third-party audience tools:
- Define separate, optional consent for analytics and direct marketing where legally required.
- Record purpose, notice/version, source, timestamp, and withdrawal.
- Do not bundle marketing consent with essential account terms.
- Do not track minors or send learner names, IDs, school details, subjects, marks, learning activity, messages, or other education data to advertising platforms.
- Review guardian/child consent requirements and POPIA obligations with qualified advice before activating tracking or messaging.

The current `user_consents` records include privacy/terms and tutor agreement types; they do not establish that analytics or direct-marketing consent is already collected.

### 5. Admin controls
- Add an admin-only Marketing & Growth Hub route and navigation entry.
- Require full administrator authorization on server/database operations, not only hidden UI.
- Add an explicit operating-budget setting with a default of ZAR 0.
- Any proposed paid campaign remains disabled until founder approval is recorded.
- Store third-party credentials only in server-side secrets; never in browser code or ordinary public tables.

## Data model direction — subject to schema review
Prefer the smallest additive changes:
- Extend `marketing_posts` only for editorial workflow and channel metadata, preserving existing public publishing behavior.
- Extend `tech_guard_leads` only for attribution/source fields and follow-up metadata, preserving its existing public INSERT intake contract.
- Add a small append-only lead activity table only if needed for auditability.
- Add a founder approval/audit record for any future budget or paid-campaign activation.
- Avoid building generic event/outbox/integration frameworks until a real free/approved integration requires them.

Do not implement advertising pixels, Meta/TikTok APIs, WhatsApp Cloud API, payment hooks, or external account connections in the R0 foundation.

## Security requirements
- RLS enabled on every new exposed table.
- Public users may submit an enquiry only through a narrowly validated insert path; they must not read, update, or enumerate leads.
- Admin read/update operations must use the project's established full-admin helper and active-account checks.
- SECURITY DEFINER functions must use a fixed search_path, explicit authorization checks, minimal grants, and safe input validation.
- No service-role key or provider secret in client-side code.
- Add tests for anonymous access, ordinary authenticated users, inactive accounts, admins, and public lead submission.

## Delivery sequence
1. Review every current caller of `marketing_posts`, `tech_guard_leads`, consent functions, and marketing metrics.
2. Finalize a minimal additive migration and RLS policy design.
3. Add database tests and migration rollback/recovery notes.
4. Build the admin hub UI and role-gated navigation.
5. Validate organic attribution and lead follow-up using synthetic/test data.
6. Request explicit approval before any production database migration or production deployment.

## Acceptance criteria
- No paid spend or paid service is enabled.
- Existing public marketing-post and referral flows continue to work.
- Leads remain private; public intake cannot read or alter existing leads.
- Admin-only functions enforce authorization server-side.
- Marketing consent is separate, optional, versioned, and withdrawable before any optional tracking/messaging is enabled.
- Reports distinguish measured facts from unavailable metrics.
- Production remains unchanged until explicit approval.


## Repository review findings (30 October 2026)

### Confirmed existing callers
- `src/components/admin/MarketingPanel.jsx` reads and edits `marketing_posts`, calls `save_marketing_post`, and calls `marketing_metrics`.
- `src/pages/MarketingNews.jsx` reads published posts for the public news/campaign pages.
- Public post links carry the campaign slug into `/register?campaign=...`.
- The existing marketing migration records a campaign post against a new registration, once per user, within the first seven days after account creation.
- Existing metrics count attributed registrations and verified live paid-member records. They do not provide impressions, click totals, or social-platform engagement.

### Confirmed enquiry intake
- `tech_guard_leads` is created with: id, name, email, phone, company, service, message, status, created_at.
- Existing status values are `new`, `contacted`, and `closed`.
- The public website migration grants anonymous/authenticated INSERT with a permissive check. It does not grant public SELECT or UPDATE in that migration.
- No existing lead inbox UI or lead activity history was found in the reviewed files.
- A future admin policy must not weaken public privacy. Admin read/update should be narrowly scoped to the full-admin helper, with active-account enforcement where appropriate. Public INSERT must remain separate from admin SELECT/UPDATE.

### Confirmed consent behavior
- Onboarding writes `privacy_and_terms`; tutor onboarding also writes `tutor_service_agreement`.
- The reviewed onboarding migration creates those records without a marketing/analytics opt-in.
- The reviewed consent policy allows users to read their own consent records. Do not interpret existing terms acceptance as consent to advertising or analytics.

### Migration design decision
Do not add a generic tracking-event platform in the first R0 release. The smallest safe first migration should:
1. Add nullable, validated source metadata to `tech_guard_leads` (channel/source and optional campaign slug) without changing the public form's required fields.
2. Add an append-only private lead activity table for admin follow-up, with RLS and explicit full-admin policies.
3. Add a founder-controlled R0 budget/paid-activation approval record with an audit trail; default budget is zero and paid activation is false.
4. Add explicit consent types and a versioned/withdrawable consent write path only when the UI is ready to collect them; do not enable pixels or external tracking in this migration.
5. Add database tests covering anonymous lead submission, denial of anonymous/ordinary-user lead reads and updates, admin access, inactive admin denial, and prevention of paid activation without founder approval.

Before writing SQL, validate the live schema, function signatures, role model, and policy catalog with read-only database queries. The repository review alone is not sufficient to authorize a production migration.
