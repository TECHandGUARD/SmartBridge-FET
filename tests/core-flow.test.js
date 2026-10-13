import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeProfile, editableProfile, withTimeout } from '../src/lib/auth-utils.js';

test('editable auth metadata cannot grant an administrator role', () => {
  const user=mergeProfile({ id:'real-id', email:'real@example.test', user_metadata:{role:'admin',is_super_admin:true} },{ id:'wrong-id',email:'wrong@example.test',role:'student',is_super_admin:false });
  assert.equal(user.id,'real-id'); assert.equal(user.email,'real@example.test');
  assert.equal(user.role,'student'); assert.equal(user.is_super_admin,false);
});
test('ordinary profile editing rejects privilege and onboarding changes', () => {
  for (const key of ['role','is_super_admin','is_premium','onboarding_complete','linked_student_email']) {
    assert.throws(() => editableProfile({[key]:true}));
  }
  assert.deepEqual(editableProfile({full_name:'A Learner'}),{full_name:'A Learner'});
});
test('hung requests time out instead of leaving an indefinite loader', async () => {
  await assert.rejects(withTimeout(new Promise(() => {}),10),/timed out/);
  assert.equal(await withTimeout(Promise.resolve('ok'),10),'ok');
});

import { bookingRequest } from '../src/lib/booking-request.js';
test('an uncertain booking retry keeps its ID, but a changed session has a new intent', () => {
  const tutor={id:'tutor-1'},form={subject:'Math',date:'2027-01-02',time:'14:00',duration_hours:1,message:''};
  const first=bookingRequest(null,tutor,form);
  assert.equal(bookingRequest(first,tutor,{...form,duration_hours:'1'}).id,first.id);
  assert.notEqual(bookingRequest(first,tutor,{...form,time:'15:00'}).id,first.id);
});

import { getWeekStartDateString, computeProgressValue } from '../src/lib/weekly-goals.js';
test('weekly goals count individual sessions, distinct subjects and completed subject bookings within the week', () => {
  const goal={week_start:'2026-10-05',goal_type:'study_sessions',subject:'Mathematics'};
  const sessions=[{date:'2026-10-05',subject:'Mathematics'},{date:'2026-10-05',subject:'Mathematics'},{date:'2026-10-11',subject:'History'},{date:'2026-10-12',subject:'Mathematics'}];
  assert.equal(computeProgressValue(goal,[],sessions,[]),2);
  assert.equal(computeProgressValue({...goal,goal_type:'subjects_studied',subject:''},[],sessions,[]),2);
  const bookings=[{date:'2026-10-06',subject:'Mathematics',status:'completed'},{date:'2026-10-06',subject:'History',status:'completed'},{date:'2026-10-07',subject:'Mathematics',status:'confirmed'}];
  assert.equal(computeProgressValue({...goal,goal_type:'tutoring_sessions'},[],[],bookings),1);
  assert.equal(computeProgressValue({...goal,goal_type:'quizzes_completed'},[{completed_at:'2026-10-11T12:00:00',subject:'Mathematics'},{completed_at:'2026-10-12T00:00:00',subject:'Mathematics'}],[],[]),1);
});
test('week start uses the local calendar even near midnight and on Sunday', () => {
  assert.equal(getWeekStartDateString(new Date(2026,9,11,0,10)),'2026-10-05');
  assert.equal(getWeekStartDateString(new Date(2026,9,12,0,10)),'2026-10-12');
});
