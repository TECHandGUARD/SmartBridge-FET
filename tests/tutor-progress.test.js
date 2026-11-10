import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTutorProgressSummary, getProgressCutoff, toCsv } from '../src/lib/tutor-progress-utils.js';

test('builds learner list only from supplied booking relationships and joins learning data by student id', () => {
  const result = buildTutorProgressSummary({
    bookings: [
      { student_id: 's1', student_name: 'Learner One', student_email: 'one@example.test', subject: 'Mathematics', status: 'completed' },
      { student_id: 's2', student_name: 'Learner Two', student_email: 'two@example.test', subject: 'Life Sciences', status: 'confirmed' },
    ],
    progress: [
      { student_id: 's1', subject: 'Mathematics', grade: 'Grade 12', current_score: 72, progress_percentage: 80, at_risk: false },
    ],
    sessions: [
      { student_id: 's1', subject: 'Mathematics', is_completed: true, date: '2026-11-01' },
      { student_id: 's2', subject: 'Life Sciences', is_completed: false, date: '2026-11-02' },
    ],
  });
  assert.equal(result.totalLearners, 2);
  assert.equal(result.totalSessions, 1);
  assert.equal(result.learners.find((learner) => learner.id === 's1').averageScore, 72);
  assert.equal(result.learners.find((learner) => learner.id === 's2').grade, 'Not recorded');
  assert.equal(result.learners.find((learner) => learner.id === 's2').hasProgress, false);
});

test('flags a learner for support only when the canonical risk flag is true', () => {
  const result = buildTutorProgressSummary({
    bookings: [{ student_id: 's1', student_name: 'Learner' }],
    progress: [{ student_id: 's1', subject: 'Mathematics', overall_score: 34, at_risk: true }],
  });
  assert.equal(result.atRiskLearners, 1);
  assert.equal(result.learners[0].atRisk, true);
});

test('grade filter uses grade stored on progress record', () => {
  const result = buildTutorProgressSummary({
    bookings: [{ student_id: 's1', student_name: 'Learner' }],
    progress: [{ student_id: 's1', subject: 'Mathematics', grade: 'Grade 11' }],
    gradeFilter: 'Grade 11',
  });
  assert.equal(result.learners.length, 1);
  assert.equal(result.learners[0].grade, 'Grade 11');
});

test('calculates a deterministic 30-day cutoff', () => {
  assert.equal(getProgressCutoff('month', new Date('2026-11-10T12:00:00Z')), '2026-10-11');
  assert.equal(getProgressCutoff('all', new Date('2026-11-10T12:00:00Z')), null);
});

test('CSV export quotes commas and embedded quotation marks', () => {
  const csv = toCsv([{ name: 'Learner, "One"', grade: 'Grade 12', subjects: ['Maths'], sessions: 2, averageScore: 80, averageProgress: 70, atRisk: false, lastActivity: '2026-11-10' }]);
  assert.match(csv, /"Learner, ""One"""/);
});
