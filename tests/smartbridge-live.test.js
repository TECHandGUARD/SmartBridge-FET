import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8');

test('live classroom is restricted to booked tutor and learner, not open guests', () => {
  const sql=read('supabase/migrations/20261019210000_smartbridge_live_signaling.sql');
  assert.match(sql,/auth\.uid\(\) in \(b\.tutor_id,b\.student_id\)/);
  assert.match(sql,/b\.status='confirmed'/);
  assert.match(sql,/payment_status in \('paid','test_paid','sponsored'\)/);
  assert.match(sql,/sender_id=auth\.uid\(\)/);
  assert.match(sql,/recipient_id=auth\.uid\(\)/);
  assert.match(sql,/classroom_signal_payload_size/);
  assert.match(sql,/alter table public\.classroom_signals enable row level security/);
});

test('classroom offers video, audio, screen sharing and clean exit', () => {
  const classroom=read('src/pages/LiveClassroom.jsx');
  for (const token of ['RTCPeerConnection','getUserMedia','getDisplayMedia','onicecandidate','setRemoteDescription','addIceCandidate','getTracks().forEach(track => track.stop())','can_join_live_classroom']) {
    assert.ok(classroom.includes(token),token);
  }
  assert.match(classroom,/TURN relay is required/);
});

test('tutors choose among SmartBridge, Zoom and Teams for each booking', () => {
  const booking=read('src/components/tutor/BookingRequests.jsx');
  const routes=read('src/App.jsx');
  for (const platform of ['smartbridge','zoom','teams']) assert.match(booking,new RegExp('value="'+platform+'"'));
  assert.match(booking,/session_link: sessionLink/);
  assert.match(routes,/live-classroom\/:bookingId/);
});
