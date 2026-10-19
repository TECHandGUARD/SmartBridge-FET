#!/usr/bin/env node
/**
 * Offline-capable static release preflight. This does not certify native store readiness.
 * Run before every web deployment and before preparing a signed mobile package.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const errors = [];
const check = (ok, message) => { if (!ok) errors.push(message); };
const file = path => readFileSync(join(root, path), 'utf8');

const manifest = JSON.parse(file('public/manifest.json'));
const html = file('index.html');
const routes = file('src/App.jsx');
const accountPage = file('src/pages/AccountDeletion.jsx');
const scope = file('src/lib/release-scope.js');
check(manifest.name === 'SmartBridge FET', 'Unexpected app identity');
check(manifest.id === '/' && manifest.start_url === '/' && manifest.scope === '/', 'PWA identity, scope and start URL must match');
check(manifest.display === 'standalone', 'PWA standalone display is missing');
check(manifest.lang === 'en-ZA', 'PWA language must be en-ZA');
check(Array.isArray(manifest.categories) && manifest.categories.includes('education'), 'PWA education category is missing');
check(html.includes('rel="manifest"') && html.includes('/manifest.json'), 'Missing manifest reference');
check(html.includes('rel="apple-touch-icon"'), 'Missing iOS home screen icon');
check(html.includes('name="viewport"'), 'Missing mobile viewport');
check(html.includes('name="apple-mobile-web-app-capable"'), 'Missing iOS home screen metadata');
for (const size of [192, 512]) {
  const icon = (manifest.icons || []).find(i => i.sizes === `${size}x${size}` && i.type === 'image/png');
  check(!!icon, `Missing ${size}x${size} PNG manifest icon`);
  if (icon) check(icon.src.startsWith('/') && existsSync(join(root, 'public', icon.src.slice(1))), `Missing file for icon ${icon.src}`);
}
check(routes.includes('path="/account-deletion"'), 'Missing public account deletion route');
check(accountPage.includes("request_account_deletion"), 'Missing authenticated account deletion request action');
check(accountPage.includes('mailto:'), 'Missing out-of-app deletion request path');
check(routes.includes('ConnectivityNotice'), 'Missing mobile connectivity warning');
check(scope.includes('accountDeletion: false'), 'Automatic deletion must remain disabled until full erasure workflow is implemented');
const unsafe = ['Rated 4.8/5 by students','POPIA Compliant','SACE Verified Tutors','Unlimited Downloads'];
const marketing = [file('src/pages/Home.jsx'),file('src/components/home/PremiumBanner.jsx')].join('\n');
for (const phrase of unsafe) check(!marketing.includes(phrase), `Unsupported public claim: ${phrase}`);
console.log(errors.length ? `Mobile preflight failed:\n- ${errors.join('\n- ')}` : 'Mobile preflight passed: static install metadata, privacy entry points, offline notice and marketing claims.');
if (errors.length) process.exitCode = 1;
console.log('Not verified by this test: signed Android/iOS builds, physical devices, billing, actual deletion fulfilment, app-store review, and real-user flows.');
