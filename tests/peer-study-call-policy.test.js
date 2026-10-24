import test from 'node:test';
import assert from 'node:assert/strict';
import {peerCallEligibility,peerCallCapabilities} from '../src/lib/peer-study-call-policy.js';

const actor={id:'learner-1',role:'student',approved:true,suspended:false};
const room={id:'math-12',active:true,moderated:true,memberIds:['learner-1','learner-2']};
const peer={id:'learner-2',role:'student',approved:true,suspended:false};
const valid={actor,room,kind:'study_room',participants:[peer],featureEnabled:true};
test('peer calls default to off',()=>assert.equal(peerCallEligibility({...valid,featureEnabled:undefined}).allowed,false));
test('approved room participants can pass UI preflight',()=>assert.equal(peerCallEligibility(valid).allowed,true));
test('forum topic is an allowed context',()=>assert.equal(peerCallEligibility({...valid,kind:'forum_topic'}).allowed,true));
test('unapproved and suspended learners are denied',()=>{
 assert.equal(peerCallEligibility({...valid,actor:{...actor,approved:false}}).allowed,false);
 assert.equal(peerCallEligibility({...valid,actor:{...actor,suspended:true}}).allowed,false);
});
test('unknown room, nonmember and unmoderated room are denied',()=>{
 assert.equal(peerCallEligibility({...valid,room:null}).allowed,false);
 assert.equal(peerCallEligibility({...valid,room:{...room,memberIds:[]}}).allowed,false);
 assert.equal(peerCallEligibility({...valid,room:{...room,moderated:false}}).allowed,false);
});
test('unapproved participants, outsiders and private calls are denied',()=>{
 assert.equal(peerCallEligibility({...valid,participants:[{...peer,approved:false}]}).allowed,false);
 assert.equal(peerCallEligibility({...valid,participants:[{...peer,id:'stranger'}]}).allowed,false);
 assert.equal(peerCallEligibility({...valid,kind:'private'}).allowed,false);
});
test('consent, duplicates and capacity are checked',()=>{
 assert.equal(peerCallEligibility({...valid,actor:{...actor,requiresGuardianConsent:true}}).allowed,false);
 assert.equal(peerCallEligibility({...valid,participants:[peer,peer]}).allowed,false);
 assert.equal(peerCallEligibility({...valid,participants:Array(6).fill(peer)}).allowed,false);
});
test('unsafe capabilities stay disabled',()=>{
 const c=peerCallCapabilities();
 for(const key of ['directLearnerCalls','anonymousInvites','externalGuests','recording','screenSharing'])assert.equal(c[key],false);
 assert.equal(c.serverAdmissionRequired,true);
});
