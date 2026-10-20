const {chromium}=require('playwright');const {spawn}=require('node:child_process');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});let browser,page;
 try{
  for(let n=0;n<100;n++){try{await fetch('http://127.0.0.1:5184/login');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  const user={id:'00000000-0000-4000-8000-000000000901',email:'presentation@example.test',full_name:'Presentation Admin',role:'admin',is_active:true,is_super_admin:true,onboarding_complete:true};const auth={...user,aud:'authenticated',user_metadata:{full_name:user.full_name}},decks=[],errors=[];
  const context=await browser.newContext({viewport:{width:390,height:900}});
  await context.addInitScript(()=>{const paint=CanvasRenderingContext2D.prototype.fillText,clear=CanvasRenderingContext2D.prototype.fillRect;CanvasRenderingContext2D.prototype.fillRect=function(...args){if(args[0]===0&&args[1]===0&&args[2]===1280&&args[3]===720)this.canvas.testTexts=[];return clear.apply(this,args);};CanvasRenderingContext2D.prototype.fillText=function(...args){this.canvas.testTexts??=[];this.canvas.testTexts.push(args[0]);return paint.apply(this,args);};});
  await context.routeWebSocket('**/realtime/**',ws=>ws.close());
  await context.route('https://smartbridge-test.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),args=req.postData()?req.postDataJSON():null;let data=[];
   if(url.pathname==='/auth/v1/user')data=auth;
   if(url.pathname==='/auth/v1/token')data={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:auth};
   if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?user:[user];
   if(url.pathname==='/rest/v1/presentation_decks'){
    if(req.method()==='POST'){assert.equal(args.owner_id,user.id);const deck={...args,revision:1,updated_at:new Date().toISOString()};decks.push(deck);data=deck;}
    else if(req.method()==='PATCH'){const d=decks.find(d=>d.id===url.searchParams.get('id')?.slice(3)&&String(d.revision)===url.searchParams.get('revision')?.slice(3));if(d){Object.assign(d,args,{revision:d.revision+1});data=d;}else data=null;}
    else data=decks.filter(d=>d.owner_id===user.id);
   }
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  page=await context.newPage();page.on('pageerror',e=>{errors.push(e.message);console.error('Page error',e.message);});page.setDefaultTimeout(25000);
  await page.goto('http://127.0.0.1:5184/login');await page.getByPlaceholder('Email address').fill(user.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL('**/admin');await page.getByRole('link',{name:'Presentation Studio →',exact:true}).click();
  await page.getByLabel('Lesson topic',{exact:true}).fill('Grade 11 quadratic equations');await page.getByRole('button',{name:'Use lesson outline template',exact:true}).click();await page.getByLabel('Presentation title',{exact:true}).fill('Quadratic equations');await page.getByLabel('Slide content',{exact:true}).fill('Understand quadratic equations\nSolve and check each answer');await page.getByLabel('Speaker notes (only you see these)',{exact:true}).fill('PRIVATE TEACHER NOTES');await page.getByLabel('Design theme',{exact:true}).selectOption('midnight');await page.getByLabel('Show author: Presentation Admin',{exact:true}).check();
  await page.waitForFunction(()=>{const c=document.querySelector('canvas[aria-label="Branded slide preview"]');return c?.testTexts?.includes('SmartBridge FET')&&c.testTexts.includes('Author: Presentation Admin')&&!c.testTexts.includes('PRIVATE TEACHER NOTES');});
  await page.getByRole('button',{name:'Save presentation',exact:true}).click();await page.getByRole('status').filter({hasText:'Presentation saved to your account.'}).waitFor();assert.equal(decks.length,1);assert.equal(decks[0].content.slides.length,6);
  await page.reload();await page.getByLabel('Your saved presentations',{exact:true}).selectOption(decks[0].id);await page.getByLabel('Slide content',{exact:true}).waitFor();assert.equal(await page.getByLabel('Presentation title',{exact:true}).inputValue?.()||await page.getByLabel('Presentation title',{exact:true}).evaluate(e=>e.value),'Quadratic equations');
  assert.equal(await page.getByLabel('Speaker notes (only you see these)',{exact:true}).evaluate(e=>e.value),'PRIVATE TEACHER NOTES');
  await page.getByRole('button',{name:'Edit slide 2',exact:true}).click();await page.getByLabel('Slide title',{exact:true}).fill('Explain the objective');await page.getByRole('button',{name:'Move slide earlier',exact:true}).click();await page.getByRole('button',{name:'Save presentation',exact:true}).click();await page.getByRole('status').filter({hasText:'Presentation saved to your account.'}).waitFor();assert.equal(decks[0].revision,2);
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download branded PDF',exact:true}).click();const file=await download;const path=await file.path();assert.ok(fs.readFileSync(path).subarray(0,4).toString()==='%PDF');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'/tmp/presentation-studio-mobile.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: mobile admin creates, brands, authors, saves, reloads, reorders and exports a six-slide deck; speaker notes excluded from slide canvas');
 }catch(e){if(page)console.error('Presentation failure',await page.locator('body').innerText());throw e;}finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
