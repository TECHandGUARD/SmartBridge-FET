# SmartBridge-FET repair transfer

Target: `TECHandGUARD/SmartBridge-FET`, based on main commit `59f8ea4dc66de5b93a6b2da6b03d32dfe5d1b9d0`. The earlier repairs were developed in `TECHandGUARD/SmartBridge-correction`; their merged source tree was `4bbf769fa6bc3308a212f1a87b44b0f0fa501665`. That merge did not update this repository.

The intended repository's main already has a successful Supabase GitHub check pointing to the active SmartBridge FET project, `bbhrnidzjeccggununzq`. The mismatched inactive-project integration was observed on the correction repository. Do not disconnect the intended repository based on that earlier finding. Integration settings and the actual effects of future pushes still require operator review.

## Reconciled implementation

Transferred database-backed account/onboarding gates, role navigation, booking ownership and pricing, approved parent links, study logging, configuration validation, private file references, Yoco/Paystack selection, signed callbacks, job controls, authentication-email setup and sanitized monitoring.

Preserved the intended repository's university administration, paginated administrator user loading, configurable UI primitives, development-server and vendor-chunk settings, Supabase import alias, query/realtime helper exports, entity definitions, manifest and app icons. Core authentication/onboarding/navigation and incompatible dashboard implementations use the repaired contracts; this changes parts of their previous configurable presentation. One canonical tutor-pending screen is re-exported at the existing page path.

Backend code follows this repository's existing layout: `supabase/functions/<source-name>/entry.ts` and `supabase/shared`. The 34 deployment slugs and their JWT settings are mapped in `supabase/deployment-map.json`; source directory names are not the deployment slugs. The deployment builder checks transitive dependency hashes. There is no duplicate `supabase-functions` implementation directory.

Home-page query helpers use the restricted tutor directory. Query deduplication survives the transfer, is bounded, and clears on authentication changes; old request failures cannot remove a new session's cache entry. Generic upload helpers return private references for private buckets and public URLs only for the existing public asset buckets.

Fixed missing imports/definitions, conflicting source declarations, missing Supabase helper exports, administrator email allowlists, reminder-field remnants, the non-catching administrator panel error wrapper, and 41 query-builder `.catch()` calls. The latter now use actual promises, so a successful write is not followed by a nonexistent-method failure. The study-room delete control filters by the authenticated author's ID; RLS remains responsible for enforcement. Removed the unrelated external IP lookup from study-room submission. Favicon links now point to existing app assets.

Amplify uses `npm ci --include=dev`, `npm run build` and `dist`. Configure the SPA rewrite in Amplify's hosting console and public Supabase settings in its build environment. Keep server credentials in Supabase secret settings. No AWS settings were changed.

## Current verification

- 41 unit/API tests pass, including three authentication-aware query-cache tests.
- Lint passes across application helpers and UI primitives; its import-cycle warning depth is bounded to avoid the original lint configuration exhausting memory.
- Production frontend build passes with synthetic public Supabase settings.
- All 43 Edge modules pass local TypeScript/import checks, with remote SDK declarations stubbed. All 34 source bundles pass hash verification. No function deployment occurred.
- The six transferred SQL migrations and security fixtures retain the previously tested contracts. Their earlier verification against SmartBridge FET ran inside one rolled-back transaction. No persistent migration, real upload, email, AI request or payment was performed during this transfer.
- Browser tests could not run: Chromium was absent and its download repeatedly returned an invalid archive. Previous mocked-browser results from the correction repository are historical evidence, not a test of this combined version.

## Unresolved checks and launch blockers

`npm run typecheck` still fails under this repository's broad JavaScript-checking configuration. The original snapshot itself failed parsing because `src/lib/app-params.js` contained TypeScript syntax in a JavaScript file. That startup issue is repaired; the broader check now exposes extensive UI-prop inference, dynamic-record, library and helper typing errors. The include scope has not been narrowed, and no blanket suppression was added. A successful build/lint check does not establish typecheck completion.

`npm run check:api` intentionally fails on four existing study-room calls: `check-rate-limit`, `moderate-post`, `moderate-reply` and `report-content`. Their implementations are absent from the reconciled live function inventory. They were not replaced with permissive client moderation or fabricated success responses. Study-room posting/reporting needs a separate server-side moderation, membership, quota and privacy design, or must be unavailable during a pilot.

The other missing relations/fields, access policies, payouts and feature blockers in `functional-audit.md` remain relevant. That audit and the other transferred reports describe the correction-repository checkpoints, not an exhaustive fresh audit of every feature in this repository. New study-room endpoints and repository-specific behaviour require additional review.

No complete empty-database baseline is present. Reconcile migration history and test an isolated copy of the existing schema before enabling automatic production deployment. Supabase auth/SMTP settings, function secrets, callback registration, private binary storage operations, native scheduling and live provider tests remain activation work. Browser regressions and actual deployment-origin routing/auth redirects remain unverified.

This transfer belongs in a draft PR until the failed checks and deployment prerequisites are addressed. Main and the live database are not updated by the transfer itself. It is not a public-MVP readiness certification.
