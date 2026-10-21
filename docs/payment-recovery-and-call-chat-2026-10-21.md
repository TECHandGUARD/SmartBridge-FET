# Recoverable payment requests and in-call text

Premium checkout, booking checkout and gateway administration use a shared bounded
request helper. The limit includes Supabase session acquisition and HTTP/body
processing, aborts stalled requests and releases loading/saving controls. Failed
checkout retries keep the existing payment request ID. A timed-out admin save is
not assumed to have failed: the interface asks the admin to refresh and confirm
its persisted state before retrying. Loading is no longer described as an
unconfigured or unavailable gateway. An enabled gateway is still subject to the
server's global checkout switch, credentials and account permissions.

Production inspection on 21 October found Yoco enabled in live mode, successful
payment-gateway responses, and a recent pending R1 payment order without a Yoco
checkout. Three checkout requests returned HTTP 502. R1 is below Yoco's published
R2 minimum, which is a plausible explanation for those checkout failures; the old
provider error body was not retained, so it is not definitive proof of their
cause. Checkout now rejects a sub-R2 Yoco amount with a clear 422 response before
contacting Yoco. It never increases a price automatically. Existing subscription
prices were read as R29 student, R59 parent and R350 Tutor Pro; they were not
changed by this repair. No new live charge or refund was performed for this work.

Meetings and booked virtual classrooms offer a labelled text composer and live
message log. Text uses a separate ordered WebRTC data channel on each existing
authenticated participant connection. It works with cameras and microphones off,
including listen-only meeting entry. It does not bypass meeting/classroom
admission or introduce a public chat topic. Sender identity comes from the peer
connection, not payload fields. Messages are rendered as text, length-limited,
rate-limited and retained only in the current in-memory session (last 100).

Leaving clears local history. Late arrivals do not receive old messages. Sending
requires an open, non-congested connection; the UI reports how many connected
peers accepted the send rather than promising delivery to every invitee. Failed
sends preserve the draft. These are in-call comments, not a persistent forum or
moderated transcript.

Verification includes unit tests for malformed/replayed payloads, identity
spoofing, stale channels, closed/congested channels, timeouts and API errors;
a phone-width payment browser fixture tests a hung catalogue, hung admin save,
refresh/retry and stable checkout IDs. Existing multi-context WebRTC browser
fixtures now exercise group and classroom chat, devices off, outsider exclusion,
literal markup rendering and leave/rejoin cleanup. Test accounts and payment
responses are isolated fixtures, not real users or card charges. Physical mobile
carrier testing remains outside these automated checks.

Provider reference: https://support.yoco.help/en/articles/109554-troubleshooting-yoco-online-payments
