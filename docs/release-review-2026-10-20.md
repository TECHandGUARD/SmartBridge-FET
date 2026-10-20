# Release review — 20 October 2026

Scope: current SmartBridge FET web application, native presentation authoring,
private virtual meetings, and existing booking/classroom flows. This review
supersedes older readiness notes where they describe already-deployed repairs.
It does not certify every external provider or physical device.

## Reported meeting failure

The screenshot displays a browser media-permission failure. It does not establish
whether access was denied in site settings, phone settings, an embedded browser,
or another platform restriction. Amplify has no custom Permissions-Policy header
blocking capture. The frontend was waiting for admission and page-refresh network
requests before asking for media, and displayed the raw exception with no recovery.
A capture failure occurred after database admission had already been recorded.

Capture now starts directly in the Join click handler, before network awaits.
Admission still requires the existing server RPC and database rules. Denied capture
never triggers admission. Access rejection stops any already-created media tracks.
Users can explicitly choose microphone only, or watch and listen without capture.
Receive-only peers negotiate audio/video transceivers and can receive slides and
send reactions. To enable devices afterward, leave and rejoin using the other mode.
The same permission ordering and explanatory errors apply to booked classrooms.
No code can override the phone or browser's permission decision.

Today's latest meeting was already ended when inspected. Ended, cancelled,
not-yet-open and expired-admission states now have distinct explanations. End for
everyone requires explicit confirmation; Leave meeting remains independent.
No meeting records or admission rules were changed by this repair.

## Meeting experience

Raise/lower hand persists for the connected session. Thumbs up, applause, heart
and celebration appear beside the sender for four seconds. Reactions use a separate
encrypted WebRTC data channel, with bounded validated messages, source identity
bound to the existing authorized peer, and throttling. They are not stored in the
database. Disconnect clears reactions; a reconnect receives each peer's current
raised-hand state. Presentation and reaction channels can coexist. Playback has an
explicit play button if the browser blocks automatic audio/video playback.

## Repository-wide gates

The current inventory contains 278 frontend files and 33 migrations. ESLint,
TypeScript, production bundling, API deployment mappings (39 literal calls / 40
functions), Edge checks, static mobile release checks, 118 unit tests and 21 SQL
security/workflow fixtures pass locally. Permission recovery also passes in a
phone-width browser fixture. The CI Application checks workflow must pass both
jobs before merge and production deployment.

CI covers all-page role/navigation regression, onboarding, learner/tutor/parent/
admin flows, tutor pricing and introductions, booking and consent, legal document
management, sponsorship, resources and study tools, messaging, presentations,
classrooms, and private meetings. The isolated Supabase job runs real Auth,
PostgREST, database/RLS, private storage and local Edge integration tests. Browser
fixtures isolate third-party providers. The meeting regression requires actual
inbound audio and video byte counters, including permission-free receiving,
reactions, slide synchronization and reconnect; it does not equate a rendered
screen or signalling record with a working call.

## Readiness boundaries

| Area | Evidence / remaining work |
| --- | --- |
| Core web pilot | Automated role, API, database and browser gates described above; deploy only the tested commit. |
| Phone calls | Permission-denial and capture-mode fixtures cover recovery. Actual iOS/Android device acceptance remains a hands-on check. Browser/phone permission must be allowed for sending camera/microphone. |
| Network reach | STUN is configured; no TURN relay is provisioned. Calls on networks that block direct connections remain a production reliability gap. A successful receive-only connection does not solve network restrictions. |
| Payments | Existing checkout/receipt invariants are tested. A real hosted provider payment/refund is separate and is not certified by mocked checkout or local receipt tests. No payment credentials or mode changed. |
| Dependencies | npm audit reported 0 critical, 5 high, 4 moderate and 4 low findings. High findings trace through Tailwind's build-time glob/watch dependencies to braces stack-exhaustion; available automated fixes require a major Tailwind migration. Router and math-renderer advisories also remain. No forced major migration or blanket audit suppression was applied. |
| Optional features | Release gates still disable unfinished modules, including automatic account erasure, banking and advanced chat. A working deletion-request page is not proof of completed erasure. |
| Public launch | Real device/network acceptance, relay service, provider acceptance, dependency remediation, and operational fulfilment need evidence before calling the entire product launch-certified. A pilot release and a fully verified public launch are different readiness levels. |

The practical MVP/MLP improvement is an understandable failure state with real
recovery choices, private reusable branded presentations, and lightweight meeting
interaction. Passing code checks alone is not a promise that every browser,
network, external service, or operational process has been verified.
