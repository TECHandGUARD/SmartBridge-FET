import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTutorRate, tutorRate, rateLabel, bookingEstimate } from '../src/lib/tutor-pricing.js';
import { bookingRequest } from '../src/lib/booking-request.js';
test('unset, free, invalid and unrestricted tutor prices remain distinct', () => {
  for (const value of ['', ' ', null, undefined]) assert.equal(parseTutorRate(value), null);
  for (const value of [-1, Infinity, NaN, true, {}, '1.234', 'abc']) assert.ok(Number.isNaN(parseTutorRate(value)));
  for (const value of [0, '0', 20, '1200.50']) assert.equal(parseTutorRate(value), Number(value));
  assert.equal(rateLabel(null), 'Rate not set');
  assert.equal(rateLabel(0), 'Free');
});
test('subject overrides, fallback and introduction estimates agree', () => {
  const tutor = {hourly_rate: 1200.5, subject_rates: {Mathematics: 20, History: 0}, offers_free_intro: true};
  assert.equal(tutorRate(tutor, 'Mathematics'), 20);
  assert.equal(tutorRate(tutor, 'History'), 0);
  assert.equal(tutorRate(tutor, 'Geography'), 1200.5);
  assert.equal(bookingEstimate(tutor, {subject:'Mathematics',duration_hours:1.5}), 30);
  assert.equal(bookingEstimate(tutor, {subject:'Mathematics',duration_hours:0.5,is_intro:true}), 0);
  assert.equal(bookingEstimate({}, {duration_hours:1}), null);
});
test('switching between intro and regular booking creates a new request; retry reuses it', () => {
  const tutor = {id:'tutor'};
  const form = {subject:'Mathematics',date:'2099-01-01',time:'14:00',duration_hours:0.5};
  const first = bookingRequest(null, tutor, form);
  assert.equal(bookingRequest(first, tutor, form).id, first.id);
  assert.notEqual(bookingRequest(first, tutor, {...form,is_intro:true}).id, first.id);
});
