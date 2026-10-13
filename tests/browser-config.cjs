const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  try {
    for (const key of ['', 'sb_secret_private-test']) {
      const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'], {env:{...process.env,VITE_SUPABASE_URL:key ? 'https://example.supabase.co' : '',VITE_SUPABASE_PUBLISHABLE_KEY:key,VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});
      const context = await browser.newContext();
      try {
        let ready=false;
        for(let attempt=0;attempt<100;attempt++) {
          try { await fetch('http://127.0.0.1:5174/'); ready=true; break; }
          catch { await new Promise(resolve=>setTimeout(resolve,100)); }
        }
        if(!ready) throw new Error('Configuration test server did not start');
        const page=await context.newPage(); const errors=[]; const backendRequests=[];
        page.on('pageerror',error=>errors.push(error.message));
        await context.route('https://*.supabase.co/**', route=>{backendRequests.push(route.request().url());return route.abort();});
        await page.goto('http://127.0.0.1:5174/login');
        await page.getByRole('heading',{name:'SmartBridge is temporarily unavailable'}).waitFor();
        await page.getByText('The app connection settings are missing or invalid. Please contact support.',{exact:true}).waitFor();
        assert.equal((await page.locator('body').innerText()).includes('sb_secret_private-test'),false);
        assert.deepEqual(errors,[]); assert.deepEqual(backendRequests,[]);
        console.log(`PASS: ${key ? 'privileged' : 'missing'} browser connection settings show a usable error without backend requests`);
      } finally {
        await context.close();
        const stopped = new Promise(resolve=>server.once('exit',resolve));
        server.kill('SIGTERM'); await stopped;
      }
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
