import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { opportunityStatus, southAfricanDate } from '../src/lib/opportunity-dates.js';
const read = file => JSON.parse(readFileSync(new URL(`../db/seeds/practice-20261021/${file}`, import.meta.url)));

test('every supported subject, grade and requested term has original answerable practice', () => {
  const quizzes = read('quizzes.json');
  assert.equal(quizzes.length, 135);
  assert.equal(new Set(quizzes.map(q => q.id)).size, 135);
  const subjects = new Set(quizzes.map(q => q.subject));
  assert.equal(subjects.size, 15);
  for (const subject of subjects) for (const grade of [10, 11, 12]) for (const term of [2, 3, 4]) {
    const matching = quizzes.filter(q => q.subject === subject && q.grade === `Grade ${grade}` && q.metadata.term === term);
    assert.equal(matching.length, 1, `${subject}, ${grade}, term ${term}`);
    const quiz = matching[0];
    assert.match(quiz.metadata.atp_url, /^https:\/\/www.education.gov.za\//);
    assert.equal(quiz.questions.length, 4);
    assert.equal(quiz.is_published, true);
    for (const question of quiz.questions) {
      assert.equal(new Set(question.options).size, 4);
      assert.ok(Number.isInteger(question.correct_index) && question.correct_index >= 0 && question.correct_index < 4);
      assert.ok(question.explanation.length > 35);
      if (subject.endsWith('HL')) assert.ok(question.stimulus?.length > 60);
    }
  }
});

test('funding closes at the end of its South African calendar date', () => {
  assert.equal(southAfricanDate(new Date('2026-10-30T21:59:00Z')), '2026-10-30');
  assert.equal(southAfricanDate(new Date('2026-10-30T22:00:00Z')), '2026-10-31');
  const bursary = { deadline: '2026-10-30', metadata: { opens_on: '2026-10-01' } };
  assert.equal(opportunityStatus(bursary, '2026-09-30'), 'Opening soon');
  assert.equal(opportunityStatus(bursary, '2026-10-30'), 'Open');
  assert.equal(opportunityStatus(bursary, '2026-10-31'), 'Closed');
  assert.equal(opportunityStatus({ metadata: {} }, '2026-10-21'), 'Dates unconfirmed');
});

test('published funding has traceable dates and separates returning applicants', () => {
  const bursaries = read('bursaries.json');
  assert.equal(bursaries.length, 8);
  assert.equal(bursaries.filter(b => opportunityStatus(b, '2026-10-21') === 'Open').length, 4);
  assert.equal(bursaries.filter(b => opportunityStatus(b, '2026-10-21') === 'Closed').length, 4);
  const funza = bursaries.find(b => b.name.startsWith('Funza'));
  assert.equal(funza.deadline, '2027-01-31');
  assert.equal(funza.metadata.returning_deadline, '2026-11-30');
  assert.ok(bursaries.every(b => b.is_active && b.metadata.source_url.startsWith('https://') && b.metadata.verified_on === '2026-10-21'));
});

test('NBT calendar preserves the January year rollover and independent deadlines', () => {
  const dates = read('nbt-dates.json');
  assert.equal(dates.length, 23);
  const jan = dates.find(d => d.test_date === '2027-01-09');
  assert.equal(jan.registration_deadline, '2026-12-06');
  assert.equal(jan.metadata.payment_deadline, '2026-12-14');
  assert.equal(jan.metadata.institution_results_date, '2027-02-01');
  assert.equal(jan.results_release_date, '2027-02-08');
  assert.equal(dates.filter(d => d.is_remote).length, 3);
  assert.ok(dates.every(d => !d.available_slots && !d.test_time && d.tests_available.join(',') === 'AQL,MAT'));
});
