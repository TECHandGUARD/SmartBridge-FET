import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('confirmed free introductions expose a SmartBridge Live fallback link on both dashboards',()=>{
 for(const file of ['src/pages/Bookings.jsx','src/components/tutor/BookingRequests.jsx']){
  const src=read(file);
  assert.match(src,/b\.session_link \|\| b\.is_intro/);
  assert.match(src,/window\.location\.origin}\/live-classroom\/\$\{b\.id\}/);
  assert.match(src,/Join Free Introduction/);
 }
});
test('introduction proposal acceptance confirms booking and classroom authorization allows zero-cost sessions',()=>{
 const sql=read('supabase/migrations/20261019035605_booking_checkout_and_introductions.sql');
 const live=read('supabase/migrations/20261019210000_smartbridge_live_signaling.sql');
 assert.match(sql,/action='accept_proposal'/);
 assert.match(sql,/status='confirmed',proposed_date=null/);
 assert.match(live,/b\.amount=0/);
});
