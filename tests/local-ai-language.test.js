import test from 'node:test';
import assert from 'node:assert/strict';
import { LOCAL_AI_LANGUAGE_NOTICE, localLanguageUnsupported } from '../src/lib/local-ai-language.js';
import { generateAnswer } from '../scripts/lib/ai-comparison.mjs';
import { answerFromResources } from '../scripts/lib/resource-grounding.mjs';

test('declared non-English and explicitly named unsupported language requests are detected', () => {
  assert.equal(localLanguageUnsupported('Explain photosynthesis.', 'xh'), true);
  assert.equal(localLanguageUnsupported('Explain evaporation in isiXhosa.'), true);
  assert.equal(localLanguageUnsupported('Chaza ngesiXhosa.'), true);
  assert.equal(localLanguageUnsupported('Explain in Afrikaans.'), true);
  assert.equal(localLanguageUnsupported('Explain photosynthesis in simple English.'), false);
});
test('local model receives no request for isiXhosa content', async () => {
  let called = false;
  await assert.rejects(generateAnswer({ provider: 'ollama', model: 'local-test', prompt: 'Explain in isiXhosa.', fetchImpl: async () => { called = true; } }), error => error.message === LOCAL_AI_LANGUAGE_NOTICE);
  assert.equal(called, false);
});
test('source-grounded local language gate runs before retrieval or inference', async () => {
  const result = await answerFromResources({ question: 'Explain evaporation in isiXhosa.', resources: [], generate: async () => { throw new Error('Must not call'); } });
  assert.equal(result.status, 'unsupported-language'); assert.equal(result.modelCalled, false); assert.equal(result.answer, LOCAL_AI_LANGUAGE_NOTICE);
});
test('English request receives a server-owned English-only instruction', async () => {
  let body;
  await generateAnswer({ provider: 'ollama', model: 'local-test', prompt: 'Explain evaporation.', fetchImpl: async (_url, init) => {
    body = JSON.parse(init.body); return new Response(JSON.stringify({ done: true, response: 'Water changes from liquid to gas.' }));
  } });
  assert.ok(body.system.includes('Reply in English only'));
});
test('OpenAI request retains its independent language behaviour', async () => {
  let body;
  await generateAnswer({ provider: 'openai', model: 'configured-model', prompt: 'Explain in isiXhosa.', env: { OPENAI_API_KEY: 'test-key' }, fetchImpl: async (_url, init) => {
    body = JSON.parse(init.body); return new Response(JSON.stringify({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Mock answer' }] }] }));
  } });
  assert.equal(body.instructions.includes('Reply in English only'), false);
});
