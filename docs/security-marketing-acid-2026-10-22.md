# Security, marketing and transaction integrity

Full administrators publish articles, campaigns and events under Admin → Marketing. Drafts are private. Published links remain stable; uncheck Publish publicly to withdraw a post. Public content is plain text, so embedded markup cannot execute. No posts, invitations, staff assignments, social posts or financial rewards are created automatically.

Visitors can browse approved active tutors at `/find-tutors` and share individual profiles. This projection excludes email, user IDs, phone numbers, SACE numbers and clearance documents. Contact and booking stay behind the existing authenticated flows. `/news` lists published posts. `/refer` gives a signed-in member their personal invitation link. Study guides and posts offer WhatsApp sharing and copying; the visitor chooses whether to send anything. Automatic social publishing and bulk marketing email are not implemented.

Attribution captures the first valid campaign/referral link in session storage, for up to seven days in that browser session. New accounts can record it after sign-in, once, while their account is at most seven days old. Self-referrals and suspended referrers are excluded. No cash, credits or premium access is granted. This is attribution, not proof that a referral caused a signup or a fraud-proof affiliate system. Verification on another device will not carry session storage. Admin metrics count attributed registrations and members with a later verified live payment record; refunded historical payments still count as having paid. Test mode is excluded. These metrics are not profit or net revenue.

## Security repairs

* Restrictive current-account-state RLS policies cover existing SmartBridge public tables and Storage objects. They preserve existing ownership/duty policies. Separate `tech_guard_` website tables are excluded.
* Assessment submission, marking and review resubmission also check current activity in their privileged implementations; those functions bypass RLS and therefore need their own check.
* Bulk CAPS downloads allow only exact HTTPS education.gov.za hosts and the project's public caps-documents storage path. Redirects, credentials, custom ports and other destinations are rejected. Only PDF bodies are accepted. Limits: 20 documents, 8 MiB per PDF, 32 MiB total source content, 12 seconds per fetch and 35 seconds for fetching the archive sources. One failed file fails the archive rather than silently omitting content. Unsupported destinations require explicit engineering review, rather than adding arbitrary URLs. Download counts use an atomic SQL increment.

## ACID scope and evidence

Postgres transactions provide atomicity for database operations, not for an external payment provider and the database together. The existing signed-webhook/retry system reconciles that boundary. This release does not perform a live charge or claim distributed ACID.

* Atomicity: each post save and its audit are one RPC transaction; payment fulfillment updates entitlement, receipt and deduplication event in one transaction. SQL fixtures inject failures after intermediate writes and assert rollback.
* Consistency: foreign keys, unique referral attribution, no self-referral, field checks, current-account permissions and existing server pricing/payment amount/currency/mode checks enforce invariants.
* Isolation: existing payment/booking row locks and unique request/event IDs remain in place. Referral attribution locks the account and has one row per account. Post edits lock the post and reject stale versions. Fixtures exercise duplicates and stale edits. Local PGlite executes one connection; it does not establish multi-connection stress-test results.
* Durability: read-only production inspection on 22 October confirmed WAL logical, fsync on, full_page_writes on and synchronous_commit on. Default isolation is read committed; locking and constraints protect the stated operations. This is not a backup-restore or crash-recovery test.

## Verification

Unit tests include internal/lookalike URL rejection, redirect configuration, body/content-length bounds, non-PDF rejection and bounded first-touch attribution. SQL replay includes the existing 24 workflow fixtures and a new privacy/suspension/transaction fixture. Browser fixtures exercise public tutor/post pages, campaign attribution, admin publishing and referral links at 390 and 1440 pixels. Browser services are isolated fixtures, not real member registrations or messages. Release checks must complete before production is described as updated.
