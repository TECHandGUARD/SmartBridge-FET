import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('lesson studio offers four selectable visual design themes', () => {
  const design = read('src/components/tutor/LessonDesignSheet.jsx');
  const studio = read('src/components/tutor/TutorLessonStudio.jsx');
  for (const theme of ['ocean', 'sunrise', 'botanical', 'midnight']) {
    assert.match(design, new RegExp(`\\b${theme}: \\{`));
  }
  assert.match(studio, /Object\.entries\(LESSON_THEMES\)/);
  assert.match(studio, /set\('designTheme', key\)/);
  assert.match(studio, /designTheme: LESSON_THEMES\[p\.designTheme\]/);
  assert.match(studio, /<LessonDesignSheet plan=\{plan\} theme=\{plan\.designTheme\}/);
});

test('designed lesson plan can be printed as PDF with colored backgrounds', () => {
  const design = read('src/components/tutor/LessonDesignSheet.jsx');
  const studio = read('src/components/tutor/TutorLessonStudio.jsx');
  assert.match(design, /@media print/);
  assert.match(design, /print-color-adjust: exact/);
  assert.match(design, /size: A4/);
  assert.match(studio, /Print \/ Save PDF/);
  assert.match(studio, /window\.print\(\)/);
  assert.match(studio, /lessonPlanText\(plan\)/);
});
