// Browser fixtures isolate the UI from live accounts. SQL fixtures exercise actual database rules.
const { chromium }=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5176','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});
 let browser;
 try {
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {try {await fetch('http://127.0.0.1:5176/login');ready=true;break;}catch {await new Promise(resolve=>setTimeout(resolve,100));}}
  if(!ready) throw new Error('Test server did not start');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  const errors=[];const context=await browser.newContext();const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  let profile={id:'00000000-0000-4000-8000-000000000101',email:'tutor@example.test',full_name:'Test Tutor',role:'student',onboarding_complete:true,is_active:true};
 const authUser={id:profile.id,email:profile.email,user_metadata:{full_name:profile.full_name},aud:'authenticated',role:'authenticated'};
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAxMDEiLCJleHAiOjQxMDI0NDQ4MDAsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:authUser};

 let tutorProfile={id:'tutor-1',user_id:profile.id,user_email:profile.email,full_name:profile.full_name,session_price_per_hour:100,hourly_rate:100,subjects:['Mathematics'],grades:['Grade 12'],is_verified:true,is_active:true,subject_rates:{},offers_free_intro:false,metadata:{}};
 const savedProfiles=[],bookingCalls=[];let failProfileSave=true;let bookingRows=[];
 await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host==='127.0.0.1'||host==='smartbridge-test.supabase.co'?route.continue():route.abort();});
 await context.route('https://smartbridge-test.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[],status=200;
  if(url.pathname==='/auth/v1/user') data=authUser;
  if(url.pathname==='/auth/v1/token') data=session;
  if(url.pathname==='/rest/v1/users') data=req.headers().accept?.includes('vnd.pgrst.object')?profile:[profile];
  if(url.pathname==='/rest/v1/tutor_profiles') {
    data=tutorProfile;
    if(req.method()==='PATCH') {
      savedProfiles.push(req.postDataJSON());
      assert.equal(url.searchParams.get('user_id'),'eq.'+profile.id);
      if(failProfileSave) {failProfileSave=false;status=503;data={message:'Profile save temporarily unavailable'};}
      else {tutorProfile={...tutorProfile,...req.postDataJSON()};data=tutorProfile;}
    }
  }
  if(url.pathname==='/rest/v1/tutor_directory') data=[tutorProfile];
  if(url.pathname==='/rest/v1/tutor_bookings') data=bookingRows;
  if(url.pathname==='/rest/v1/sponsorship_allocations')data=[{id:'allocation-1',label:'Rural pilot',budget:500}];
  if(url.pathname==='/rest/v1/sponsorship_reservations')data=[];
  if(url.pathname==='/rest/v1/rpc/create_sponsored_booking') {
    const body=req.postDataJSON();bookingCalls.push(body);assert.equal('amount' in body,false);
    data={id:'booking-'+bookingCalls.length,tutor_name:tutorProfile.full_name,subject:body.chosen_subject,date:body.chosen_date,time:body.chosen_time,duration_hours:body.hours,is_intro:!!body.free_intro,amount:body.free_intro?0:20*body.hours,status:'pending',sponsorship_allocation_id:body.allocation,payment_status:'sponsored'};bookingRows.push(data);
  }
  if(url.pathname.startsWith('/functions/')) {status=404;data={error:'Not available'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5176/login');
 await page.getByPlaceholder('Email address').fill(profile.email);
 await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await page.waitForURL('**/student-dashboard');
 for(const width of [375,1280]){
  await page.setViewportSize({width,height:1000});
  await page.goto('http://127.0.0.1:5176/tutors');
  await page.getByRole('button',{name:'Book',exact:true}).click();
  const modal=page.getByRole('dialog');
  await modal.getByLabel('Session funding').selectOption('allocation-1');
  await modal.locator('input[type=date]').fill('2099-02-20');
  await modal.getByRole('button',{name:'Request Booking',exact:true}).click();
  await modal.getByText('Booking Sent!',{exact:true}).waitFor();
  assert.equal(bookingCalls.at(-1).allocation,'allocation-1');
  assert.equal('amount' in bookingCalls.at(-1),false);
  await modal.getByRole('button',{name:'Close',exact:true}).click();
  await page.goto('http://127.0.0.1:5176/bookings');
  await page.getByRole('button',{name:'Schedule New Session'}).click();
  await page.getByRole('combobox').nth(0).click();await page.getByRole('option',{name:/Test Tutor/}).click();
  await page.getByLabel('Session funding').selectOption('allocation-1');
  await page.locator('input[type=date]').fill('2099-02-21');
  await page.getByRole('button',{name:'Request Booking',exact:true}).click();
  await page.getByText('Booking request sent. Your tutor will confirm shortly.',{exact:true}).waitFor();
  assert.equal(bookingCalls.at(-1).allocation,'allocation-1');
  await page.getByText('Sponsored · no learner payment',{exact:true}).first().waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Page fits '+width);
 }
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: sponsored funding visible and selectable on both learner entry points at mobile and desktop widths; server receives allocation and no client amount');
 } catch(error){throw error;} finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
