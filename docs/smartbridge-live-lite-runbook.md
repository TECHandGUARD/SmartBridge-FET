# SmartBridge Live Lite — free-first operations

## Scope
SmartBridge owns the React classroom, booking authorization, signaling database and the lesson workflow. Media is direct peer-to-peer WebRTC (no Zoom/Teams API). Tutor may instead select Zoom or Microsoft Teams when accepting each booking; their own meeting URLs remain supported.

### Cost boundary
- No new video vendor subscription, dedicated media server or paid API is provisioned by this feature.
- Supabase Realtime signaling and database operations consume the **existing project's quota**. Free allowances are not unlimited.
- Direct WebRTC via STUN cannot connect on every mobile or institutional network. TURN relay is intentionally **not** included, so SmartBridge Live Lite is a pilot rather than guaranteed production-grade video.
- No recording, AI transcription, in-call chat, public guest links or group calls. Avoid launching those for minors without safeguarding, retention and moderation controls.

### Security model
- Booking must be confirmed and funded (or free/sponsored), and current time must be within 20 minutes before to 30 minutes after its scheduled duration.
- Only the exact booking's tutor and student account can join. Parent booking creators do not automatically enter.
- The database independently authorizes every signal; each signal is addressed to the other booked participant.
- RLS restricts reads to recipients and inserts to the sender/recipient pair. No anonymous meeting rooms.
- Supabase Realtime is used for signaling only. Actual media flows through encrypted browser WebRTC.
- Signals expire logically after two hours; **periodic physical deletion must be scheduled** before substantial production traffic. Database does not currently have pg_cron enabled.

### Pilot acceptance tests (required before declaring production-ready)
1. Two different approved accounts with one **confirmed** test booking and correct session time.
2. Tutor selects SmartBridge Live, accepts, learner sees booking link, both grant media permissions and join.
3. Repeat with tutor joining first and learner joining first.
4. Verify audio/video both directions, mute, camera-off, screen share, leave and rejoin.
5. Confirm unbooked user, parent, expired booking, pending booking and cancelled booking are denied.
6. Repeat on Android Chrome, iPhone Safari and desktop, including different Wi-Fi/mobile networks.
7. Confirm blocked-network fallback to tutor-provided Zoom and Teams links.
8. Review safeguarding/reporting workflow with guardians before sessions involving minors.
9. Monitor database signaling usage and implement scheduled expired-signal cleanup.
10. Add an authenticated, time-limited TURN service and reconnect/ICE restart support before promising reliability at scale.

### Two-to-three-year architecture
Keep the classroom React components and booking authorization separate from the media transport. The current WebRTC peer connection can later be replaced with a self-hosted SFU (e.g. LiveKit) without changing booking identities, lesson content or platform selection. This is an architectural direction, **not** a promise of two to three years of free infrastructure.

### Operations
No new external credentials are required to test on ordinary networks. Production TURN relay, if added later, will require an operator decision about hosting and ongoing bandwidth cost. Zoom and Teams remain optional links supplied by tutors; SmartBridge does not claim it can moderate external calls.
