const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5194','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5194');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}:{})});
 for(const kind of ['admin','staff','outsider'])for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});const errors=[];
  const person={id:'00000000-0000-4000-8000-000000000101',email:'staff-test@example.invalid',full_name:'Staff Test',role:kind==='admin'?'admin':'user',is_active:true,is_super_admin:false,onboarding_complete:true};
  const user={id:person.id,email:person.email,user_metadata:{},aud:'authenticated',role:'authenticated'};const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};
  let access=kind==='staff'?{enabled:true,permissions:['resources'],version:1}:null,saves=[],accounts=[];
  await context.route('**/*',r=>['127.0.0.1','smartbridge-test.supabase.co'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  await context.route('https://smartbridge-test.supabase.co/**',async route=>{const req=route.request(),url=new URL(req.url()),args=req.postData()?req.postDataJSON():{};let data=[],status=200;
   if(url.pathname==='/auth/v1/user')data=user;if(url.pathname==='/auth/v1/token')data=session;
   if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?person:[person];
   if(url.pathname.endsWith('/rpc/get_staff_access'))data=access;
   if(url.pathname.endsWith('/rpc/staff_account_roster'))data={accounts,audit:[]};
   if(url.pathname.endsWith('/rpc/set_staff_account')){saves.push(args);accounts=[{user_id:'worker',email:args.p_email,full_name:'Worker',permissions:args.p_permissions,enabled:args.p_enabled,version:saves.length,is_active:true}];data=true;}
   if(url.pathname.endsWith('/rpc/staff_resource_queue'))data=[{id:'resource',title:'Review sample resource',subject:'Mathematics',grade:'Grade 10',type:'Notes',is_approved:false,is_rejected:false}];
   if(url.pathname.endsWith('/rpc/staff_review_resource'))data=true;
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5194/login');await page.getByPlaceholder('Email address').fill(person.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/'+(kind==='admin'?'admin':kind==='staff'?'staff':'student-dashboard'));
  if(kind==='admin'){
   if(width<768)await page.getByLabel('Admin tools',{exact:true}).selectOption('staff-accounts');else await page.getByRole('tab',{name:'Staff Accounts',exact:true}).click();await page.getByLabel('Registered staff email').fill('worker@example.invalid');await page.getByLabel('Resource reviews',{exact:false}).check();await page.getByRole('button',{name:'Save staff access',exact:true}).click();await page.getByText('Worker',{exact:true}).waitFor();assert.deepEqual(saves[0].p_permissions,['resources']);
   await page.getByRole('button',{name:'Edit permissions / suspend'}).click();await page.getByLabel('Staff access enabled').uncheck();await page.getByRole('button',{name:'Save staff access',exact:true}).click();await page.getByText(/Suspended or account inactive/).waitFor();assert.equal(saves[1].p_enabled,false);assert.equal(saves[1].p_expected_version,1);
  }else{
   if(kind==='staff'){
    await page.getByRole('heading',{name:'Resource reviews',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Announcements',exact:true}).count(),0);await page.getByRole('button',{name:'Approve',exact:true}).click();
    access={...access,enabled:false,version:2};await page.getByRole('button',{name:'Refresh access',exact:true}).click();await page.getByRole('alert').filter({hasText:'Staff access is not enabled'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Resource reviews',exact:true}).count(),0);
   }else{
    await page.goto('http://127.0.0.1:5194/staff');await page.getByRole('alert').filter({hasText:'Staff access is not enabled'}).waitFor();
   }
   await page.goto('http://127.0.0.1:5194/admin');await page.waitForURL('http://127.0.0.1:5194/');assert.equal(await page.getByRole('tab',{name:'Staff Accounts',exact:true}).count(),0);
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');assert.deepEqual(errors,[]);await page.screenshot({path:`/tmp/staff-${kind}-${width}.png`,fullPage:true});await context.close();console.log('PASS:',kind,width,'staff workflow, scoped UI and access recovery');
 }
}finally{await browser?.close();server.kill('SIGTERM');}})().catch(e=>{console.error(e);process.exitCode=1;});
