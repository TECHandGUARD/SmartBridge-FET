import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLegalPdf } from '../src/lib/legal-files.js';
test('legal uploads reject empty, oversized and disguised files', async () => {
  await assert.rejects(validateLegalPdf(new Blob([])), /PDF/);
  await assert.rejects(validateLegalPdf(new Blob(['not a PDF'])), /PDF/);
  await assert.rejects(validateLegalPdf({size:10*1024*1024+1}), /10 MB/);
});
test('legal upload digest binds the exact PDF bytes', async () => {
  const first = await validateLegalPdf(new Blob(['%PDF-1.7\nfirst']));
  const repeat = await validateLegalPdf(new Blob(['%PDF-1.7\nfirst']));
  const changed = await validateLegalPdf(new Blob(['%PDF-1.7\nsecond']));
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(first, repeat);
  assert.notEqual(first, changed);
});
