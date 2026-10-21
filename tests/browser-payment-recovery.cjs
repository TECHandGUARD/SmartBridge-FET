const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');
(async()=>{const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5191','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5191');break;}catch{await new Promise(r=>setTimeout(r,100));}}
 browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const role of ['student','admin']){
  const context=await browser.newContext({viewport:{width:390,height:900}});const errors=[];const person={id:'00000000-0000-4000-8000-000000000101',email:'payment-test@example.invalid',full_name:'Payment Test',role,is_active:true,is_super_admin:role==='admin',onboarding_complete:true};const user={id:person.id,email:person.email,user_metadata:{},aud:'authenticated',role:'authenticated'};const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user};let hangList=role==='student',hangSave=role==='admin',saved=0,checkoutRequests=[];
  const gateways=[{provider:'yoco',name:'Yoco',enabled:true,ready:true,test_ready:true,live_ready:true,mode:'live',priority:0,webhook:'yoco-webhook'}];
  await context.route('**/*',r=>['127.0.0.1','smartbridge-test.supabase.co'].includes(new URL(r.request().url()).hostname)?r.continue():r.abort());
  await context.route('https://smartbridge-test.supabase.co/**',async route=>{const req=route.request(),url=new URL(req.url()),args=req.postData()?req.postDataJSON():{};let data=[],status=200;
   if(url.pathname==='/auth/v1/user')data=user;if(url.pathname==='/auth/v1/token')data=session;if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?person:[person];
   if(url.pathname==='/rest/v1/subscription_prices')data=[{product:'student',amount_cents:2900},{product:'parent',amount_cents:5900},{product:'tutor_pro',amount_cents:35000}];
   if(url.pathname==='/functions/v1/payment-gateways'){if(hangList)return;data={checkout_active:true,gateways};if(args.action==='save'){if(hangSave)return;saved++;}}
   if(url.pathname==='/functions/v1/create-checkout'){checkoutRequests.push(args);status=503;data={error:'Provider temporarily unavailable'};}
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5191/login');await page.getByPlaceholder('Email address').fill(person.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/'+(role==='admin'?'admin':'student-dashboard'));
  await page.clock.install();
  if(role==='student'){
   await page.goto('http://127.0.0.1:5191/Premium');await page.getByText('Loading payment options…',{exact:true}).waitFor();assert.equal(await page.getByText('Online payment is currently unavailable. Please contact support.',{exact:true}).count(),0);
   await page.clock.fastForward(21000);await page.getByRole('alert').filter({hasText:'Could not check online payment availability'}).waitFor();assert.equal(await page.getByText('Loading payment options…',{exact:true}).count(),0);
   hangList=false;await page.getByRole('button',{name:'Refresh payment options',exact:true}).click();await page.getByRole('button',{name:'Pay R29 securely',exact:true}).waitFor();
   await page.getByRole('button',{name:'Pay R29 securely',exact:true}).click();await page.getByText('Provider temporarily unavailable',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Pay R29 securely',exact:true}).isEnabled(),true);
   await page.getByRole('button',{name:'Pay R29 securely',exact:true}).click();await page.getByText('Provider temporarily unavailable',{exact:true}).first().waitFor();assert.equal(checkoutRequests.length,2);assert.equal(checkoutRequests[0].request_id,checkoutRequests[1].request_id);assert.equal(checkoutRequests[0].gateway,'yoco');assert.equal(await page.getByText("You're Premium! 🎉",{exact:true}).count(),0);
   console.log('PASS: phone checkout timeout recovers, server Yoco catalogue displays, provider failure preserves retry ID and does not activate premium');
  }else{
   await page.goto('http://127.0.0.1:5191/admin');await page.getByRole('tab',{name:'Payment Gateways',exact:true}).click();await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByRole('button',{name:'Saving…',exact:true}).waitFor();await page.clock.fastForward(21000);await page.getByRole('alert').filter({hasText:'Refresh settings to confirm'}).waitFor();assert.equal(await page.getByRole('button',{name:'Save settings',exact:true}).isEnabled(),true);
   hangSave=false;await page.getByRole('button',{name:'Refresh settings',exact:true}).click();await page.getByRole('button',{name:'Save settings',exact:true}).click();await page.getByText('Yoco settings saved',{exact:true}).waitFor();assert.equal(saved,1);console.log('PASS: stuck gateway save ends in a visible recoverable error; administrator refreshes and saves successfully');
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser?.close();server.kill('SIGTERM');}})().catch(e=>{console.error(e);process.exitCode=1;});
