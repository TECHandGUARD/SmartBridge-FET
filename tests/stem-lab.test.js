import test from 'node:test';
import assert from 'node:assert/strict';
import { STEM_ACTIVITIES, filterStemActivities, isPilotSimulationUrl, buildLabWorksheet, LAB_LIMITATION } from '../src/lib/stem-lab.js';
import { isDashboardSectionEnabled, isReleaseFeatureEnabled } from '../src/lib/release-scope.js';

test('lab is reachable from student navigation and release scope', () => {
  assert.equal(isReleaseFeatureEnabled('simulations'), true);
  assert.equal(isDashboardSectionEnabled('student', 'simulations'), true);
});
test('topic and grade filters combine without broadening results', () => {
  assert.equal(filterStemActivities('11', 'circuits').length, 1);
  assert.equal(filterStemActivities('10', 'circuits').length, 0);
  assert.equal(filterStemActivities('all', '  ACID  ')[0].grade, 12);
  assert.deepEqual(filterStemActivities('all', 'nonexistent'), []);
});
test('external launch accepts only exact curated HTTPS links', () => {
  for (const activity of STEM_ACTIVITIES) assert.equal(isPilotSimulationUrl(activity.url), true);
  for (const url of ['javascript:alert(1)', 'http://phet.colorado.edu/en/simulations/ohms-law', 'https://phet.colorado.edu.evil.test/en/simulations/ohms-law', 'https://evil.test@phet.colorado.edu/en/simulations/ohms-law', 'https://phet.colorado.edu:443/en/simulations/ohms-law?redirect=evil', '/simulations/ohms-law']) assert.equal(isPilotSimulationUrl(url), false, url);
});
test('downloaded activity remains useful without a simulation and includes learner notes, provenance and practical limitations', () => {
  for (const activity of STEM_ACTIVITIES) {
    const worksheet = buildLabWorksheet(activity, 'My measured observation', true);
    for (const expected of [activity.title, activity.goal, activity.record, activity.paper, activity.url, 'My measured observation', 'Classroom mode', LAB_LIMITATION, ...activity.steps, ...activity.questions]) assert.ok(worksheet.includes(expected));
    // Answer key stays out of a handout intended for learners.
    for (const answer of activity.answers) assert.equal(worksheet.includes(answer), false);
  }
});
