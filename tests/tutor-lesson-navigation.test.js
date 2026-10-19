import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Tutor Lesson Studio is registered as a navigable dashboard section', () => {
  const sections = read('src/lib/useDashboardSection.js');
  const nav = read('src/components/tutor/TutorQuickActions.jsx');
  const dashboard = read('src/pages/TutorDashboard.jsx');
  assert.match(sections, /tutor:\s*\[['"]lesson-studio['"]/);
  assert.match(nav, /key:\s*['"]lesson-studio['"]/);
  assert.match(nav, /onClick=\{\(\) => onAction\(a\.key\)\}/);
  assert.match(dashboard, /activeSection === ['"]lesson-studio['"]/);
  assert.match(dashboard, /<TutorLessonStudio\s*\/>/);
});

test('Tutor Lesson Studio is available independently of a premium subscription', () => {
  const dashboard = read('src/pages/TutorDashboard.jsx');
  const studio = read('src/components/tutor/TutorLessonStudio.jsx');
  assert.match(dashboard, /activeSection === ['"]lesson-studio['"] && <div/);
  assert.match(studio, /Tutor Lesson Studio/);
  assert.match(studio, /saveDraft/);
  assert.match(studio, /exportText/);
});
