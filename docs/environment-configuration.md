# Environment and configurable settings

> Historical repair checkpoint from the correction repository. See [repository-transfer.md](repository-transfer.md) for validation and blockers in SmartBridge-FET.


Operational settings live in environment configuration rather than repeated page/function literals. This change is on the repair branch; hosted environment values and live functions have not been changed.

## Frontend settings

Copy `.env.example` to `.env.local` for local development. Set the same public variables in the hosting service for each deployment branch. `npm run check:env` validates production-mode settings; `npm run check:env -- staging` validates staging mode. `npm run build` also validates its selected mode and refuses an invalid build. Use `npm run build -- --mode staging` for a staging configuration.

| Setting | Use |
| --- | --- |
| `VITE_SUPABASE_URL` | Required HTTPS project origin; loopback HTTP is allowed for local Supabase. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Required browser key, preferred. Existing `VITE_SUPABASE_ANON_KEY` remains supported when this is blank. Privileged keys are rejected. |
| `VITE_APP_BASE_URL` | Optional HTTPS origin; defaults to the current browser origin. Query-string/local-storage app-domain overrides are no longer used. Auth callbacks deliberately use the current origin to keep local/staging sessions on their own host. |
| `VITE_YOCO_STUDENT_URL`, `VITE_YOCO_PARENT_URL`, `VITE_YOCO_TUTOR_PRO_URL` | Optional approved checkout URLs on `pay.yoco.com`. Blank/invalid URLs do not render a payment link. |
| `VITE_STUDENT_MONTHLY_PRICE`, `VITE_PARENT_MONTHLY_PRICE`, `VITE_TUTOR_PRO_MONTHLY_PRICE` | Positive displayed prices. Defaults are the existing R20/R50/R150. Premium and dashboard displays share these settings. |
| `VITE_EFT_BANK_NAME`, `VITE_EFT_ACCOUNT_NAME`, `VITE_EFT_ACCOUNT_NUMBER`, `VITE_EFT_BRANCH_CODE` | All four public business details are needed to show EFT instructions. No embedded account-number fallback. Keep numbers as strings to preserve leading zeros. |
| `VITE_COMPANY_NAME`, `VITE_CIPC_REGISTRATION`, `VITE_REGISTRATION_DATE`, `VITE_SUPPORT_EMAIL`, `VITE_CORPORATE_WEBSITE` | Shared company settings, including support links across error, pending-tutor and payout screens; existing nonsecret identity/contact defaults are preserved pending business verification. |
| `VITE_CORPORATE_LOGO_URL` | Optional HTTPS asset URL. The marketing banner uses a text fallback if unset. |

All `VITE_*` values are public and embedded in the browser bundle. Do not put service-role keys, private keys, database credentials, Gemini/Resend/provider secrets or access tokens in these settings. Validation rejects known secret-variable names and privileged Supabase key formats, but cannot classify every possible secret. Error messages show setting names rather than values. Frontend validation is not a substitute for RLS or provider-side authorization.

Environment changes require restarting Vite locally and rebuilding/redeploying the frontend. Staging and production must use their intended Supabase project and payment URLs. Configure Supabase Auth's Site URL and redirect allowlist for the deployed `/auth/callback` and `/reset-password` destinations. An environment file alone does not update those dashboard settings.

## Edge Function settings

`supabase/.env.example` documents server settings; it is not read automatically by hosted functions. Configure the following in the target Supabase project's Edge Function secrets. Hosted Supabase injects `SUPABASE_URL` and the legacy `SUPABASE_SERVICE_ROLE_KEY` used by these existing functions. Local serving needs a real ignored env file passed explicitly to the chosen runtime. This repository has a custom `supabase/functions/*/entry.ts` layout, not a ready-to-run standard Supabase CLI project.

| Setting | Use |
| --- | --- |
| `GEMINI_API_KEY` | Server-only Google credential. Sent as an `x-goog-api-key` header, not in the request URL. |
| `GEMINI_MODEL` | Required model ID for all five repository AI functions. Select a currently available model for the account. There is no retired-model fallback. |
| `APP_BASE_URL` | Required trusted HTTPS origin for approval/rejection and reminder links; legacy `APP_URL` remains supported. Request Origin/Referer headers no longer choose email destinations. Use the staging origin for staging. |
| `RESEND_API_KEY` | Required by the 11 reconciled email functions; delivery still needs a verified sender and provider access. |

| `EMAIL_FROM` | Required verified sender; legacy `FROM_EMAIL` remains supported. The old placeholder domain is rejected. |
| `JOB_AUTH_SECRET` | Required for scheduler/webhook calls using `x-job-secret`; these functions also accept a database-authorized administrator JWT. |

Include the shared modules listed in `supabase/deployment-map.json` when bundling/deploying each function. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` take precedence over legacy `DB_URL`/`SERVICE_ROLE_KEY`. Required settings throw a clear configuration error instead of silently substituting an empty key. No provider credentials were retrieved, printed, committed or populated during this change.

All 21 deployed sources have now been reconciled into the repository, including the 11 real email implementations. See [backend reconciliation](backend-reconciliation.md) for access modes and staging rollout requirements. Live functions remain unchanged. Model configuration cannot fix missing AI endpoints, missing tables, access policies or provider availability. Displayed plan prices and Yoco amounts must be checked together; frontend prices never authorize bookings, paid access or payments. Administrator notification recipients are resolved from active database administrators instead of fixed email addresses; environment variables do not grant administrator access. Server-enforced booking rules, database schemas, storage bucket names and access checks intentionally remain code/database contracts.

## Verification

Lint, typecheck, 31 unit tests and a production build with synthetic public connection values pass. Configuration tests cover missing values, legacy/public versus privileged keys, blocked secret names, unsafe checkout URLs, partial EFT configuration, invalid prices, staging origins and server model/link requirements. Two additional browser checks verify missing/privileged connection keys show a usable startup error without sending backend requests (`npm run test:e2e:config`). The existing 19 focused browser checks plus the broad route audit pass and verify unset checkout/EFT options show unavailable and retain the existing core-flow checks. The actual function handlers and shared helpers are executed with isolated database/provider stubs. All 37 Edge modules pass local TypeScript/import checks; remote SDK declarations are stubbed, so this does not prove Deno bundling. No live provider or deployed function execution is claimed.

References: [Vite environment variables](https://vite.dev/guide/env-and-mode), [Supabase function secrets](https://supabase.com/docs/guides/functions/secrets), [Google generateContent](https://ai.google.dev/api/generate-content).

## API follow-up

The fourth migration and revised/new functions add database usage controls, scoped email sending, private delivery/suppression records and one-off Yoco checkout. `VITE_PAYMENTS_API_ENABLED=false` keeps the existing manual payment path until staging verification. Server-only `PAYMENTS_API_ENABLED`, `YOCO_MODE`, `YOCO_SECRET_KEY`, `YOCO_WEBHOOK_SECRET`, `RESEND_WEBHOOK_SECRET` and `PAYMENT_*_AMOUNT_CENTS` are documented in the server template. These must never be browser variables. See [API integration contracts and activation sequence](api-integrations.md); browser/provider integration verification remains outstanding.

Admin-managed gateway settings and separate Yoco/Paystack test/live credentials are documented in [payment gateways](payment-gateways.md). Credentials remain server-side; the panel contains no key entry or secret display.
