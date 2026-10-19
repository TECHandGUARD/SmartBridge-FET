import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingReturnPath,meetingSignInDestination,rememberMeetingReturn,pendingMeetingReturn,clearMeetingReturn} from '../src/lib/meeting-navigation.js';
const path='/meetings/00000000-0000-4000-8000-000000000001';
const parent={role:'parent',onboarding_complete:true};
test('meeting sign-in returns only to exact internal meeting paths with existing account gates',()=>{
 assert.equal(meetingSignInDestination(parent,path),path);
 for(const value of ['https://evil.test', '//evil.test','/admin',path+'?next=evil',path+'/../admin',null])assert.equal(meetingReturnPath(value),null);
 assert.equal(meetingSignInDestination({...parent,onboarding_complete:false},path),'/onboarding');
 assert.equal(meetingSignInDestination({role:'student',onboarding_complete:true},path),'/student-dashboard');
});
test('tab-scoped meeting return survives OAuth, expires and clears on the matching meeting',()=>{
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k),removeItem:k=>values.delete(k)};
 rememberMeetingReturn(path,storage);assert.equal(pendingMeetingReturn(storage),path);
 clearMeetingReturn('/meetings/another',storage);assert.equal(pendingMeetingReturn(storage),path);
 clearMeetingReturn(path,storage);assert.equal(pendingMeetingReturn(storage),null);
 values.set('smartbridge-meeting-return',JSON.stringify({path,expires:Date.now()-1}));assert.equal(pendingMeetingReturn(storage),null);
 values.set('smartbridge-meeting-return','malformed');assert.equal(pendingMeetingReturn(storage),null);
});
