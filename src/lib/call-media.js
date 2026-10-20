// Start capture directly from the user's button action, before any network await.
export function requestCallMedia(mode = 'video') {
  if (!globalThis.isSecureContext) throw new Error('Camera and microphone require HTTPS. Open the secure app link in your browser.');
  if (!globalThis.RTCPeerConnection) throw new Error('This browser cannot connect calls. Open the meeting in an updated Safari or Chrome browser.');
  if (mode === 'listen') return Promise.resolve(new MediaStream());
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera and microphone are unavailable here. Open the meeting directly in Safari or Chrome, or join to watch and listen.');
  return navigator.mediaDevices.getUserMedia({
    audio: {echoCancellation:true,noiseSuppression:true},
    video: mode === 'audio' ? false : {width:{ideal:640},height:{ideal:360},frameRate:{ideal:15,max:20}},
  });
}

export function callMediaError(error) {
  if (['NotAllowedError','PermissionDeniedError','SecurityError'].includes(error?.name)) return 'Camera or microphone access is blocked by your browser or phone. Allow camera and microphone for this site in your browser’s site settings and your phone’s app permissions, then retry. If this page opened inside another app, open the meeting link directly in Safari or Chrome. You can also join with microphone only, or join to watch and listen without either permission.';
  if (['NotFoundError','DevicesNotFoundError','OverconstrainedError'].includes(error?.name)) return 'A camera or microphone could not be found. Try joining with microphone only, or join to watch and listen.';
  if (['NotReadableError','TrackStartError','AbortError'].includes(error?.name)) return 'Your camera or microphone could not start. Close other calls or apps using them, then retry. You can also join to watch and listen.';
  return error?.message || 'Could not join the call. Please try again.';
}

export function meetingAccessMessage(meeting, userId, now = Date.now()) {
  const person = meeting.participants.find(p => p.user_id === userId);
  if (meeting.status === 'ended') return 'This meeting has ended. Ask the host to create a new meeting.';
  if (meeting.status === 'cancelled') return 'This meeting was cancelled.';
  if (person?.response === 'declined') return 'You declined this invitation. Accept it above if you want to join.';
  if (meeting.can_join) return '';
  if (now > Date.parse(meeting.ends_at) + 30*60000) return 'The meeting room is closed.';
  if (now < Date.parse(meeting.starts_at)) return 'Joining opens at the scheduled start time. The host can prepare the room 20 minutes early.';
  if (!person?.first_joined_at && now > Date.parse(meeting.starts_at) + 300000) return 'The five-minute entry window has closed. People already admitted can reconnect until the room closes.';
  return 'Checking meeting access. Refresh meetings if this does not update.';
}
