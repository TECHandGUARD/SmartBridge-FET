/**
 * Learner peer-call policy. This is a UI preflight only: never use this as
 * authorization for room admission, signaling, TURN credentials or media.
 * Those checks must be enforced by the database/server for every request.
 */
export const PEER_CALL_KINDS = Object.freeze(['study_room', 'forum_topic']);

export function peerCallEligibility({actor,room,kind,participants=[],featureEnabled=false,guardianConsent=false} = {}) {
  if (!featureEnabled) return {allowed:false,reason:'Peer study calls are not enabled yet.'};
  if (!actor?.id || !actor?.approved || actor?.suspended || actor?.role !== 'student')
    return {allowed:false,reason:'Only approved learner accounts can join peer study calls.'};
  if (!PEER_CALL_KINDS.includes(kind))
    return {allowed:false,reason:'Peer calls are limited to approved study rooms and forum topics.'};
  if (!room?.id || !room?.active || !room?.moderated)
    return {allowed:false,reason:'This study discussion is not available for calls.'};
  if (!Array.isArray(room?.memberIds) || !room.memberIds.includes(actor.id))
    return {allowed:false,reason:'Join the approved study discussion before requesting a call.'};
  if (!guardianConsent && actor?.requiresGuardianConsent)
    return {allowed:false,reason:'Guardian consent is required before joining calls.'};
  if (!Array.isArray(participants) || participants.length > 5)
    return {allowed:false,reason:'Study calls are limited to six participants.'};
  if (participants.some(p => !p?.id || !p.approved || p.suspended || p.role !== 'student' || !room.memberIds.includes(p.id) || (p.requiresGuardianConsent && !p.guardianConsent)))
    return {allowed:false,reason:'All participants must be approved members of this discussion.'};
  if (participants.some(p => p.id === actor.id) || new Set(participants.map(p => p.id)).size !== participants.length)
    return {allowed:false,reason:'Duplicate participants are not allowed.'};
  return {allowed:true,reason:null};
}

export function peerCallCapabilities() {
  return Object.freeze({
    directLearnerCalls:false,
    anonymousInvites:false,
    externalGuests:false,
    recording:false,
    screenSharing:false,
    moderatorRequired:true,
    reportingRequired:true,
    serverAdmissionRequired:true,
  });
}
