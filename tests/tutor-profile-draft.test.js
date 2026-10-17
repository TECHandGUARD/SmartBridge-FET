import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TUTOR_DRAFT_MAX_AGE_MS,
  tutorDraftKey,
  createTutorDraft,
  readTutorDraft,
} from '../src/lib/tutor-profile-draft.js';

const now = Date.parse('2026-10-17T12:00:00.000Z');

test('draft keys use account ID instead of exposing email addresses', () => {
  assert.equal(tutorDraftKey('user-123'), 'tutor_profile_draft_v2_user-123');
  assert.equal(tutorDraftKey(''), null);
});

test('local draft excludes SACE credentials and restores ordinary profile edits', () => {
  const draft = createTutorDraft({
    form: { bio: 'Patient teacher', sace_number: '1234567890', subjects: ['Mathematics'] },
    socialLinks: { linkedin: 'https://example.test/profile' },
    avatarUrl: 'https://example.test/avatar.png',
    videoUrl: '',
  }, now);
  const raw = JSON.stringify(draft);
  assert.equal(raw.includes('1234567890'), false);
  assert.deepEqual(readTutorDraft(raw, now), {
    form: { bio: 'Patient teacher', subjects: ['Mathematics'] },
    socialLinks: { linkedin: 'https://example.test/profile' },
    avatarUrl: 'https://example.test/avatar.png',
    videoUrl: '',
  });
});

test('invalid, outdated and future-dated drafts cannot be restored', () => {
  const draft = createTutorDraft({ form: { bio: 'Test' } }, now);
  assert.equal(readTutorDraft('{bad json', now), null);
  assert.equal(readTutorDraft(JSON.stringify({ ...draft, version: 1 }), now), null);
  assert.equal(readTutorDraft(JSON.stringify(draft), now + TUTOR_DRAFT_MAX_AGE_MS + 1), null);
  assert.equal(readTutorDraft(JSON.stringify(draft), now - 61_000), null);
});

test('maliciously inserted SACE credentials are not restored', () => {
  const draft = createTutorDraft({ form: { bio: 'Test' } }, now);
  draft.form.sace_number = 'do-not-restore';
  assert.deepEqual(readTutorDraft(JSON.stringify(draft), now).form, { bio: 'Test' });
});
