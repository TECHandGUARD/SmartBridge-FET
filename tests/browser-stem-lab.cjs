// Real application route with fixture auth: no hosted database or paid simulation downloads.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async () => {
  const base = 'http://127.0.0.1:5175';
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { env: { ...process.env, VITE_SUPABASE_URL: 'https://smartbridge-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', VITE_SUPABASE_ANON_KEY: '' }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) { try { await fetch(base + '/login'); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
    if (!ready) throw new Error('Lab test server did not start');
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const profile = { id: '00000000-0000-4000-8000-000000000101', email: 'teacher@example.test', full_name: 'Classroom Teacher', role: 'student', onboarding_complete: true, is_active: true };
    const authUser = { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name }, aud: 'authenticated', role: 'authenticated' };
    const session = { access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAxMDEiLCJleHAiOjQxMDI0NDQ4MDAsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.test', refresh_token: 'test-refresh', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: authUser };
    let externalRequests = 0;
    await context.route('**/*', route => {
      const host = new URL(route.request().url()).hostname;
      if (host === '127.0.0.1' || host === 'smartbridge-test.supabase.co') return route.continue();
      if (host === 'phet.colorado.edu') externalRequests++;
      return route.abort();
    });
    await context.route('https://smartbridge-test.supabase.co/**', async route => {
      const req = route.request(); const url = new URL(req.url()); let data = [];
      if (url.pathname === '/auth/v1/user') data = authUser;
      if (url.pathname === '/auth/v1/token') data = session;
      if (url.pathname === '/rest/v1/users') data = req.headers().accept?.includes('vnd.pgrst.object') ? profile : [profile];
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto(base + '/stem-lab');
    await page.waitForURL('**/login');
    await page.getByPlaceholder('Email address').fill(profile.email);
    await page.getByPlaceholder('Password', { exact: true }).fill('TestPassword123');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.goto(base + '/stem-lab');
    await page.getByRole('heading', { name: 'Virtual STEM Lab', exact: true }).waitFor({ timeout: 15000 }).catch(error => { console.error('STEM route:', page.url()); throw error; });
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByRole('checkbox', { name: 'Classroom mode (teacher-led)' }).check();
      await page.getByText('One screen, a whole class', { exact: true }).waitFor();
      for (const grade of ['10', '11', '12']) {
        await page.getByLabel('Grade', { exact: true }).selectOption(grade);
        await page.getByRole('status').filter({ hasText: '1 activity available' }).waitFor();
        const link = page.getByRole('link', { name: 'Open PhET simulation' });
        assert.match(await link.getAttribute('href'), /^https:\/\/phet\.colorado\.edu\/en\/simulations\//);
        assert.equal(await link.getAttribute('target'), '_blank');
      }
      const notes = 'Compare strength at equal concentration.';
      await page.getByLabel('My notes (this visit only)').fill(notes);
      const downloadEvent = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download text worksheet with my notes' }).click();
      const download = await downloadEvent;
      const stream = await download.createReadStream(); const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString('utf8');
      assert.ok(text.includes(notes)); assert.ok(text.includes('Classroom mode'));
      assert.ok(text.includes('do not replace prescribed physical practical work'));
      await page.getByText('Show explanation after trying', { exact: true }).click();
      await page.getByText('No. Concentration describes', { exact: false }).waitFor();
      await page.getByLabel('Search topic').fill('not-a-topic');
      await page.getByText('No activities match these filters.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
      await page.getByRole('button', { name: 'Grade 10: Explore transverse waves', exact: true }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at ' + width);
      await page.screenshot({ path: '/tmp/smartbridge-stem-' + width + '.png', fullPage: true });
    }
    // Read-only classroom mode does not invoke tutor verification or alter roles.
    assert.equal(profile.role, 'student');
    assert.equal(externalRequests, 0, 'No external simulation loaded before explicit launch');
    assert.deepEqual(errors, []);
    await page.goto(base + '/student-dashboard?section=simulations');
    await page.getByRole('heading', { name: 'Virtual STEM Lab', exact: true }).waitFor();
    console.log('STEM lab: auth redirect, non-tutor classroom mode, three grades, filters, worksheet download, notes, explanations, dashboard access and mobile/desktop verified.');
  } finally { if (browser) await browser.close(); server.kill('SIGTERM'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
