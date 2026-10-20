const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5189','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},stdio:'ignore'});let browser;
try{for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5189');break;}catch{await new Promise(r=>setTimeout(r,100));}}
browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});const context=await browser.newContext({viewport:{width:390,height:844}});
const person={id:'00000000-0000-4000-8000-000000000101',email:'learner@example.invalid',role:'student',is_active:true,onboarding_complete:true,full_name:'Test Learner'};
const user={id:person.id,email:person.email,user_metadata:{},aud:'authenticated',role:'authenticated'};
const session={access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAxMDEiLCJleHAiOjQxMDI0NDQ4MDAsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};
let saved={},revision=0,started=false,fail=false;const deadline=new Date(Date.now()+1800000).toISOString();
const item={id:'draft-assessment',title:'Saved reasoning',subject:'Mathematics',grade:10,kind:'test',instructions:'Show your reasoning.',opens_at:new Date(Date.now()-60000).toISOString(),due_at:deadline,time_limit_minutes:30,max_marks:5,status:'published',questions:[{type:'written',prompt:'Explain your factorisation',marks:5}],score:null};
await context.route('**/*',r=>['127.0.0.1','smartbridge-test.supabase.co'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
await context.route('https://smartbridge-test.supabase.co/**',async route=>{const req=route.request(),url=new URL(req.url()),args=req.postData()?req.postDataJSON():{};let data=[],status=200;
if(url.pathname==='/auth/v1/user')data=user;if(url.pathname==='/auth/v1/token')data=session;if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?person:[person];
const rpc=url.pathname.split('/rpc/')[1];
if(rpc==='my_tutor_assessments')data=[{...item,submission_status:started?'in_progress':null}];
if(rpc==='start_tutor_assessment'){started=true;data='submission-id';}
if(rpc==='assessment_draft')data={answers:saved,revision,started_at:new Date().toISOString(),deadline,server_now:new Date().toISOString()};
if(rpc==='save_assessment_draft'){if(fail){status=503;data={message:'Temporary network failure'};}else{assert.equal(args.p_revision,revision);saved=args.p_answers;data=++revision;}}
await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5189/login');await page.getByPlaceholder('Email address').fill(person.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/student-dashboard');
await page.goto('http://127.0.0.1:5189/assessments');await page.getByRole('button',{name:'Start',exact:true}).click();const answer=page.locator('textarea').first();await answer.fill('Extract the common factor 3x.');await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();assert.equal(saved['0'],'Extract the common factor 3x.');
await page.reload();await page.getByRole('button',{name:'Resume',exact:true}).click();assert.equal(await page.locator('textarea').first().inputValue(),saved['0']);await page.getByText(/Time remaining:/).waitFor();
fail=true;await page.locator('textarea').first().fill('Check by expanding the brackets.');await page.getByText('Not saved — check your connection and retry',{exact:true}).waitFor();assert.notEqual(saved['0'],'Check by expanding the brackets.');fail=false;await page.getByRole('button',{name:'Retry saving'}).click();await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();assert.equal(saved['0'],'Check by expanding the brackets.');
await page.getByRole('button',{name:'Save and back'}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();assert.equal(await page.locator('textarea').first().inputValue(),saved['0']);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
console.log('PASS: learner drafts survive reload, resume, failed save and retry with a visible deadline at phone width');
}finally{await browser?.close();server.kill('SIGTERM');}})().catch(e=>{console.error(e);process.exitCode=1});
