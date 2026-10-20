const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5188','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},stdio:'ignore'});let browser;
try{for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5188');break;}catch{await new Promise(r=>setTimeout(r,100));}}
browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
for(const width of [360,390,768,1440]){const page=await browser.newPage({viewport:{width,height:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
await page.goto('http://127.0.0.1:5188/');await page.getByRole('heading',{name:/Understanding starts/}).waitFor();assert.equal(new URL(page.url()).pathname,'/learn');assert.equal(await page.locator('.learn-card').count(),45);
await page.getByLabel('Subject',{exact:true}).selectOption('math');await page.getByLabel('Grade',{exact:true}).selectOption('12');assert.equal(await page.locator('.learn-card').count(),1);
await page.getByRole('link',{name:'Read guide',exact:true}).click();await page.getByRole('heading',{name:'Differentiate and interpret',exact:true}).waitFor();
await page.getByLabel('Your attempt 1',{exact:true}).fill('6x² − 10x');await page.getByRole('button',{name:'Open answer guide'}).click();assert.match(await page.locator('.learn-answers').innerText(),/6x² − 10x/);
const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:/Download PDF/}).click()]);assert.equal(download.suggestedFilename(),'smartbridge-math-12.pdf');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no overflow at ${width}`);
if(width===390)await page.screenshot({path:'/tmp/smartbridge-guide-phone.png',fullPage:true});
await page.goto('http://127.0.0.1:5188/study-packs/xhhl-12');await page.getByRole('heading',{name:'Yakha umhlathi wohlalutyo loncwadi'}).waitFor();assert.equal(await page.locator('main').getAttribute('lang'),'xh');assert.equal(await page.getByLabel('Your attempt 1',{exact:true}).inputValue(),'');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.goto('http://127.0.0.1:5188/learn');await page.getByRole('heading',{name:/Understanding starts/}).waitFor();if(width===1440)await page.screenshot({path:'/tmp/smartbridge-marketing-desktop.png'});if(width===390)await page.screenshot({path:'/tmp/smartbridge-marketing-phone.png',fullPage:false});
assert.deepEqual(errors,[]);await page.close();}
console.log('PASS: public catalogue, subject/grade filters, practice, answers, actual PDF download, languages and four responsive widths');
}finally{await browser?.close();server.kill('SIGTERM');}})().catch(e=>{console.error(e);process.exitCode=1});
