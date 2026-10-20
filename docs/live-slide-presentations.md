# Presenting slides during a call

In a booked classroom, the tutor can select **Present PDF slides**. In an adult virtual meeting, invited tutors and administrators can present. Export a PowerPoint or Canva presentation as PDF, then choose the file on your phone or computer. PDF files may contain up to 150 pages and be up to 20 MB.

Previous and Next change the page shown to everyone currently connected. A participant joining or rejoining receives the presenter's current page. Stop presenting removes the slide from the other participants. Leaving closes the slide connection. Camera and microphone stay active while presenting. Multiple authorized presenters appear separately.

Slides are rendered locally and sent as bounded JPEG page messages over the call's encrypted WebRTC data channels. The PDF is not uploaded or saved to Supabase. The page images are temporary in-memory data; other participants can still take screenshots. Slides require the call to connect and share its existing network limitations: there is currently no TURN relay for restrictive networks.

# Joining an invitation

**Join meeting** accepts an outstanding invitation, records admission on the server and requests media. Invitees may first enter from the scheduled start through five minutes after it, inclusive. Already admitted participants remain connected and can reconnect until the room closes. Hosts may prepare the room 20 minutes early. Accept and Decline remain available separately. Declined invitations must be accepted explicitly before joining. The server retains the invitation, verified-account and time-window requirements; a host joining does not occupy an exclusive seat. Adult rooms support up to six invited participants.

Browser coverage includes a host staying connected before invitees accept, one-click joining, four-party bidirectional audio/video, a phone-width presenter with getDisplayMedia absent, PDF page changes, resynchronization on rejoin, stopping slides and classroom presentation. Network/media permission failures can still prevent a particular device from joining; these are not proof of a one-participant limit.
