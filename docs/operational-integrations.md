# Authentication email, scheduling, private files and monitoring

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


These repairs are staged on the existing draft PR. Production remains unchanged. No authentication emails, reminder/report emails, provider payments or uploaded customer files were sent or retained during verification.

## Authentication email

`npm run configure:auth-email` validates the operator settings in `ops/.env.example` and defaults to a dry run. With the approved target and `--apply`, it configures Supabase custom SMTP, keeps email confirmation enabled, sets the application origin and preserves existing redirect entries while adding callback/recovery destinations. It prints neither passwords nor access tokens. Use a verified sending address and the provider's SMTP credentials; the Resend SMTP path is supported.

The connected Resend account currently lists no domains. Local management/SMTP credentials and a staging application origin were unavailable. Hosted SMTP settings were not inspected or changed. Sender-domain verification, DNS authentication, real sign-up confirmation/recovery and redirect testing are activation requirements, not completed tests. Populated operator environment files are ignored by git; do not send private credentials through chat or browser configuration.

## Private storage

Migration six creates private application-document, NBT-result, chat-attachment, educational-resource and tutor-resource buckets with MIME/size limits. The existing `resources` bucket becomes private only if it is empty; the observed project has zero storage objects and zero premium resource rows. If files appear before rollout, the migration deliberately stops for a reviewed move/reference plan. The other public buckets remain for their existing public assets.

A restrictive storage SELECT boundary overrides the old unrestricted public-read policy. Writes use account-ID prefixes, active-account checks and appropriate uploader permissions. Approved resource files cannot be overwritten by ordinary uploaders. Approved/premium files require an authorized owner/admin or valid active paid subscription, using server/database checks. Expired subscriptions and account premium flags are reconciled atomically by the revised expiry function. Unspecified trial-download privileges are not assumed.

Uploaders persist `storage://bucket/account-id/file` references rather than public URLs or expiring links. File links request a fresh 60-second signed URL when opened; access is checked by Storage RLS. This is the UI's expiry setting, not a promise that authorized users cannot save or redistribute downloaded files. Existing external HTTPS references require review because database controls cannot make an externally public file private.

Application/NBT saves include the authenticated learner ID. Documents must belong to the learner's own university application, and learners cannot self-verify documents or change reviewer fields. Verified documents are administrator-managed. Resource template uploads now use the real `resources` table with the canonical `Notes` type and pending approval. Knowledge-base uploads use the private educational bucket. File removal reports errors rather than ignoring storage failures; storage/database replacement and cleanup are still separate operations and orphan cleanup remains operational work.

Chat files use canonical message metadata and recipient IDs, through a server endpoint that requires an active, verified tutoring-booking relationship. The database also protects attachment participants/references from later reassignment. This does not implement the still-missing advanced chat-room/typing/application features or grant every counselor access to every learner's private documents. Counselor/minor document sharing needs a separately approved relationship design.

## Scheduled jobs

`run-scheduled-job` accepts the job secret or an administrator, claims a database lease and invokes only a fixed target catalog. Disabled/already leased jobs skip execution. Success, partial failure and failure are recorded; downstream errors are sanitized. Leases expire after two minutes. The dispatcher times out after 60 seconds; long-running bulk jobs still need capacity testing and eventual queue infrastructure.

Eight job definitions start disabled:

| Job | Intended South African timing |
| --- | --- |
| Study reminders | Every minute, with day/time and last-notified guards |
| Session reminders | Every 15 minutes for 24-hour notices; every 5 minutes for one-hour notices |
| NBT/application deadlines | Daily at 08:00 |
| Subscription expiry | Daily at 00:05 |
| Weekly parent reports | Weekday batches every 15 minutes from 07:00; receipt deduplication sends once per approved pair per week |
| Administrator alerts | Every 15 minutes |

Native cron expressions use UTC, translated for South Africa's UTC+2. `ops/install-schedules.sql` installs pg_cron/pg_net, reads project URL/job secret/public key from Vault and registers fixed dispatch commands without embedding secrets in cron command text. It also checks HTTP transport failures. Configure Vault values only in the intended staging project; `JOB_AUTH_SECRET` must match the Vault job secret. After installation and verification, set `SCHEDULER_READY=true`. **Admin Dashboard → Operations** can then enable/disable individual jobs. Set no readiness flag until the scheduler actually works.

Only approved, active parent–learner pairs receive weekly summaries. The function rechecks approval before sending, processes at most 50 pending pairs per batch with a 40-second loop budget, and records accepted-message receipts. Summaries show current recorded completed-session totals; this is a weekly delivery cadence, not a claim that every count is limited to the past seven days. Receipt/provider idempotency reduces duplicate sends, but multi-write/provider failure windows are not an exactly-once guarantee. Preferences/opt-out policy and larger-volume capacity need launch review.

No native scheduler was installed or activated: pg_cron/pg_net are available but not installed, there is no nondefault staging branch, and necessary Vault/job secrets were unavailable. The sixth migration contains no outbound schedule activation. The optional native installation script still requires execution and integration verification on staging.

## Monitoring and alerts

The app has a render error boundary, recovery button, generic authenticated error reporting and monitored Supabase requests. Reports contain fixed event codes; they omit prompts, message bodies, email addresses, raw stack traces, credentials and query strings. Client reports are deduplicated locally and limited to ten per account per hour in the database. Unauthenticated/offline startup failures cannot be stored in this internal service; host uptime monitoring remains separate work.

`withHttp` captures sanitized server failures when `SERVER_MONITORING_ENABLED=true`. Reporting has a one-second timeout and never changes the original response. Private operational events/job history are retained for 30 days. **Admin Dashboard → Operations** shows configuration flags, jobs, last completions and recent event codes. Configuration flags are not proof of service health.

Administrator alerts summarize recent server/job failures, use active database administrators as recipients, honor suppression controls and track provider acceptance once per alert window. Client-supplied reports do not directly trigger email alerts. An email-provider outage can prevent email alerts themselves; host/cloud alarms and an independent alert destination remain launch requirements. No real alerts were sent.

## Verification and activation

38 isolated unit/API tests pass. All six migrations plus the core, API, gateway and operations SQL fixtures passed together against the existing schema and were rolled back. Checks cover private access overriding the public policy, foreign uploads, anonymous/unpaid/paid downloads, owned document review boundaries, private monitoring, disabled-job skipping, lease ownership and failure records. The tests use storage metadata, not real uploaded binaries. A fresh read confirms operational tables/private buckets remain absent and the live resource bucket remains public.

Lint, frontend typecheck, production build and local Edge/import checks pass. Remote SDK declarations are stubbed. Browser regression and live Storage/SMTP/cron/provider checks remain required; the previous browser download was unavailable. Deployment bundles include transitive shared helpers and source hashes.

Apply all six migrations in order on an isolated copy of the existing schema; configure secrets; deploy all mapped updated functions and the frontend together. Install the optional native scheduler and test dedicated accounts before enabling jobs or server monitoring. Confirm uploads, access denial, replacement/deletion, paid/expired download access, sign-up/recovery delivery, failed-job records and actual alerts. Do not mistake this reviewable implementation for a completed production rollout. The missing schema/RLS features in the functional audit still apply.

References: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp), [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions), [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control).
