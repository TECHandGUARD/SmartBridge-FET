const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { readFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const quizzes = JSON.parse(readFileSync('db/seeds/practice-20261021/quizzes.json'));
const bursaries = JSON.parse(readFileSync('db/seeds/practice-20261021/bursaries.json'));
const dates = JSON.parse(readFileSync('db/seeds/practice-20261021/nbt-dates.json'));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5192';
const project = process.env.TEST_SUPABASE_PROJECT || 'smartbridge-test';

(async () => {
  const server = process.env.TEST_BASE_URL ? null : spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { env: { ...process.env, VITE_SUPABASE_URL: 'https://smartbridge-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, stdio: 'ignore' });
  let browser;
  try {
    if (server) for (let i = 0; i < 100; i++) {
      try { await fetch(base); break; } catch { await new Promise(r => setTimeout(r, 100)); }
    }
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await context.newPage();
      const errors = [], writes = [], queries = [];
      page.on('pageerror', e => errors.push(e.message));
      const profile = { id: '00000000-0000-4000-8000-000000000101', email: 'learner@example.test', full_name: 'Test Learner', role: 'student', onboarding_complete: true, is_active: true, trial_started_at: new Date().toISOString() };
      const authUser = { id: profile.id, email: profile.email, user_metadata: { full_name: profile.full_name }, role: 'authenticated', aud: 'authenticated' };
      const session = { access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAxMDEiLCJleHAiOjQxMDI0NDQ4MDAsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.test', refresh_token: 'fixture-only', expires_at: 4102444800, expires_in: 3600, token_type: 'bearer', user: authUser };
      await context.addInitScript(({ session, key }) => localStorage.setItem(key, JSON.stringify(session)), { session, key: `sb-${project}-auth-token` });
      let savedDates = [];
      await context.route('**/*', route => {
        const host = new URL(route.request().url()).hostname;
        return host === new URL(base).hostname || host.endsWith('.supabase.co') ? route.continue() : route.abort();
      });
      await context.route('https://*.supabase.co/**', async route => {
        const request = route.request(), url = new URL(request.url());
        let data = [];
        if (url.pathname === '/auth/v1/user') data = authUser;
        if (url.pathname === '/auth/v1/token') data = session;
        if (url.pathname === '/rest/v1/users') data = request.headers().accept?.includes('vnd.pgrst.object') ? profile : [profile];
        if (url.pathname === '/rest/v1/quizzes') {
          queries.push(url);
          assert.equal(url.searchParams.get('is_published'), 'eq.true');
          assert.equal(url.searchParams.get('quiz_type'), 'eq.practice');
          const term = JSON.parse(url.searchParams.get('metadata').replace('cs.', '')).term;
          data = quizzes.filter(q => `eq.${q.subject}` === url.searchParams.get('subject') && `eq.${q.grade}` === url.searchParams.get('grade') && q.metadata.term === term);
        }
        if (url.pathname === '/rest/v1/quiz_results' && request.method() === 'POST') { const body = request.postDataJSON(); writes.push(body); data = { ...body, id: 'fixture-result' }; }
        if (url.pathname === '/rest/v1/bursaries') data = bursaries;
        if (url.pathname === '/rest/v1/nbt_test_dates') data = dates;
        if (url.pathname === '/rest/v1/nbt_registrations') {
          if (request.method() === 'POST') { const body = request.postDataJSON(); assert.equal(body.metadata.tracking_only, true); assert.equal(body.metadata.official_booking_confirmed, false); savedDates = [{ ...body, id: 'fixture-nbt-plan' }]; writes.push(body); }
          data = savedDates;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
      });
      await page.goto(`${base}/quiz`);
      await page.getByRole('heading', { name: 'Practice Quiz', exact: true }).waitFor();
      await page.getByLabel('Subject *', { exact: true }).click();
      assert.equal(await page.getByRole('option').count(), 15);
      await page.getByRole('option', { name: 'isiZulu HL', exact: true }).click();
      await page.getByLabel('Grade *', { exact: true }).click();
      await page.getByRole('option', { name: 'Grade 12', exact: true }).click();
      await page.getByLabel('Term *', { exact: true }).click();
      await page.getByRole('option', { name: 'Term 3', exact: true }).click();
      await page.getByRole('button', { name: 'Start Quiz', exact: true }).click();
      const quiz = quizzes.find(q => q.subject === 'isiZulu HL' && q.grade === 'Grade 12' && q.metadata.term === 3);
      await page.getByText(quiz.questions[0].question, { exact: true }).waitFor();
      assert.equal(await page.locator('[lang="zu"]').count(), 1);
      assert.ok(await page.locator('blockquote').innerText());
      for (const question of quiz.questions) {
        await page.getByRole('button', { name: question.options[question.correct_index], exact: true }).click();
        await page.getByText(question.explanation, { exact: true }).waitFor();
        await page.getByRole('button', { name: /Next Question|See Results/ }).click();
      }
      await page.getByText('4 out of 4 correct', { exact: true }).waitFor();
      assert.equal(writes[0].metadata.term, 3);
      assert.equal(writes[0].student_id, profile.id);
      assert.equal(writes[0].quiz_id, quiz.id);
      await page.getByRole('link', { name: 'View the official grade ATP' }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

      await page.goto(`${base}/bursaries`);
      await page.getByRole('heading', { name: 'Find funding for your future.' }).waitFor();
      await page.getByRole('status').filter({ hasText: '8 funding opportunities' }).waitFor();
      await page.getByLabel('Application status').selectOption('Open');
      await page.getByRole('status').filter({ hasText: '4 funding opportunities' }).waitFor();
      await page.getByLabel('Search bursaries').fill('Funza');
      await page.getByText(/Returning bursars:/).waitFor();
      await page.getByLabel('Search bursaries').fill('');
      await page.getByLabel('Application status').selectOption('Closed');
      assert.equal(await page.getByRole('link', { name: /Apply on the official site/ }).count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `/tmp/practice-bursaries-${width}.png`, fullPage: true });

      await page.goto(`${base}/opportunities`);
      await page.getByRole('tab', { name: 'NBT Schedule' }).click();
      await page.getByRole('button', { name: /Details for .*Jan 2027/ }).waitFor();
      await page.getByText(/6 Dec 2026/).waitFor();
      await page.getByText('14 Dec 2026', { exact: true }).waitFor();
      await page.getByText(/^0?1 Feb 2027$/).waitFor();
      await page.getByText(/^0?8 Feb 2027$/).waitFor();
      await page.getByRole('button', { name: /Details for .*Jan 2027/ }).click();
      await page.getByRole('button', { name: 'Save to my planner', exact: true }).click();
      await page.getByText('In your planner', { exact: true }).waitFor();
      await page.getByRole('button', { name: /Details for .*Jan 2027/ }).click();
      await page.getByText(/Saving here does not book a test/).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Register Now', exact: true }).count(), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      assert.equal(queries.length, 1);
      console.log(`PASS ${width}px: exact term and language, explanations, owned result, source link, open/closed funding, official NBT deadlines and honest planner save`);
      await context.close();
    }
  } finally { await browser?.close(); server?.kill('SIGTERM'); }
})().catch(error => { console.error(error); process.exitCode = 1; });
