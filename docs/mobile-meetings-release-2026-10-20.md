# Mobile meetings release — 20 October 2026

The released app supports phone-sized layouts, default data saver video, microphone-only entry, permission-free watch/listen entry, and audio-and-slides entry without incoming video. Authenticated short-lived TURN credentials allow encrypted relay fallback when direct connections fail. Hosts can select relay-only mode before joining restrictive Wi-Fi. Network return/change events and failed ICE connections initiate recovery. Phone audio blocked by autoplay policies has a tap-to-play recovery control.

## Teaching and meeting controls

- Tutors/administrators can build or choose a native deck during a call, edit the current slide, show a correction to everyone and save changes to their account. Saving uses revision checks to protect edits from another device. Speaker notes remain with the presenter.
- Uploaded PDFs support live correction notes on individual pages and download of the corrected page. Original PDF text is preserved; native slide text can be edited directly.
- A joined meeting host can invite registered, active adult accounts by email. Tutors must be verified. Invitations use the durable email outbox, have stable request IDs for retries and provide fresh five-minute admission. Previously admitted people can reconnect. Rooms support six people including the host.
- Existing scheduled meeting invitations and one-hour/30-minute reminder processing remain in place. Guests added after those thresholds receive their immediate invitation; past reminder thresholds are not replayed.

## Verification

121 JavaScript unit tests, six relay authorization/identity tests and 22 SQL fixtures passed. Browser regressions cover real audio/video, permissions, native/PDF slides and corrections, saving, private notes, live guests, controls, recovery, audio-and-slides, rejoining and shutdown, alongside the wider application suites.

The [main-branch encrypted relay run](https://github.com/TECHandGUARD/SmartBridge-FET/actions/runs/39441563114) passed actual group and free introductory classroom audio/video and data through forced TLS TURN, including ICE recovery and audio-and-slides entry. Selected transport statistics confirm relay candidates. Browser auth/signaling data are isolated fixtures; camera/mic devices are simulated, while media/data use real WebRTC and AWS relay traffic. No real learner accounts or invitation recipients were used by these tests.

AWS Amplify deployment 146 succeeded for commit `e80558ceb8e4ba634ae402d5150ba418278f76bb`. HTTP checks on the live site's five relevant JavaScript bundles confirmed guest invitations, live edits, PDF corrections, audio-and-slides, data saver, relay endpoint and phone audio recovery. The deployed relay source matches the reviewed source; invalid user tokens return HTTP 401 without credentials.

## Migration history reconciliation

The Supabase integration reported remote migration versions missing locally. Nine previously applied migrations were recorded under generated timestamps rather than repository timestamps. Eight applied SQL bodies match their repository files after trimming; the account-deletion migration differs only in formatting and an idempotent DROP POLICY IF EXISTS guard, with equivalent final behavior. Only migration tracking versions/names were reconciled. No migration was replayed and no application/user data was changed.

| Applied version | Repository version | Migration |
|---|---|---|
| 20261014074001 | 20261014065749 | admin_subscription_pricing |
| 20261018072119 | 20261018093000 | tutor_assessment_centre |
| 20261018073030 | 20261018120000 | assessment_admin_moderation |
| 20261019040734 | 20261019035605 | booking_checkout_and_introductions |
| 20261019041000 | 20261019040908 | protect_booking_financial_receipts |
| 20261019112101 | 20261019133000 | learning_document_grounding |
| 20261019112401 | 20261019133500 | invalidate_learning_knowledge |
| 20261019130457 | 20261019180000 | account_deletion_requests |
| 20261019142351 | 20261019210000 | smartbridge_live_signaling |

## Remaining acceptance and platform items

Physical iPhone/Safari and Android/Chrome checks on MTN, Vodacom, Telkom, Cell C, and school/local Wi-Fi remain pending. Test entry, speaker audio, switching Wi-Fi/mobile, audio-and-slides, live corrections, guest invitations and rejoining on each. Carrier/firewall compatibility and real-device performance have not been certified. Browser screen-capture availability varies; PDF/native presentation does not require screen capture. AWS relay usage incurs charges.

Existing Supabase advisories remain: [extensions in the public schema](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [pre-existing authenticated SECURITY DEFINER RPCs requiring access review](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). New meeting/relay API wrappers use SECURITY INVOKER with private, authorization-checked helpers. Private tables intentionally have RLS with no direct client policies and no browser table privileges.
