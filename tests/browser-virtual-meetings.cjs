// Real four-context WebRTC mesh, isolated API fixtures and simulated camera/mic devices.
const {chromium}=require('playwright');const {spawn}=require('node:child_process');const {randomUUID}=require('node:crypto');const assert=require('node:assert/strict');
(async()=>{
 const signals=[],errors=[];
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5183','--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''},stdio:'ignore'});let browser;
 try{
  for(let n=0;n<100;n++){try{await fetch('http://127.0.0.1:5183/login');break;}catch{await new Promise(r=>setTimeout(r,100));}}
  browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
  const people=['admin','tutor','parent','tutor','parent'].map((role,i)=>({id:`00000000-0000-4000-8000-00000000020${i+1}`,email:`meeting${i}@example.test`,role,full_name:`Meeting Person ${i}`,is_super_admin:role==='admin',is_active:true,onboarding_complete:true}));
  const meetings=[];let failRead=false;const emailDispatches=[];
  const details=(m,person)=>({...m,can_join:m.status==='scheduled'&&m.participants.some(p=>p.user_id===person.id&&p.response==='accepted'&&(m.host_id===person.id||p.first_joined_at||Date.now()>=Date.parse(m.starts_at)&&Date.now()<=Date.parse(m.starts_at)+300000))});
  async function open(person,invitationPath=null){
   const context=await browser.newContext({permissions:['camera','microphone'],viewport:{width:person.role==='parent'?390:1280,height:1000}});
   await context.addInitScript(({screenSharing})=>{
    window.testChannels=[];window.testPeers=[];window.testTracks=[];const Original=window.RTCPeerConnection;window.RTCPeerConnection=class extends Original{constructor(...args){super(...args);window.testPeers.push(this);this.addEventListener('datachannel',e=>window.testChannels.push(e.channel));}createDataChannel(...args){const c=super.createDataChannel(...args);window.testChannels.push(c);return c;}};
    const media=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{const s=await media(options);window.testTracks.push(...s.getTracks());return s;};
    navigator.mediaDevices.getDisplayMedia=async()=>{if(window.testCancelScreenShare){window.testCancelScreenShare=false;throw new DOMException('Cancelled','NotAllowedError');}const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;canvas.getContext('2d').fillRect(0,0,320,240);const s=canvas.captureStream(10);window.testTracks.push(...s.getTracks());return s;};
    if(!screenSharing)navigator.mediaDevices.getDisplayMedia=undefined;
   },{screenSharing:person.role!=='parent'});
   const auth={...person,user_metadata:{full_name:person.full_name},aud:'authenticated',role:'authenticated'};const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:person.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:auth};
   await context.routeWebSocket('**/realtime/**',ws=>ws.close());
   await context.route('https://smartbridge-test.supabase.co/**',async route=>{
    const req=route.request(),url=new URL(req.url());const args=req.postData()?req.postDataJSON():{};let data=[],status=200;
    if(url.pathname==='/auth/v1/user')data=auth;
    if(url.pathname==='/auth/v1/token')data=session;
    if(url.pathname==='/rest/v1/users')data=req.headers().accept?.includes('vnd.pgrst.object')?person:[person];
    if(url.pathname==='/rest/v1/tutor_profiles'){const p={user_id:person.id,is_verified:true,is_active:true};data=url.searchParams.has('user_id')?(req.headers().accept?.includes('vnd.pgrst.object')?p:[p]):[];}
    const rpc=url.pathname.split('/rpc/')[1];
    if(rpc==='list_virtual_meetings')data=meetings.filter(m=>m.participants.some(p=>p.user_id===person.id)).map(m=>details(m,person));
    if(rpc==='create_virtual_meeting'){
     assert.ok(['admin','tutor'].includes(person.role));assert.ok(args.client_request_id);let m=meetings.find(m=>m.request_id===args.client_request_id);
     if(!m){m={id:randomUUID(),host_id:person.id,title:args.meeting_title,purpose:args.meeting_purpose,agenda:args.meeting_agenda,starts_at:args.scheduled_start,ends_at:new Date(new Date(args.scheduled_start).getTime()+args.duration_minutes*60000).toISOString(),status:'scheduled',request_id:args.client_request_id,participants:[{user_id:person.id,full_name:person.full_name,role:person.role,response:'accepted'},...args.invite_emails.map(email=>{const p=people.find(p=>p.email===email);assert.ok(p);return{user_id:p.id,full_name:p.full_name,role:p.role,response:'invited'};})]};meetings.push(m);}data=m.id;
    }
    if(rpc==='meeting_notification_ids'){assert.ok(args.meeting_key);data=[args.meeting_key];}
    if(url.pathname==='/functions/v1/dispatch-notifications'){assert.equal(args.event_ids.length,1);emailDispatches.push(args.event_ids[0]);data={accepted:1,failed:0};}
    if(rpc==='virtual_meeting_details') {const m=meetings.find(m=>m.id===args.meeting_key);if(!m?.participants.some(p=>p.user_id===person.id)){status=403;data={message:'This meeting is available to invited participants only'};}else data=details(m,person);}
    if(rpc==='join_virtual_meeting'){const m=meetings.find(m=>m.id===args.meeting_key);const p=m?.participants.find(p=>p.user_id===person.id);if(!p||m.status!=='scheduled'||p.response==='declined'||m.host_id!==person.id&&!p.first_joined_at&&(Date.now()<Date.parse(m.starts_at)||Date.now()>Date.parse(m.starts_at)+300000)){status=403;data={message:'Meeting admission closed'};}else{p.response='accepted';p.first_joined_at||=new Date().toISOString();data=details(m,person);}}
    if(rpc==='respond_virtual_meeting'){const m=meetings.find(m=>m.id===args.meeting_key);m.participants.find(p=>p.user_id===person.id).response=args.decision;data=true;}
    if(rpc==='close_virtual_meeting'){const m=meetings.find(m=>m.id===args.meeting_key);assert.equal(m.host_id,person.id);m.status=args.decision;data=true;}
    if(url.pathname==='/rest/v1/virtual_meeting_signals'){
     if(req.method()==='POST'){assert.equal(args.sender_id,person.id);signals.push({...args,id:randomUUID(),created_at:new Date().toISOString()});}
     else if(failRead){failRead=false;status=503;data={message:'Temporary signal interruption'};}
     else{const since=url.searchParams.get('created_at')?.slice(4)||'';data=signals.filter(s=>s.meeting_id===url.searchParams.get('meeting_id')?.slice(3)&&s.recipient_id===person.id&&s.created_at>=since).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));}
    }
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   });
   const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5183'+(invitationPath||'/login'));await page.getByPlaceholder('Email address').fill(person.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();await page.waitForURL(invitationPath?'**'+invitationPath:'**/'+(person.role==='admin'?'admin':person.role+'-dashboard'));
   if(invitationPath)return page;
   try{await page.getByRole('link',{name:'Virtual Meetings →',exact:true}).click();}catch(e){console.error('Dashboard fixture failed for '+person.role,await page.locator('body').innerText(),errors);throw e;}await page.waitForURL('**/meetings');return page;
  }
  const pages=[];for(const person of people)pages.push(await open(person));const [admin,tutor,parent,peer,outsider]=pages;
  assert.equal(await parent.getByRole('button',{name:'Send meeting invitations',exact:true}).count(),0);
  await admin.getByLabel('Meeting title',{exact:true}).fill('Parent and tutor support conference');await admin.getByLabel(/Invite account emails/).fill([people[1].email,people[2].email,people[3].email].join(', '));
  await admin.getByLabel('Start (South Africa time)',{exact:true}).fill(new Date(Date.now()+2*3600000+60000).toISOString().slice(0,16));await admin.getByLabel('Agenda (optional)',{exact:true}).fill('Support and reflection goals');await admin.getByRole('button',{name:'Send meeting invitations',exact:true}).click();await admin.getByRole('heading',{name:'Parent and tutor support conference',exact:true}).waitFor();
  const m=meetings[0];const emailParent=await open(people[2],'/meetings/'+m.id);await emailParent.getByRole('button',{name:'Accept invitation',exact:true}).waitFor();await emailParent.context().close();console.log('PASS: signed-out invitation link returns the parent to the exact private meeting after sign-in');assert.equal(m.participants.length,4);assert.deepEqual(emailDispatches,[m.id]);await admin.getByRole('status').filter({hasText:'Invitation emails accepted for sending'}).waitFor();
  await outsider.goto('http://127.0.0.1:5183/meetings/'+m.id);await outsider.getByRole('alert').filter({hasText:'invited participants only'}).waitFor();assert.equal(await outsider.getByRole('button',{name:'Join meeting',exact:true}).count(),0);
  await admin.getByRole('link',{name:'Open meeting',exact:true}).click();await admin.getByRole('button',{name:'Join meeting',exact:true}).click();await admin.getByRole('status').filter({hasText:'Waiting for invitees to accept'}).waitFor();
  m.starts_at=new Date(Date.now()-60000).toISOString();
  for(const page of [tutor,parent,peer]){await page.goto('http://127.0.0.1:5183/meetings/'+m.id);assert.equal(await page.getByRole('button',{name:'Join meeting',exact:true}).isDisabled(),false);}
  for(const page of [tutor,parent,peer]){if(page===tutor)failRead=true;await page.getByRole('button',{name:'Join meeting',exact:true}).click();await page.getByRole('button',{name:'Leave meeting',exact:true}).waitFor();}
  async function waitForAsync(page,predicate){const deadline=Date.now()+45000;while(Date.now()<deadline){if(await page.evaluate(predicate))return;await new Promise(r=>setTimeout(r,250));}throw new Error('Timed out waiting for real media');}
  async function connected(){for(const page of [admin,tutor,parent,peer])await waitForAsync(page,async()=>{const pcs=window.testPeers.filter(p=>p.connectionState==='connected');if(pcs.length!==3)return false;for(const pc of pcs){const stats=await pc.getStats();if(![...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='audio'&&s.bytesReceived>0)||![...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='video'&&s.bytesReceived>0))return false;}return true;});}
  assert.equal(await parent.getByRole('button',{name:'Share screen',exact:true}).count(),0);await parent.getByText('Screen sharing is unavailable in this browser. Audio, video and viewing shared screens are still available.').waitFor();assert.equal(await parent.getByRole('alert').count(),0);
  await tutor.evaluate(()=>{window.testCancelScreenShare=true;});await tutor.getByRole('button',{name:'Share screen',exact:true}).click();assert.equal(await tutor.getByRole('alert').count(),0);
  await connected();assert.equal(m.participants.every(p=>p.response==='accepted'),true);console.log('PASS: host stays in call while invitees accept and join with one click');console.log('PASS: administrator + two tutors + parent exchange real audio/video in all twelve directions, with WebSockets disabled and a failed REST read');
  const {jsPDF}=require('jspdf');const pdf=new jsPDF();pdf.text('Slide one',20,20);pdf.addPage();pdf.text('Slide two',20,20);
  // Phone-width tutor presents a real two-page PDF without getDisplayMedia.
  await tutor.setViewportSize({width:390,height:900});await tutor.evaluate(()=>{window.savedScreenCapture=navigator.mediaDevices.getDisplayMedia;navigator.mediaDevices.getDisplayMedia=undefined;});
  await tutor.getByLabel('Present PDF slides',{exact:true}).setInputFiles({name:'Lesson.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))});
  for(const p of [admin,parent,peer])await p.getByRole('img',{name:'Shared slide 1 of 2',exact:true}).waitFor();
  await tutor.getByRole('button',{name:'Next slide',exact:true}).click();
  for(const p of [admin,parent,peer])await p.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor();
  await tutor.screenshot({path:'/tmp/smartbridge-phone-slides.png',fullPage:true});await tutor.evaluate(()=>{navigator.mediaDevices.getDisplayMedia=window.savedScreenCapture;});
  await connected();console.log('PASS: phone-width tutor presents PDF pages to all participants without interrupting audio/video');
  await parent.getByRole('button',{name:'Mute',exact:true}).click();assert.equal(await parent.evaluate(()=>window.testTracks.find(t=>t.kind==='audio').enabled),false);await parent.getByRole('button',{name:'Camera off',exact:true}).click();
  await tutor.getByRole('button',{name:'Share screen',exact:true}).click();await tutor.getByRole('button',{name:'Stop sharing',exact:true}).click();await tutor.getByRole('button',{name:'Share screen',exact:true}).waitFor();assert.ok(await tutor.evaluate(()=>window.testPeers.filter(p=>p.connectionState==='connected').every(p=>p.getSenders().find(s=>s.track?.kind==='video').track===window.testTracks.find(t=>t.kind==='video'))));
  await parent.getByRole('button',{name:'Leave meeting',exact:true}).click();assert.ok(await parent.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')));await parent.getByRole('button',{name:'Join meeting',exact:true}).click();await connected();console.log('PASS: group media controls, screen restoration and parent rejoin while other three remain');
  await parent.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor();console.log('PASS: rejoining participant receives the current slide');
  await tutor.getByRole('button',{name:'Stop presenting',exact:true}).click();for(const p of [admin,parent,peer])await p.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor({state:'detached'});
  await peer.getByRole('link',{name:'Virtual meetings',exact:true}).first().click();await peer.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));await peer.goto('http://127.0.0.1:5183/meetings/'+m.id);await peer.getByRole('button',{name:'Join meeting',exact:true}).click();await connected();
  await admin.getByRole('button',{name:'End for everyone',exact:true}).click();for(const page of [admin,tutor,parent,peer]){await page.getByRole('button',{name:'Join meeting',exact:true}).waitFor();await page.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));assert.ok(await page.getByRole('button',{name:'Join meeting',exact:true}).isDisabled());}
  console.log('PASS: host ending stops all participants, including navigation/rejoin; outsiders denied and parents cannot create');
  await tutor.goto('http://127.0.0.1:5183/meetings');await tutor.getByLabel('Meeting title',{exact:true}).fill('Peer reflection conference');await tutor.getByLabel('Meeting purpose',{exact:true}).selectOption('tutor_reflection');await tutor.getByLabel(/Invite account emails/).fill(people[3].email);await tutor.getByRole('button',{name:'Send meeting invitations',exact:true}).click();await tutor.getByRole('heading',{name:'Peer reflection conference',exact:true}).waitFor();assert.equal(meetings[1].host_id,people[1].id);assert.equal(meetings[1].purpose,'tutor_reflection');
  await peer.goto('http://127.0.0.1:5183/meetings');await peer.getByRole('button',{name:'Decline invitation',exact:true}).click();await peer.getByText(/Your invitation: declined/).waitFor();await tutor.getByRole('button',{name:'Cancel meeting',exact:true}).click();assert.equal(meetings[1].status,'cancelled');
  assert.deepEqual(errors,[]);for(const page of [parent,tutor])assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS: tutor-initiated reflection, decline, cancellation, mobile layout and no uncaught browser errors');
 }catch(e){console.error('SIGNALS',signals.reduce((a,s)=>(a[s.kind]=(a[s.kind]||0)+1,a),{}),'ERRORS',errors);for(const c of browser?.contexts()||[])for(const p of c.pages())console.error('BROWSER FAILURE',p.url(),await p.getByRole('alert').allTextContents(),await p.evaluate(()=>({peers:window.testPeers?.map(p=>({state:p.connectionState,signal:p.signalingState,local:p.localDescription?.type,remote:p.remoteDescription?.type})),channels:window.testChannels?.map(c=>({label:c.label,state:c.readyState,amount:c.bufferedAmount}))})));throw e;}finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1)});
