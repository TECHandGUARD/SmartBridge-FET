# Legal, notification and tutor-profile improvements

This follow-up is prepared separately from the completed PR #1 rollout. It does not repeat the thirteen deployed migrations. Apply only `20261013234334_legal_notifications_tutor_profiles.sql` after its CI and deployment review. No paid upgrade or staging branch is required.

## Implemented changes

- Atomic administrator account approval updates protected roles/verification and creates a missing tutor profile. Tutor dashboard profile controls support a bio, professional photo and MP4 introduction in the owner-scoped `tutor-profile-media` bucket (20 MiB server maximum). Public professional media is explicitly labelled as public.
- Action notifications are durable database records with recipient-only reads. Approval and booking changes immediately attempt transactional email; failures retain an outbox event for retry. Provider acceptance is not proof of inbox delivery. Stable event keys and provider idempotency prevent ordinary duplicate sends; stale/unresolved attempts require manual reconciliation.
- Realtime publication and subscriptions cover own account/profile, action notifications and consent-scoped parent reports, alongside existing booking/study channels. Realtime reads remain subject to RLS.
- Cancellation uses a locked RPC, requires a written notice to the tutor and determines the deadline in Africa/Johannesburg. At least 24 hours' notice qualifies collected booking fees for refund review/settlement. Tutor/platform cancellations also qualify. Late cancellations preserve mandatory legal exceptions. Eligibility does not execute a payment refund or mark a payment refunded. Reconcile the actual provider payment before settlement; no refund or payout can exceed the collected balance.
- OpenAI Responses replaces the legacy Gemini implementation. Provider keys stay server-side; structured outputs are validated and storage is disabled. AI remains gated pending a verified model/key and safeguarding review.
- A premium book/bridge favicon and PWA icons are supplied.

## Legal documents and activation

`legal/` contains ten original versioned draft documents; `public/legal/` contains their matching PDFs, including four fillable signature/guardian forms. The legal page exposes draft downloads and permits acceptance only of published, hashed versions. Drafts are not automatically binding or accepted by users. Receipts identify the exact version/hash; retain the signed forms and immutable approved source/PDF versions in the business records.

Subscription fees fund access, infrastructure, database hosting, security, support and integrated services. They are normally non-refundable after service starts, but cooling-off, fixed-term cancellation, service failure, unauthorised/duplicate payments and other mandatory consumer rights remain. Database fees do not justify indefinite retention of personal information. Indemnities exclude unlawful waivers, fraud, gross negligence and non-excludable duties.

Before publication, confirm the legal entity, CIPC registration, registered physical address, responsible contact, subscription/booking prices, renewal/cancellation process, refund handling and guardian verification procedure. Have South African counsel review the terms, prominent indemnity disclosures and under-18 safeguards. Publishing each reviewed version must retain its original wording and matching PDF; never silently replace an accepted version.

Primary references: Consumer Protection Act 68 of 2008, sections 14, 17, 48, 49 and 51 (https://www.gov.za/sites/default/files/32186_467.pdf); Electronic Communications and Transactions Act 25 of 2002, sections 42–44 (https://www.gov.za/sites/default/files/gcis_document/201409/a25-02.pdf). These drafts do not guarantee immunity from loss or statutory refunds.

## Required hosted settings and acceptance

1. Configure a verified existing-domain transactional sender and the server-only `RESEND_API_KEY` and `EMAIL_FROM` (or the existing supported sender aliases), with `APP_BASE_URL=https://main.d2pos7eidu5lbk.amplifyapp.com`. Configure SPF/DKIM/DMARC without replacing the business mailbox MX records. Verify actual recipient delivery, bounce handling and spam placement. Supabase Auth confirmation/reset SMTP is a separate configuration; action-email configuration does not fix Auth SMTP.
2. Set a strong server-only `JOB_AUTH_SECRET`; configure the existing authenticated scheduled-job runner before enabling the disabled `notifications` job. It runs once per minute to retry due events, with bounded retries and manual review after the idempotency safety window. Without the worker, immediate attempts and explicit retry controls still operate but automatic recovery is not active.
3. Set server-only `OPENAI_API_KEY` and `OPENAI_MODEL` for the owner's approved OpenAI project. The owner's account email alone does not authenticate API calls. Confirm model access, spend limits and child-data safeguards before changing the frontend AI release gate. Do not place keys in Vite settings or source control.
4. Deploy the migration and all changed reviewed Edge bundles (the manifest includes the new `dispatch-notifications` endpoint), then deploy the matching frontend to Amplify. Check authenticated approval, recipient isolation, actual email delivery, realtime updates, profile photo/video save/discovery, early/late/tutor cancellation, refund settlement reconciliation and legal PDF downloads.
5. For the previously accepted student tutor reported by the owner, first review the existing account in the admin panel, then reapprove its existing intended role using the new atomic flow. This creates a missing profile and one stable approval notification. Check delivery; do not manually send duplicates or change its role based only on an email address. No customer identifier is hardcoded in migrations.

## Verification scope

Local replay covers fourteen migrations and nine SQL suites. Unit/API tests, lint, typecheck, Edge source/type/API checks and production build are run for this follow-up. Remote Docker Supabase and browser CI remain the integration gate. Local success does not certify live sender configuration, OpenAI access, payment settlement or legal enforceability.
