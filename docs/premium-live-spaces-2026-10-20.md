# Premium classrooms and meetings

The classroom, meeting room and meeting directory share an emerald, ivory and muted gold visual system. Existing brand fonts are reused, with scoped CSS and no additional production dependencies.

- Clear camera, microphone, permission-free listening and audio-and-slides joining options.
- Camera-off initials, readable participant labels, private-room status and a local time-in-call clock.
- Sticky labeled controls above mobile app navigation, with pressed states and disabled-device states.
- Compact videos preserve the mounted media elements, streams and audio while giving presentations more room.
- Settings and host guest invitations use keyboard-accessible native disclosure controls.
- Meeting details, attendee responses, agenda and SAST times remain available without crowding the call.
- Presentation studio styling retains live native slide edits, PDF corrections and private speaker notes.

The call/signaling, booking admission, email delivery and reminder contracts are unchanged. Hosts still invite registered active adult accounts, with the existing six-person limit and fresh guest admission window. Smartphone screen broadcasting remains subject to browser support; PDF/native presentations work without it.

Validation: lint, TypeScript, 121 unit tests and production build passed locally. Isolated browser fixtures check 320, 390, 768 and 1280px layouts, permission recovery, settings, compact video layout and mobile control position. The existing complete meeting/classroom suites also check actual bidirectional media, live slide edits, reactions, late guest entry and cleanup; main additionally exercises forced TLS TURN media. Screenshots contain synthetic fixture accounts only and are retained as a short-lived CI artifact.

Physical carrier/device certification is separate from these browser and relay tests.
