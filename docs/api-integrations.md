# API integration repairs — 13 October 2026

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


Eight new Edge Functions and their frontend callers are implemented on the repair branch. Existing provider calls have additional usage/delivery controls. All changes are staged for review; production functions, secrets and database schema remain unchanged. No provider messages, AI generations or payments were executed.

## Implemented contracts

| Endpoint | Request | Response | Access |
| --- | --- | --- | --- |
| `invoke-llm` | `prompt`, `task`: `study-assistant` or `study-plan` | `{response}` for chat; `weekly_plan`, `tips`, `summary` for planning | Active account |
| `generate-lesson-plan` | `subject`, `topic`, `grade`, optional `curriculum: CAPS` | `objectives`, `resources`, `homework`, `notes` | Verified tutor or database administrator |
| `send-email` | Administrator: `to`, `subject`, `text`/`body`/`html`; ordinary accounts: approved `kind` and context ID | Provider message `id`, `status: accepted` | Administrator or explicitly owned action |
| `create-checkout` | `product`: student/parent/tutor_pro, UUID `request_id` | Saved order ID, provider redirect, server amount and mode | Active account; product must match role |
| `yoco-webhook` | Raw Yoco Checkout event and signing headers | Atomic fulfilment acknowledgement | Verified Yoco signature; gateway JWT disabled |
| `resend-webhook` | Raw Resend event and Svix signing headers | Delivery-event acknowledgement | Verified Resend signature; gateway JWT disabled |

Frontend study tools no longer select an obsolete Claude model or supply a JSON schema. The server owns the configured Gemini model, instructions, structured response schemas and token limit. Lesson generation validates Grades 10–12 and requires review by the tutor; no lesson is automatically published. AI text/JSON responses are checked, with incomplete or malformed output rejected.

Parent email reports are built on the server after an approved parent–learner link check, and sent to the authenticated parent's stored address. Booking status notifications require the tutor's owned booking; lesson emails require an owned plan and a confirmed/completed booking relationship. Pending tutors can request only a status email to themselves. Arbitrary recipient/content sending is administrator-only; client sender names and destinations cannot override these controls. Legacy lesson/booking rows without ownership IDs need backfilling or repair rather than an email-only ownership fallback.

## Common protections

`shared/api.ts` bounds JSON request bodies to 32 KiB, validates required fields/IDs, returns sanitized errors and provides timed provider calls. `shared/ai.ts`, `shared/email.ts` and `shared/payments.ts` keep provider details server-side. New API calls use these adapters; the existing five AI handlers also consume the shared database quota and have a 25-second provider timeout. Discovery calls still use their existing prompts and pending-review workflow.

The fourth migration creates atomic per-account counters in a private schema. Current limits are AI 10/minute and 100/day; email actions 5/minute and 30/day; checkout 3/minute and 10/day. Days use database UTC. Scope is shared across relevant endpoints and replicas. Quota failure fails closed. These limits do not constitute an account-wide provider spending cap; configure provider budgets separately. Automated notification jobs remain governed by job authorization and provider delivery controls, not per-user email quotas.

Every production email helper call checks the private suppression list before sending and records provider acceptance after success. Signed callbacks record sent/delivered/delayed/failed/bounced/complained/suppressed events with persistent event deduplication. Bounce/complaint/suppression events block later sends. Terminal suppression is not undone by a later delivery event. Only message IDs, recipient addresses, event types and timestamps are kept; email bodies and open/click tracking are not stored. Operational retention and verified address recovery still require a policy and administrative process. Provider acceptance is separate from delivery to the recipient's mail server, which does not guarantee inbox placement.

## Yoco purchase flow

The browser selects a product and stable request ID. The server determines price from server environment settings, creates an owned order and sends a stable `Idempotency-Key` to Yoco. Both server and browser restrict redirects to approved HTTPS Yoco checkout hosts. The browser checks the returned amount against the displayed price before redirecting. Payment intents survive same-tab refreshes in session storage; retries reuse the same intent.

The signed webhook uses raw request bytes, HMAC SHA-256 and a three-minute timestamp tolerance. Fulfilment verifies the stored checkout, amount, currency and test/live mode. Payment tracking, event deduplication and subscription activation occur in one database transaction, with row locks preventing concurrent duplication. Repeated payment/event IDs do not extend access twice. **Test mode records receipts but never grants premium.** Live purchases grant/extend a calendar month of access to the paying account; they do not automatically grant a child account access. Automatic renewal is false. Returning to `successUrl` never activates access.

This is one-off premium purchasing, not recurring billing, booking payments or tutor payout automation. Failed events are acknowledged without activation. Refunds/chargebacks, delayed orphaned payments, expired checkout recovery and subscription reconciliation need operational handling before enabling live purchases. Existing premium benefits/commission enforcement and premium storage authorization need the separate functional repairs; the checkout cannot make unfinished benefits work.

## Verification

