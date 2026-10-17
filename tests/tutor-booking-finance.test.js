import test from 'node:test';
import assert from 'node:assert/strict';
import {tutorBookingSummary} from '../src/lib/tutor-booking-finance.js';
const tutor={user_id:'tutor-1',user_email:'tutor@example.test',hourly_rate:1500};
const booking=(extra={})=>({tutor_id:'tutor-1',tutor_email:tutor.user_email,status:'confirmed',duration_hours:1,amount:20,payment_status:'pending',amount_paid:0,...extra});
test('free introductions and subject-priced sessions use booking snapshots after a tutor changes rates',()=>{
 const summary=tutorBookingSummary(tutor,[booking({amount:0,is_intro:true,duration_hours:0.5}),booking({amount:'30.50',duration_hours:1.5}),booking({status:'pending',amount:10,duration_hours:0.5})]);
 assert.equal(summary.totalEarnings,30.5);assert.equal(summary.pendingAmount,10);
 assert.equal(summary.totalHours,2);assert.equal(summary.receivedAmount,0);
 assert.equal(summary.missingAmounts,0);
});
test('sponsored value is separate from recorded receipts and never implies tutor payout',()=>{
 const summary=tutorBookingSummary(tutor,[booking({amount:100,sponsorship_allocation_id:'allocation',payment_status:'sponsored'}),booking({amount:200,payment_status:'paid',amount_paid:150}),booking({amount:300,payment_status:'refunded',amount_paid:300}),booking({amount:400,payment_status:'paid',amount_paid:400,status:'cancelled'}),booking({amount:500,payment_status:'paid',amount_paid:500,sponsorship_allocation_id:'allocation'})]);
 assert.equal(summary.totalEarnings,1100);assert.equal(summary.receivedAmount,150);assert.equal(summary.sponsoredValue,600);
});
test('missing prices remain flagged, another tutor is excluded, and currency cents sum exactly',()=>{
 const summary=tutorBookingSummary(tutor,[booking({amount:null}),booking({amount:undefined}),booking({amount:-1}),booking({amount:NaN}),booking({amount:0.1}),booking({amount:0.2}),booking({tutor_id:'other',amount:1000}),booking({tutor_id:null,tutor_email:tutor.user_email,amount:1})]);
 assert.equal(summary.totalEarnings,1.3);assert.equal(summary.missingAmounts,4);
 assert.equal(summary.confirmedSessions,7);
});
