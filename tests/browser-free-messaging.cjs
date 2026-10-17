// Separate browser sessions share a simulated API; real RLS/RPC contracts run in SQL and service CI.
const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
(async()=>{
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5177','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});
 let browser;
 try{
  for(let n=0;n<100;n++){try{await fetch('http://127.0.0.1:5177/login');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  const people=['student','tutor','parent'].map((role,i)=>({id:`00000000-0000-4000-8000-00000000010${i+1}`,role,email:role+'@example.test',full_name:'Test '+role,onboarding_complete:true,is_active:true}));
  const messages=[],attempts=[],errors=[],comments=[],commentAttempts=[];let loseAcknowledgement=true,loseCommentAcknowledgement=true;
  const forumPost={id:randomUUID(),title:'Free community question',body:'Ordinary forum discussion body',category:'General',author_id:people[0].id,author_name:people[0].full_name,author_email:people[0].email,comment_count:0,is_removed:false,created_at:new Date().toISOString(),liked_by:[]};
  async function open(user,width){
   const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   const authUser={...user,user_metadata:{full_name:user.full_name},aud:'authenticated',role:'authenticated'};
   const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:authUser};
   await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host==='127.0.0.1'||host==='smartbridge-test.supabase.co'?route.continue():route.abort();});
   await context.route('https://smartbridge-test.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url());let data=[],status=200;
    const args=req.postData()?req.postDataJSON():{};
    if(url.pathname==='/auth/v1/user')data=authUser;
    if(url.pathname==='/auth/v1/token')data=session;
    if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?user:[user];
    if(url.pathname==='/rest/v1/tutor_profiles')data={id:'profile',user_id:user.id,is_verified:true,is_active:true,subjects:['Mathematics'],grades:['Grade 12'],metadata:{}};
    if(url.pathname==='/rest/v1/forum_posts'){assert.equal(req.method(),'GET','Reply count must be updated by the server');data=[forumPost];}
    if(url.pathname==='/rest/v1/forum_comments')data=comments;
    if(url.pathname==='/rest/v1/rpc/submit_forum_comment'){
     commentAttempts.push(args);data=comments.find(c=>c.client_request_id===args.client_request_id);
     if(!data){data={id:randomUUID(),post_id:forumPost.id,body:args.comment_text,author_id:user.id,author_email:user.email,author_name:user.full_name,client_request_id:args.client_request_id,created_at:new Date().toISOString(),liked_by:[]};comments.push(data);forumPost.comment_count=comments.length;}
     if(loseCommentAcknowledgement){loseCommentAcknowledgement=false;status=503;data={message:'Reply connection failure'};}
    }
    if(url.pathname==='/rest/v1/rpc/messaging_contacts')data=people.filter(p=>p.id!==user.id).map(p=>({user_id:p.id,full_name:p.full_name,role:p.role,can_send:true,unread_count:messages.filter(m=>m.sender_id===p.id&&m.recipient_id===user.id&&!m.read_at).length}));
    if(url.pathname==='/rest/v1/rpc/read_direct_thread')data=messages.filter(m=>(m.sender_id===user.id&&m.recipient_id===args.other_user)||(m.recipient_id===user.id&&m.sender_id===args.other_user)).slice().reverse();
    if(url.pathname==='/rest/v1/rpc/mark_direct_read'){messages.filter(m=>m.sender_id===args.other_user&&m.recipient_id===user.id).forEach(m=>m.read_at=new Date().toISOString());data=1;}
    if(url.pathname==='/rest/v1/rpc/send_direct_message'){
     attempts.push(args);data=messages.find(m=>m.sender_id===user.id&&m.request_id===args.client_request_id);
     if(!data){data={id:randomUUID(),sender_id:user.id,recipient_id:args.to_user,body:args.message_text,request_id:args.client_request_id,created_at:new Date().toISOString(),read_at:null};messages.push(data);}
     if(loseAcknowledgement){loseAcknowledgement=false;status=503;data={message:'Temporary connection failure. Retry safely.'};}
    }
    if(url.pathname.startsWith('/functions/'))throw new Error('Free messaging must not call AI or paid Edge functions: '+url.pathname);
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   });
   await page.goto('http://127.0.0.1:5177/login');await page.getByPlaceholder('Email address').fill(user.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();
   await page.waitForURL('**/'+user.role+'-dashboard');
   await page.goto('http://127.0.0.1:5177/'+user.role+'-dashboard?section=messages');
   await page.getByText('Free person-to-person text messaging. No AI or premium plan is needed.',{exact:true}).waitFor();
   return page;
  }
  const learner=await open(people[0],375),tutor=await open(people[1],1280),parent=await open(people[2],375);
  await learner.getByLabel('Conversation',{exact:true}).selectOption(people[1].id);
  await learner.getByLabel('Your message',{exact:true}).fill('Learner needs algebra help');await learner.getByRole('button',{name:'Send message',exact:true}).click();
  await learner.getByText('Temporary connection failure. Retry safely.',{exact:true}).waitFor();assert.equal(await learner.getByLabel('Your message',{exact:true}).inputValue(),'Learner needs algebra help');
  await learner.getByRole('button',{name:'Send message',exact:true}).click();
  await learner.waitForFunction(()=>document.querySelector('textarea')?.value==='');assert.equal(attempts[0].client_request_id,attempts[1].client_request_id);assert.equal(messages.length,1);
  await tutor.getByLabel('Conversation',{exact:true}).selectOption(people[0].id);await tutor.getByText('Learner needs algebra help',{exact:true}).waitFor();
  await tutor.getByLabel('Your message',{exact:true}).fill('Tutor can help with algebra');await tutor.getByRole('button',{name:'Send message',exact:true}).click();
  await learner.bringToFront();await learner.getByText('Tutor can help with algebra',{exact:true}).waitFor({timeout:12000});
  await learner.reload();await learner.getByLabel('Conversation',{exact:true}).selectOption(people[1].id);await learner.getByText('Learner needs algebra help',{exact:true}).waitFor();await learner.getByText(/ · Read$/).waitFor();
  for(const recipient of [people[1],people[0]]){
   await parent.getByLabel('Conversation',{exact:true}).selectOption(recipient.id);const text='Parent message to '+recipient.role;
   await parent.getByLabel('Your message',{exact:true}).fill(text);await parent.getByRole('button',{name:'Send message',exact:true}).click();await parent.getByText(text,{exact:true}).waitFor();
   const recipientPage=recipient.role==='student'?learner:tutor;await recipientPage.getByLabel('Conversation',{exact:true}).selectOption(people[2].id);await recipientPage.getByText(text,{exact:true}).waitFor();
  }
  for(const page of [learner,tutor,parent])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Inbox fits mobile and desktop');
  await parent.goto('http://127.0.0.1:5177/forum');await parent.getByText('Ordinary forum discussion body',{exact:true}).waitFor();await parent.getByText(forumPost.title,{exact:true}).click();
  await parent.getByPlaceholder('Share your knowledge...').fill('Free parent forum answer');await parent.getByRole('button',{name:'Post Comment',exact:true}).click();
  await parent.getByText('Failed to post comment',{exact:true}).first().waitFor();assert.equal(await parent.getByPlaceholder('Share your knowledge...').inputValue(),'Free parent forum answer');
  await parent.getByRole('button',{name:'Post Comment',exact:true}).click();await parent.getByText('Free parent forum answer',{exact:true}).waitFor();assert.equal(commentAttempts[0].client_request_id,commentAttempts[1].client_request_id);assert.equal(comments.length,1);
  assert.deepEqual(errors,[]);
  console.log('PASS: free cross-role inboxes, lost acknowledgement retry without duplicates, kept drafts, replies, reload persistence, read receipts, mobile/desktop and no AI calls');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