- 31 isolated API/unit tests pass, including malformed input, forged metadata, scoped email ownership, structured AI contracts, usage limits, checkout authority, raw-body signatures, timestamp/mode checks, suppression and provider acceptance.
- All five migrations and the existing plus new SQL security fixtures passed in one transaction against the connected existing schema, then rolled back. Tests cover quota exhaustion, cross-account payment reads, forbidden client RPC/insert calls, amount checks, test-mode isolation, live activation, duplicate payments and private email event/suppression controls. No fixture accounts or receipts remain.
- All 37 Edge modules pass local TypeScript/import checks with remote SDK declarations stubbed. Lint, frontend typecheck and a production build with synthetic public settings pass. Every literal frontend function call has a deployment mapping; dynamic admin discovery calls retain handler tests.
- This turn's browser regression attempt was blocked because Chromium was missing and the browser download returned an invalid archive. Earlier 19 focused browser checks were from the prior checkpoint; they are not evidence for these new frontend changes. Rerun them in a browser-equipped environment, including the enabled API checkout path.
- Live Google/Resend/Yoco credentials, Deno bundling, domain authentication, OAuth, provider webhooks and deployed UI were not tested. The connected account has one active SmartBridge production project and no nondefault staging branch; the other project is inactive.

The live security advisor still reports 18 RLS tables without policies, public extensions, mutable helper search paths, exposed security-definer helpers and disabled leaked-password protection. Some fixes are already staged in core migrations; this does not certify overall application security. [RLS remediation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [function permissions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Activation sequence

1. Provision an isolated staging project based on the existing schema. Apply all five migrations in filename order. `db/test-api-integrations.sql` expects the earlier fixture files in a rollback transaction.
2. Configure server secrets using `supabase/.env.example`: Google key/model, verified email sender/Resend key, staging app origin, job secret, Resend signing secret, and Yoco test key/signing secret. Never put these in `VITE_*` variables or GitHub.
3. Run `npm run prepare:edge -- /tmp/smartbridge-edge-bundles`. This creates source-only JSON deployment payloads for all 29 functions with mapped entrypoints, transitive shared dependencies, reviewed hashes and gateway settings. It performs no deployment. Deploy each bundle to staging with a Supabase-compatible deployment tool. Apply the fourth migration before the revised AI/email functions, because their shared guards depend on it.
4. Register Yoco `payment.succeeded`/`payment.failed` and Resend delivery callbacks on the staging function URLs. Provider webhook functions use signature verification rather than user JWTs. Configure the existing application webhooks/schedules with `x-job-secret` separately.
5. Enable `PAYMENTS_API_ENABLED=true` and `VITE_PAYMENTS_API_ENABLED=true` in staging only after configuration, with `YOCO_MODE=test`. Server amount settings are cents; frontend displays must match. The existing static links/manual payment path remains available while API checkout is disabled. Verify test receipts without premium activation, then use a controlled live acceptance plan before production enablement.
6. Verify browser flows, real provider results and failure/replay cases with dedicated accounts. Check signing errors, orphaned orders, failed deliveries and quota responses. Configure provider budget alerts and operational monitoring. Document retention/refund/payout procedures before launch.

## Future integrations

The actual application requirements now have shared adapters, scoped endpoints, signed callback handling, a payment ledger, quotas and a repeatable deployment package. No new paid service is provisioned. SMS/WhatsApp, push notifications, automated video meetings, external school systems, additional payment providers and error-monitoring vendors are not selected or registered: they require a concrete feature, account, budget and consent/ownership design. Add them through the same server adapter and authorization patterns when those decisions exist, rather than shipping unused API keys/dependencies. Existing tutor-supplied meeting links remain supported; no Zoom/Teams account automation is claimed.

References: [Google generation API](https://ai.google.dev/api/generate-content), [Yoco checkout](https://developer.yoco.com/api-reference/checkout-api/checkout/create-checkout), [Yoco payment event](https://developer.yoco.com/api-reference/checkout-api/webhook-events/payment-notification), [Yoco signature verification](https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events), [Resend webhook verification](https://resend.com/docs/webhooks/verify-webhooks-requests), [Resend event types](https://resend.com/docs/webhooks/event-types).

## Admin gateway management

The gateway follow-up adds an admin catalog and Yoco/Paystack adapters with provider-bound settlement. See [payment gateway settings](payment-gateways.md). Paystack remains disabled until account credentials and tests exist; both gateway modes can be configured separately. The fifth migration is required before revised checkout/confirmation handlers. Historical Yoco-only setup above describes the initial integration; the current checkout reads administrator gateway settings.

## Operational follow-up

Private storage/RLS, SMTP activation, job dispatch/leases, weekly reports, alerts and admin monitoring are now staged in migration six. The deployment map now contains 34 functions; the current suite has 38 isolated tests. See [operational integrations](operational-integrations.md) for validation, privacy limits and still-blocked live activation. Earlier checkpoint counts above are historical.
