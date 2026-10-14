# Yoco and administrator-managed legal documents

## Yoco: connect the existing account
The existing server Checkout API adapter and Payment Gateways panel are reused. Paystack stays disabled. This supports one-off subscription purchases; tutor booking collection, recurring subscriptions, refunds and tutor payouts are separate.

1. In Yoco's Checkout API setup, use Test keys. Keep private keys out of chat, screenshots, frontend configuration and source control.
2. In SmartBridge FET's Supabase project bbhrnidzjeccggununzq, provision the Edge Function secrets YOCO_TEST_SECRET_KEY and YOCO_TEST_WEBHOOK_SECRET through secure secret settings. Register https://bbhrnidzjeccggununzq.supabase.co/functions/v1/yoco-webhook with Yoco using the test secret; retain the returned webhook signing secret securely.
3. Configure server PAYMENTS_API_ENABLED=true and the corresponding frontend checkout feature flag only after the two secrets and webhook are ready. Use the deployment's existing app origin.
4. In Admin Dashboard → Payment Gateways, select Yoco, test mode, enable and save. Leave Paystack disabled.
5. Run success, declined/cancelled, return-page, webhook retry and amount/ownership checks. Verify the server ledger and Yoco's test record. Test payments must not grant paid live access.
6. Before live activation, verify the actual SmartBridge website domain in Yoco and configure separate YOCO_LIVE_SECRET_KEY and YOCO_LIVE_WEBHOOK_SECRET, register the live webhook and explicitly switch mode. Do not treat a successful redirect as proof of payment.

Official documentation: https://developer.yoco.com/guides/online-payments/accepting-a-payment and https://developer.yoco.com/guides/online-payments/webhooks/verifying-the-events

## Legal documents
Apply the managed_legal_documents migration before deploying the new UI. Admin Dashboard → Legal documents supports creation, text editing, upload/replacement of PDFs up to 10 MB, category/audience changes, publication/unpublication and deletion. Categories: Agreements, Compliance documents, Terms & Conditions, Policies.

Public: published general policies/terms. Tutors: tutor instructions and payment schedules (includes student_tutor, sace_tutor and tutor roles). Parents/Learners: their respective material. Specific user: assigned account and admins. Admins only: internal records. Completed forms must have Contains personal information selected; database constraints forbid public or role-wide sharing of these records. Uploading a form does not establish guardianship, accept a contract or enable account access.

The private storage bucket uses authenticated downloads and row-level access controls. The UI does not generate signed URLs. Legacy hardcoded PDFs are removed from public build assets, and the terms page has no bundled draft fallback. Existing downloaded copies cannot be recalled. Historic acceptance hashes/versions remain after document deletion. This feature does not certify or publish the existing draft legal text automatically.

Every change increments revision and records actor/action/version/audience in a private audit table. Concurrent saves/deletions use revision checks. Replacement uploads use a new path; a failed save removes the unattached upload when possible. Metadata deletion/unpublication denies future user downloads even if a storage cleanup attempt fails. Administrator cleanup errors are reported.

Validation includes a rolled-back hosted migration rehearsal and database fixtures covering anonymous, tutor, owner, cross-user, admin-only and draft boundaries; file access; unpublication; non-admin writes; confidential-publication rejection; required version changes; revision increments; and change audit. Full repository CI is required before release. A real Yoco merchant checkout remains pending secure account credentials.
