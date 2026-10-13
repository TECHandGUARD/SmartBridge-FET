# Backend reconciliation — 11 October 2026

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


All 21 deployed Edge Function sources were retrieved read-only and reconciled into this branch. Eleven contain actual Resend email sending that the earlier repository versions lacked. Their message templates and provider calls are preserved. No production functions, database policies, secrets, webhooks or schedules were changed; no real emails, payments or AI requests were sent.

## Reviewable deployment map

`supabase/deployment-map.json` records every deployed slug, repository entrypoint, retrieved version/bundle hash, retrieved source hash, reconciled source hash, shared dependencies and intended gateway JWT setting. These hashes identify the reviewed snapshots; they do not claim that the staged source is already deployed. Current live functions all have gateway JWT verification enabled.

| Access | Functions | Intended gateway verification |
| --- | --- | --- |
| Active database user | generate-quiz, get-bursary-recommendations, get-chatbot-configuration, student-opportunities-assistant, download-caps-zip | Enabled |
| Database administrator | approve-opportunity-content, discover-application-deadlines, discover-opportunity-guides, discover-university-prospectuses, notify-document-status, notify-user-approved, notify-user-rejected, send-counselor-reminders | Enabled |
| Job secret or database administrator | notify-booking-confirmed, notify-new-resource, notify-payout-status-change, send-deadline-reminders, send-nbt-reminders, send-session-reminders, send-study-reminders, expire-subscriptions | Disabled only when deploying the explicit handler authorization and configured job secret together |

Every handler rejects unauthenticated requests before database access or sending. Administrator decisions use active database profiles, including `is_super_admin`, rather than editable authentication metadata. Job callers supply `x-job-secret`; an invalid supplied secret fails closed. Disabling gateway verification alone is unsafe. Counselor reminder sending is now administrator-only until a learner-owned permission model is implemented; existing ordinary learner calls will receive 403.

## Repairs

- Shared HTTP handling supports browser preflight, restricts handlers to POST and adds consistent CORS responses. Booking/resource/payout notifications accept both standard `record`/`old_record` and existing `data`/`old_data` webhook shapes.
- Server configuration prefers canonical names while accepting existing aliases. Missing credentials/model/sender/origin fail clearly. Email links use a trusted configured origin; the placeholder sender domain is rejected. All five AI functions use the configured model and header credentials, retaining their live prompts and response contracts.
- Email requests validate recipients, have a 15-second request timeout and retry 429/5xx responses up to three attempts with the same content-derived idempotency key. A successful response must include the provider message ID. Acceptance is not proof of inbox delivery. Network exceptions are reported, not internally retried.
- NBT reminder tracking uses existing `updated_at`; study reminders accept stored seconds, record `last_notified_at` and skip another send on the same South African calendar day. Session/NBT tracking errors are reported rather than ignored.
- Opportunity moderation uses canonical guide fields and reviewer columns. Publication retries reuse an ID after pending-record tracking failure. JSON metadata is stored as an object. Publishing and review tracking remain separate writes: simultaneous decisions still need a transactional database RPC.

## Verification

`npm test`: 17 passing tests, including actual handlers for all 21 authentication/preflight gates, database admin authorization, both booking payload formats, retry keys, failed/successful reminder tracking, moderation retries, all five AI contracts and study reminder repetition. Database, authentication and provider responses are isolated stubs; these are not live integration tests.

`npm run check:edge`: all 24 Edge source/shared modules pass TypeScript and local import checks. Remote SDK declarations are stubbed; actual Deno/provider bundling remains a staging check. Literal table/column references were compared with 1,420 public-schema columns and the moderation mappings were inspected separately. Frontend lint, typecheck and a production build with synthetic public settings pass. Earlier frontend browser checks remain documented in the configuration/core-flow reports; frontend components did not change in this reconciliation.

## Wiring and remaining rollout work

Read-only inspection found 47 public noninternal triggers, consisting of timestamp maintenance and user privilege protection, with no notification database webhook triggers. `cron.job` is absent. External schedulers may exist but were not verified. Active functions alone therefore do not establish automatic reminder or notification operation.

1. Use an isolated staging project. Apply the already staged application migrations and resolve remaining schema/RLS/storage blockers documented in the functional audit.
2. Configure server secrets from `.env.example`, a verified Resend sender, the staging application origin and an available Google model. Legacy aliases are supported; presence or validity of hosted credentials was not tested.
3. Bundle each mapped entrypoint with its listed shared modules. Deploy access modes and gateway settings together; exercise real authenticated staging calls before any production rollout.
4. Configure booking/resource/payout webhooks and reminder/expiry scheduling with `x-job-secret`. Verify transitions, South African reminder timing and failures using test accounts. Do not point staging schedules at production.
5. Verify provider delivery and failure reporting, then review rollout. Provider idempotency has a limited retention window; persistent event/outbox deduplication is still needed for later webhook replays. Bounce/suppression handling, reminder preferences and high-volume sending remain unfinished.

At this original checkpoint, `invoke-llm`, `generate-lesson-plan` and generic `send-email` were absent; the follow-up below implements staged replacements. This reconciliation does not certify all premium-download authorization, account ownership rules, payment processing or every data-dependent feature. See [functional audit](functional-audit.md) and [environment configuration](environment-configuration.md).

## API follow-up — 13 October

Six additional endpoints, shared quota controls, signed payment/email callbacks and delivery suppression are now staged. The updated deployment map contains 27 functions and transitive shared dependencies. Apply the fourth migration before revised AI/email functions. The 21-function reconciliation checks above describe the earlier checkpoint. Current validation and rollout limits are documented in [API integrations](api-integrations.md).
