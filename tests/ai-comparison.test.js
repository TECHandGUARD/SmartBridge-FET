import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { localOrigin, generateAnswer, runComparison, renderReport } from '../scripts/lib/ai-comparison.mjs';

test('local-only boundary rejects remote, credential, path and query endpoints', () => {
  for (const url of ['http://example.com', 'http://127.0.0.1.evil.test', 'http://user:pass@localhost', 'http://localhost/api', 'http://localhost/?token=secret']) assert.throws(() => localOrigin(url));
  assert.equal(localOrigin('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
});

test('Ollama adapter completes a real loopback HTTP exchange and captures timing/usage', async t => {
  let received;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const chunk of req) body += chunk;
    received = { path: req.url, headers: req.headers, body: JSON.parse(body) };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ model: 'test-local', done: true, response: 'x = 6', prompt_eval_count: 30, eval_count: 5 }));
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const r = await generateAnswer({ provider: 'ollama', model: 'test-local', prompt: 'Solve 2x+5=17', env: { OLLAMA_BASE_URL: `http://127.0.0.1:${server.address().port}`, OPENAI_API_KEY: 'must-not-leak' } });
  assert.equal(r.answer, 'x = 6'); assert.equal(r.usage.outputTokens, 5); assert.ok(r.latencyMs >= 0);
  assert.equal(received.path, '/api/generate'); assert.equal(received.body.stream, false);
  assert.equal(received.headers.authorization, undefined); assert.equal(received.body.prompt, 'Solve 2x+5=17');
});

test('missing OpenAI configuration is skipped without issuing a request', async () => {
  let requests = 0;
  const r = await runComparison({ cases: [{ id: 'one', prompt: 'Test' }], providers: ['openai'], env: { OPENAI_MODEL: 'configured-model' }, fetchImpl: async () => { requests++; } });
  assert.equal(requests, 0); assert.equal(r[0].status, 'skipped');
});

test('OpenAI adapter uses fixed Responses endpoint and never includes credentials in results', async () => {
  let request;
  const result = await generateAnswer({ provider: 'openai', model: 'configured-model', prompt: 'Synthetic test', env: { OPENAI_API_KEY: 'test-secret' }, fetchImpl: async (url, init) => {
    request = { url, ...init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ status: 'completed', model: 'reported-model', output: [{ type: 'message', content: [{ type: 'output_text', text: 'Test answer' }] }], usage: { input_tokens: 20, output_tokens: 4 } }));
  } });
  assert.equal(request.url, 'https://api.openai.com/v1/responses'); assert.equal(request.redirect, 'error');
  assert.equal(request.body.store, false); assert.equal(request.body.max_output_tokens, 768);
  assert.equal(request.headers.Authorization, 'Bearer test-secret'); assert.equal(result.answer, 'Test answer');
  assert.equal(JSON.stringify(result).includes('test-secret'), false);
});

test('incomplete or empty model responses cannot be reported as successful', async () => {
  for (const data of [{ status: 'incomplete' }, { status: 'completed', output: [] }]) await assert.rejects(generateAnswer({ provider: 'openai', model: 'configured-model', prompt: 'Test', env: { OPENAI_API_KEY: 'test-secret' }, fetchImpl: async () => new Response(JSON.stringify(data)) }));
});

test('provider error body is not copied into result or logs', async () => {
  const rows = await runComparison({ cases: [{ id: 'one', prompt: 'Test' }], providers: ['openai'], env: { OPENAI_MODEL: 'configured-model', OPENAI_API_KEY: 'test-secret' }, fetchImpl: async () => new Response('test-secret and private text', { status: 401 }) });
  assert.equal(rows[0].status, 'failed'); assert.equal(rows[0].reason, 'Provider returned HTTP 401');
  assert.equal(JSON.stringify(rows).includes('test-secret'), false);
});

test('cloud model tag is rejected before calling the local server', async () => {
  await assert.rejects(generateAnswer({ provider: 'ollama', model: 'example:cloud', prompt: 'Test', fetchImpl: async () => { throw new Error('Should not call'); } }), /Cloud model tags/);
});

test('report treats model output as text, escapes executable markup, and labels missing evidence', () => {
  const html = renderReport({ createdAt: 'test', status: 'not run', hardware: 'test', cases: [{ id: 'one', prompt: '<script>alert(1)</script>', subject: 'Test', reference: 'reference', criteria: 'criteria' }], providers: ['ollama'], results: [{ caseId: 'one', provider: 'ollama', status: 'skipped', reason: 'Not configured' }] });
  assert.equal(html.includes('<script>'), false); assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('No automatic winner')); assert.ok(html.includes('Not configured'));
});
