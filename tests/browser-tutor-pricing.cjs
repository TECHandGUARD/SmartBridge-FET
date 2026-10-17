// Browser fixtures isolate the UI from live accounts. SQL fixtures exercise actual database rules.
const { chromium }=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});
 let browser;
 try {
  let ready=false;
  for(let attempt=0;attempt<100;attempt++) {try {await fetch('http://127.0.0.1:5173/login');ready=true;break;}catch {await new Promise(resolve=>setTimeout(resolve,100));}}
  if(!ready) throw new Error('Test server did not start');
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  const errors=[];const context=await browser.newContext();const page=await context.newPage();
  page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
  page.on('console',msg=>{if(msg.type()==='error')console.error('BROWSER ERROR',msg.text());});
  let profile={id:'00000000-0000-4000-8000-000000000101',email:'tutor@example.test',full_name:'Test Tutor',role:'tutor',onboarding_complete:true,is_active:true};
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
  if(url.pathname==='/rest/v1/rpc/create_booking') {
    const body=req.postDataJSON();bookingCalls.push(body);assert.equal('amount' in body,false);
    data={id:'booking-'+bookingCalls.length,tutor_name:tutorProfile.full_name,subject:body.chosen_subject,date:body.chosen_date,time:body.chosen_time,duration_hours:body.hours,is_intro:!!body.free_intro,amount:body.free_intro?0:20*body.hours,status:'pending'};bookingRows.push(data);
  }
  if(url.pathname.startsWith('/functions/')) {status=404;data={error:'Not available'};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5173/login');
 await page.getByPlaceholder('Email address').fill(profile.email);
 await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await page.waitForURL('**/tutor-dashboard');
 for(const width of [375,1280]) {
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:5173/tutor-dashboard?section=reviews');
  await page.getByText('Edit My Profile',{exact:true}).waitFor();
  await page.getByLabel('One-on-One Rate (ZAR / Hour)').fill('1200.50');
  await page.getByLabel('Mathematics (R/hour)').fill('20');
  await page.getByRole('checkbox',{name:/Offer a free 30-minute/}).check();
  await page.getByRole('button',{name:'Save Changes',exact:true}).click();
  if(width===375) {
    await page.getByText('Failed to save profile: Profile save temporarily unavailable',{exact:true}).first().waitFor();
    assert.equal(await page.getByLabel('One-on-One Rate (ZAR / Hour)').inputValue(),'1200.50');
    await page.getByRole('button',{name:'Save Changes',exact:true}).click();
  }
  await page.getByText('Profile updated successfully!',{exact:true}).waitFor();
  assert.equal(savedProfiles.at(-1).hourly_rate,1200.5);
  assert.equal(savedProfiles.at(-1).study_year,null,'Blank optional study year saves as null');
  assert.equal(savedProfiles.at(-1).subject_rates.Mathematics,20);
  assert.equal(savedProfiles.at(-1).offers_free_intro,true);
  await page.getByLabel('One-on-One Rate (ZAR / Hour)').fill('30');
  await page.getByRole('button',{name:'Discard Changes',exact:true}).click();
  assert.equal(await page.getByLabel('One-on-One Rate (ZAR / Hour)').inputValue(),'1200.5');
  await page.getByLabel('One-on-One Rate (ZAR / Hour)').fill('');
  await page.getByRole('button',{name:'Preview',exact:true}).click();
  await page.getByText('Rate not set',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Back to Editing',exact:true}).click();
  await page.getByLabel('One-on-One Rate (ZAR / Hour)').fill('0');
  await page.getByRole('button',{name:'Save Changes',exact:true}).click();
  await page.waitForFunction(()=>document.body.innerText.includes('Profile updated successfully!'));
  assert.equal(savedProfiles.at(-1).hourly_rate,0);
  await page.getByLabel('One-on-One Rate (ZAR / Hour)').fill('1200.50');
  await page.getByRole('button',{name:'Save Changes',exact:true}).click();
  await page.getByRole('button',{name:'Save Changes',exact:true}).filter({disabled:false}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Tutor profile fits width '+width);
  await page.screenshot({path:'/tmp/smartbridge-tutor-'+width+'.png',fullPage:true});
 }

 profile={...profile,role:'student'};
 await page.goto('http://127.0.0.1:5173/tutors');
 await page.getByRole('button',{name:'Book',exact:true}).click();
 const modal=page.getByRole('dialog');
 await modal.getByText('R20.00',{exact:true}).waitFor();
 await modal.getByRole('checkbox',{name:/Free 30-minute/}).check();
 await modal.getByText('Free',{exact:true}).waitFor();
 assert.equal(await modal.getByRole('combobox').nth(1).isDisabled(),true);
 await modal.locator('input[type=date]').fill('2099-01-20');
 await modal.getByRole('button',{name:'Request Booking',exact:true}).click();
 await modal.getByText('Booking Sent!',{exact:true}).waitFor();
 assert.equal(bookingCalls.at(-1).free_intro,true);assert.equal(bookingCalls.at(-1).hours,0.5);
 await modal.getByRole('button',{name:'Close',exact:true}).click();
 await page.goto('http://127.0.0.1:5173/bookings');
 await page.getByRole('button',{name:'Schedule New Session'}).click();
 await page.getByRole('combobox').nth(0).click();await page.getByRole('option',{name:/Test Tutor/}).click();
 await page.getByText('R20.00',{exact:true}).waitFor();
 await page.getByRole('checkbox',{name:/Free 30-minute/}).check();
 await page.getByText('Free',{exact:true}).waitFor();
 await page.locator('input[type=date]').fill('2099-01-21');
 await page.getByRole('button',{name:'Request Booking',exact:true}).click();
 await page.getByText('Booking request sent. Your tutor will confirm shortly.',{exact:true}).waitFor();
 assert.equal(bookingCalls.at(-1).free_intro,true);assert.equal(bookingCalls.at(-1).hours,0.5);
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: mobile and desktop tutor editing, failed-save retry, unrestricted and subject rates, intro opt-in, discard, unset preview and zero persistence');
 console.log('PASS: both learner booking entry points show subject cost, offer a 30-minute intro and submit no client price');
 } catch(error) {
  const debugPage=browser?.contexts()[0]?.pages()[0];
  if(debugPage){console.error('PAGE URL:',debugPage.url());console.error('PAGE TEXT:',(await debugPage.locator('body').innerText()).slice(0,5000));await debugPage.screenshot({path:'/tmp/fet-browser-failure.png'});}
  throw error;
 } finally { if(browser) await browser.close(); server.kill(); }
})().catch(e=>{console.error(e);process.exit(1)});
