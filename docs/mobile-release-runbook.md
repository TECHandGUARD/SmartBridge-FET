# SmartBridge FET — mobile release runbook

## Current distribution (no developer-account fees)
- Host the responsive web application on AWS Amplify using HTTPS.
- On iPhone, use Safari → Share → Add to Home Screen.
- On Android, use Chrome → browser menu → Install app / Add to Home Screen where offered.
- The platform requires connectivity for AI, bookings and most learning functions. The offline banner communicates that limitation.
- The web app is **not** a signed Android APK/AAB or iOS IPA and is **not** approved by either store.

## Technical release strategy
Keep the existing React/Vite/Supabase codebase as the single source of truth. Do not rewrite the application when developer accounts become available. Prepare an Android Trusted Web Activity or native shell only after reviewing browser functionality and store policy. For iOS, a simple website wrapper may be rejected under App Store guideline 4.2; design and verify genuinely app-like value before choosing Capacitor/native packaging. Any app shell must support account deletion, safe login handoff, deep links, native permissions and payment rules.

## Non-negotiable release checks
1. `npm ci && npm run check:mobile && npm run lint && npm run typecheck && npm test && npm run build`.
2. Confirm successful GitHub CI and AWS Amplify deployment.
3. Use physical Android and iOS devices to verify sign-in, sign-out, password reset, student/parent/tutor/admin roles, AI limits, curriculum resources, bookings, payment webhooks, cancellation/refund paths, email, notifications, account deletion requests, accessibility, and low-bandwidth behavior.
4. Complete deletion **fulfilment** (not just request intake): verify identity, remove or anonymize linked data and third-party copies, retain only legally necessary records, notify the requester and log the action.
5. Review minors' consent, privacy policy, tutor vetting, user-generated content moderation and reporting, provider agreements, copyright, and official curriculum claims.
6. Decide and implement store-compliant billing for digital subscriptions; tutor services and digital benefits may have different rules.
7. Prepare signed Android AAB and iOS IPA with owned app IDs, certificates, provisioning profiles, store privacy labels, age ratings, screenshots, reviewer accounts, contact URL and disclosures.
8. Pass internal/closed testing, address crashes and store-review feedback before marketing store availability.

## Ownership-only steps deferred until budget is available
- Create and verify Google Play Console and Apple Developer organization accounts.
- Supply legal organization name, required identifiers, support email and domain, app identifiers, signing credentials and banking/tax information.
- Enrol testers and approve final store submissions.

## Release gate
Store readiness is **blocked** until signed builds, real-device tests, payments, account erasure and platform reviews have passed. Passing the static mobile preflight does not override these blockers. Do not advertise availability on either store before approval.
