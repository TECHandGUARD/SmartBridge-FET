import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { readPublicConfig } from '../src/lib/config-values.js';
const connection = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' };

test('missing connection fails clearly; public keys and legacy anon work, privileged keys fail', () => {
  assert.ok(readPublicConfig({}).connectionErrors.length);
  assert.equal(readPublicConfig(connection).errors.length, 0);
  const jwt = role => `header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(readPublicConfig({...connection, VITE_SUPABASE_PUBLISHABLE_KEY:'', VITE_SUPABASE_ANON_KEY:jwt('anon')}).errors.length, 0);
  for (const key of ['sb_secret_example', jwt('service_role'), 'not-a-key']) {
    const result = readPublicConfig({...connection, VITE_SUPABASE_PUBLISHABLE_KEY:key});
    assert.ok(result.connectionErrors.length);
    assert.equal(result.config.supabaseKey, '');
    assert.ok(result.errors.every(error => !error.includes(key)));
  }
  assert.ok(readPublicConfig({...connection, VITE_GEMINI_API_KEY:'private-value'}).errors.length);
});

test('optional checkout fails closed, staging uses its own origin, and prices share validated values', () => {
  const blank = readPublicConfig(connection, 'https://staging.example.test').config;
  assert.equal(blank.appBaseUrl, 'https://staging.example.test');
  assert.equal(blank.checkout.student, '');
  assert.equal(blank.bank, null);
  const configured = readPublicConfig({...connection, VITE_YOCO_STUDENT_URL:'https://pay.yoco.com/r/test', VITE_STUDENT_MONTHLY_PRICE:'30'});
  assert.equal(configured.config.prices.student, 30);
  assert.equal(configured.config.checkout.student, 'https://pay.yoco.com/r/test');
  for (const url of ['javascript:alert(1)', 'https://pay.yoco.com.evil.test/r/test', 'https://user:pass@pay.yoco.com/r/test', 'http://pay.yoco.com/r/test']) {
    const result = readPublicConfig({...connection, VITE_YOCO_STUDENT_URL:url});
    assert.equal(result.config.checkout.student, '');
    assert.ok(result.errors.length);
  }
  assert.ok(readPublicConfig({...connection, VITE_EFT_ACCOUNT_NUMBER:'123'}).errors.length);
  assert.ok(readPublicConfig({...connection, VITE_STUDENT_MONTHLY_PRICE:'-1'}).errors.length);
});

// Execute the actual shared Deno helper with an isolated env provider; no network calls.
const code = ts.transpileModule(fs.readFileSync(new URL('../supabase/shared/config.ts', import.meta.url), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
function serverConfig(env) {
  const context = {exports:{}, Deno:{env:{get:key=>env[key]}}, URL};
  vm.runInNewContext(code, context);
  return context.exports;
}
test('server configuration requires a selected model and trusted app origin, without embedding API keys in URLs', () => {
  assert.throws(()=>serverConfig({}).geminiSettings(), /GEMINI_MODEL is not configured/);
  const settings = serverConfig({GEMINI_MODEL:'account-model', GEMINI_API_KEY:'private-test-key', APP_BASE_URL:'https://staging.example.test'});
  assert.equal(settings.appUrl('/bookings'), 'https://staging.example.test/bookings');
  assert.equal(settings.geminiSettings().url, 'https://generativelanguage.googleapis.com/v1beta/models/account-model:generateContent');
  assert.ok(!settings.geminiSettings().url.includes('private-test-key'));
  assert.throws(()=>serverConfig({APP_BASE_URL:'https://evil.test/path'}).appUrl('/bookings'), /HTTPS origin/);
  assert.throws(()=>serverConfig({GEMINI_MODEL:'model?key=x'}).geminiSettings(), /model ID/);
});

test('Amplify public password routes and length settings are allowed while credentials remain blocked',()=>{
 const publicSettings={...connection,VITE_RESET_PASSWORD_ROUTE:'/reset-password',VITE_FORGOT_PASSWORD_ROUTE:'/forgot-password',VITE_MIN_PASSWORD_LENGTH:'8'};
 assert.deepEqual(readPublicConfig(publicSettings).errors,[]);
 for(const key of ['VITE_PASSWORD','VITE_ADMIN_PASSWORD','VITE_SUPABASE_SERVICE_ROLE_KEY','VITE_PAYSTACK_SECRET_KEY','VITE_RESEND_API_KEY']){
  assert.ok(readPublicConfig({...publicSettings,[key]:'private-value'}).errors.some(error=>error.includes(key)));
 }
});
