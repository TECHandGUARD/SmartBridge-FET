import test from 'node:test';
import assert from 'node:assert/strict';
import {requestCallMedia,callMediaError,meetingAccessMessage} from '../src/lib/call-media.js';

test('capture starts synchronously, microphone-only excludes camera, listen never asks for devices',async t=>{
  const captures=[];
  const property=(name,value)=>{const previous=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,value});t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];});};
  property('isSecureContext',true);
  property('RTCPeerConnection',class {});
  property('MediaStream',class {getTracks(){return [];}});
  property('navigator',{mediaDevices:{getUserMedia:options=>{captures.push(options);return Promise.resolve('media');}}});
  const pending=requestCallMedia();assert.equal(captures.length,1);assert.equal(await pending,'media');
  await requestCallMedia('audio');assert.equal(captures[1].video,false);
  const listening=await requestCallMedia('listen');assert.deepEqual(listening.getTracks(),[]);assert.equal(captures.length,2);
});
test('permission/device errors give actionable recovery and meeting states are distinct',()=>{
  assert.match(callMediaError({name:'NotAllowedError'}),/site settings/);
  assert.match(callMediaError({name:'NotReadableError'}),/Close other calls/);
  const start=Date.parse('2026-10-20T09:20:00Z');
  const meeting={status:'scheduled',starts_at:new Date(start).toISOString(),ends_at:new Date(start+1800000).toISOString(),participants:[{user_id:'invitee',response:'accepted'}]};
  assert.match(meetingAccessMessage(meeting,'invitee',start-1),/scheduled start/);
  assert.match(meetingAccessMessage(meeting,'invitee',start+300001),/entry window has closed/);
  assert.match(meetingAccessMessage({...meeting,status:'ended'},'invitee',start),/has ended/);
  assert.match(meetingAccessMessage({...meeting,status:'cancelled'},'invitee',start),/cancelled/);
  assert.equal(meetingAccessMessage({...meeting,can_join:true},'invitee',start+300001),'');
});
