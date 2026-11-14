import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Tutor lesson planner uses UUID ownership and exact booking relationships', () => {
  const planner = read('src/components/tutor/LessonPlanner.jsx');
  const form = read('src/components/tutor/LessonPlanForm.jsx');
  assert.match(planner, /\.eq\('tutor_id', user\.id\)/);
  assert.match(planner, /filter: `tutor_id=eq\.\$\{user\.id\}`/);
  assert.match(planner, /students\.find\(s => s\.id === p\.student_id\)/);
  assert.match(planner, /Boolean\(p\.booking_id\)/);
  assert.doesNotMatch(planner, /\.eq\('tutor_email'/);
  assert.match(form, /student_id: form\.student_id/);
  assert.match(form, /booking_id: form\.booking_id \|\| null/);
  assert.match(form, /\.eq\('student_id', form\.student_id\)/);
  assert.match(form, /value=\{form\.student_id\}/);
});

test('Private tutor reflections are saved outside learner-readable lesson plans', () => {
  const form = read('src/components/tutor/LessonPlanForm.jsx');
  const additive = read('supabase/migrations/20261114195008_tutor_lesson_plans_additive.sql');
  const hardening = read('supabase/migrations/20261114200000_tutor_lesson_plans_rls_hardening.sql');
  const integration = read('tests/local-supabase-services.cjs');
  assert.match(form, /notes: null/);
  assert.match(form, /from\('tutor_lesson_reflections'\)/);
  assert.match(form, /preparation_notes: String\(form\.notes \|\| ''\)\.trim\(\)/);
  assert.match(additive, /booking_id uuid/);
  assert.match(additive, /create table if not exists public\.tutor_lesson_reflections/);
  assert.match(additive, /for all to authenticated/);
  assert.match(additive, /smartbridge_private\.enabled_account\(\)/);
  assert.match(hardening, /student_id = \(select auth\.uid\(\)\)/);
  assert.match(hardening, /notes is null and reflection_notes is null and metadata is null/);
  assert.match(integration, /Learner cannot read tutor-only reflections/);
  assert.match(integration, /Private notes cannot be written to learner-readable lesson plans/);
});
