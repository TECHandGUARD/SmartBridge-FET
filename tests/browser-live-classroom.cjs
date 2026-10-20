// Real Chromium WebRTC and media; isolated auth/REST fixtures. No live learner accounts.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
(async () => {
  const relay=process.env.SMARTBRIDGE_RELAY_CONFIG_PATH?JSON.parse(require('node:fs').readFileSync(process.env.SMARTBRIDGE_RELAY_CONFIG_PATH,'utf8')):null;
  const relayServers=relay?.iceServers.map(server=>({...server,urls:server.urls.filter(url=>url.startsWith('turns:'))})).filter(server=>server.urls.length);if(relay)assert.ok(relayServers.length,'TLS TURN server required');
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5182','--strictPort'], {
    env: {...process.env, VITE_SUPABASE_URL:'https://smartbridge-test.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',VITE_SUPABASE_ANON_KEY:''}, stdio:'ignore'
  });
  let browser;
  try {
    for (let n=0;n<100;n++) { try { await fetch('http://127.0.0.1:5182/login'); break; } catch { await new Promise(r=>setTimeout(r,100)); } }
    browser = await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--autoplay-policy=no-user-gesture-required'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
    const people = ['tutor','student','student'].map((role,i)=>({id:`00000000-0000-4000-8000-00000000010${i+1}`,email:`live${i}@example.test`,role,full_name:`Test ${role}`,is_active:true,onboarding_complete:true}));
    const booking = {id:randomUUID(),tutor_id:people[0].id,student_id:people[1].id,tutor_email:people[0].email,student_email:people[1].email,tutor_name:'Test tutor',subject:'Mathematics',date:'2026-10-19',time:'21:00',duration_hours:0.5,amount:0,is_intro:true,status:'confirmed',session_link:null};
    const signals=[],errors=[]; let allowed=true, failRead=false;
    async function open(person, denied=false) {
      const context=await browser.newContext({permissions:['camera','microphone'],viewport:{width:person.role==='tutor'?1280:390,height:900}});
      // Instrument real browser objects, without replacing WebRTC or camera/mic capture.
      await context.addInitScript(({screenSharing,relayServers})=>{
        window.testPeers=[];window.testTracks=[];
        const Original=window.RTCPeerConnection;
        window.RTCPeerConnection=class extends Original {constructor(...args){super(...(relayServers?[{...args[0],iceServers:relayServers,iceTransportPolicy:"relay"}]:args));window.testPeers.push(this);}setConfiguration(config){return super.setConfiguration(relayServers?{...config,iceServers:relayServers,iceTransportPolicy:"relay"}:config);}};
        const media=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia=async options=>{const stream=await media(options);window.testTracks.push(...stream.getTracks());return stream;};
        // A canvas gives deterministic screen pixels, with a real replaceTrack sender.
        navigator.mediaDevices.getDisplayMedia=async()=>{if(window.testCancelScreenShare){window.testCancelScreenShare=false;throw new DOMException('Cancelled','NotAllowedError');}const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;canvas.getContext('2d').fillRect(0,0,320,240);const stream=canvas.captureStream(10);window.testTracks.push(...stream.getTracks());return stream;};
        if(!screenSharing)navigator.mediaDevices.getDisplayMedia=undefined;
      },{screenSharing:person.role!=='student',relayServers});
      const auth={...person,user_metadata:{full_name:person.full_name},aud:'authenticated',role:'authenticated'};
      const session={access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:person.id,exp:4102444800,role:'authenticated'})).toString('base64url')+'.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:auth};
      // Disable WebSocket delivery deliberately: REST recovery must establish the call.
      await context.routeWebSocket('**/realtime/**', ws=>ws.close());
      await context.route('https://smartbridge-test.supabase.co/**',async route=>{
        const req=route.request(),url=new URL(req.url());let data=[],status=200;
        if(url.pathname==='/auth/v1/user') data=auth;
        if(url.pathname==='/auth/v1/token') data=session;
        if(url.pathname==='/rest/v1/users') data=req.headers().accept?.includes('vnd.pgrst.object')?person:[person];
        if(url.pathname==='/rest/v1/tutor_profiles') data={is_verified:true};
        if(url.pathname==='/rest/v1/rpc/can_join_live_classroom') data=allowed&&!denied&&[booking.tutor_id,booking.student_id].includes(person.id);
        if(url.pathname==='/rest/v1/tutor_bookings') data=req.headers().accept?.includes('vnd.pgrst.object')?booking:[booking];
        if(url.pathname==='/rest/v1/classroom_signals') {
          if(req.method()==='POST') {const row=req.postDataJSON();assert.equal(row.sender_id,person.id);assert.equal(row.booking_id,booking.id);assert.ok(row.payload.session_id);signals.push({...row,id:randomUUID(),created_at:new Date().toISOString()});}
          else if(failRead){failRead=false;status=503;data={message:'Temporary signaling interruption'};}
          else {assert.equal(url.searchParams.get('recipient_id'),'eq.'+person.id);const since=url.searchParams.get('created_at')?.slice(4)||'';data=signals.filter(s=>s.recipient_id===person.id&&s.created_at>=since).sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));}
        }
        await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
      });
      const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
      await page.goto('http://127.0.0.1:5182/login');await page.getByPlaceholder('Email address').fill(person.email);await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');await page.getByRole('button',{name:'Sign In',exact:true}).click();
      await page.waitForURL('**/'+person.role+'-dashboard');
      await page.goto('http://127.0.0.1:5182/live-classroom/'+booking.id);
      return page;
    }
    const tutor=await open(people[0]);const learner=await open(people[1]);const outsider=await open(people[2],true);
    await outsider.getByRole('alert').filter({hasText:'Access denied'}).waitFor();assert.equal(await outsider.getByRole('button',{name:'Join classroom',exact:true}).isDisabled(),true);assert.equal(await outsider.evaluate(()=>window.testTracks.length),0);
    // Proposal acceptance leaves session_link null: both participants still receive the default link.
    await learner.goto('http://127.0.0.1:5182/bookings');await learner.getByRole('button',{name:'Join Session',exact:true}).waitFor();assert.equal(await learner.locator('a').filter({has:learner.getByRole('button',{name:'Join Session',exact:true})}).getAttribute('href'),'/live-classroom/'+booking.id);
    await learner.goto('http://127.0.0.1:5182/live-classroom/'+booking.id);
    async function join(page){await page.getByRole('button',{name:'Join classroom',exact:true}).click();await page.getByRole('button',{name:'Leave',exact:true}).waitFor();}
    async function waitForAsync(page,predicate){const deadline=Date.now()+30000;while(Date.now()<deadline){if(await page.evaluate(predicate))return;await new Promise(r=>setTimeout(r,250));}throw new Error('Timed out waiting for real media');}
    async function connected(){for(const page of [tutor,learner]){await page.getByRole('status').filter({hasText:'Live — secure peer-to-peer connection'}).waitFor({timeout:30000});await page.waitForFunction(()=>{const v=document.querySelector('video[aria-label="Other participant video"]');return v?.videoWidth>0&&v.srcObject?.getAudioTracks().length===1;});await waitForAsync(page,async()=>{const pc=window.testPeers.at(-1);if(!pc)return false;const stats=await pc.getStats();return [...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='video'&&s.bytesReceived>0)&&[...stats.values()].some(s=>s.type==='inbound-rtp'&&s.kind==='audio'&&s.bytesReceived>0);});}}
    await join(tutor);failRead=true;await join(learner);await connected();assert.equal(await learner.getByRole('button',{name:'Share screen',exact:true}).count(),0);await learner.getByText('Screen sharing is unavailable in this browser. Audio, video and viewing shared screens are still available.').waitFor();assert.equal(await learner.getByRole('alert').count(),0);console.log('PASS: real bidirectional audio/video, tutor first, failed REST read recovery and WebSocket unavailable');
    const {jsPDF}=require('jspdf');const pdf=new jsPDF();pdf.text('Classroom slide',20,20);pdf.addPage();pdf.text('Second slide',20,20);
    await tutor.getByLabel('Present PDF slides',{exact:true}).setInputFiles({name:'Classroom.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf.output('arraybuffer'))});
    await learner.getByRole('img',{name:'Shared slide 1 of 2',exact:true}).waitFor();await tutor.getByRole('button',{name:'Next slide',exact:true}).click();await learner.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor();await connected();
    const priorOffers=signals.filter(s=>s.kind==='offer').length;await tutor.evaluate(()=>window.dispatchEvent(new Event('online')));for(let n=0;n<100&&signals.filter(s=>s.kind==='offer').length===priorOffers;n++)await new Promise(r=>setTimeout(r,100));assert.ok(signals.filter(s=>s.kind==='offer').length>priorOffers);await connected();
    if(relay){for(const page of [tutor,learner])assert.ok(await page.evaluate(async()=>{const stats=[...(await window.testPeers.at(-1).getStats()).values()];const pair=stats.find(s=>s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated);return !!pair&&stats.find(s=>s.id===pair.localCandidateId)?.candidateType==='relay';}));console.log('PASS: free introductory classroom audio/video and slides use forced encrypted TLS TURN, including ICE recovery');}
    await learner.getByRole('button',{name:'Leave',exact:true}).click();await learner.getByRole('button',{name:'Join with audio and slides only',exact:true}).click();await learner.getByRole('button',{name:'Leave',exact:true}).waitFor();await waitForAsync(learner,async()=>{const pc=window.testPeers.at(-1);if(pc?.connectionState!=='connected')return false;const stats=[...(await pc.getStats()).values()];return stats.some(s=>s.type==='inbound-rtp'&&s.kind==='audio'&&s.bytesReceived>0)&&!stats.some(s=>s.type==='inbound-rtp'&&s.kind==='video'&&s.bytesReceived>0);});await learner.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor();await learner.getByRole('button',{name:'Leave',exact:true}).click();await join(learner);await connected();console.log('PASS: introductory learner receives audio and slides without incoming video, then rejoins with camera');
    await tutor.getByRole('button',{name:'Stop presenting',exact:true}).click();await learner.getByRole('img',{name:'Shared slide 2 of 2',exact:true}).waitFor({state:'detached'});console.log('PASS: booked tutor presents and stops PDF slides while learner audio/video continues');
    await learner.getByRole('button',{name:'Mute',exact:true}).click();assert.equal(await learner.evaluate(()=>window.testTracks.find(t=>t.kind==='audio').enabled),false);
    await learner.getByRole('button',{name:'Camera off',exact:true}).click();assert.equal(await learner.evaluate(()=>window.testTracks.find(t=>t.kind==='video').enabled),false);
    await learner.getByRole('button',{name:'Leave',exact:true}).click();await tutor.getByRole('status').filter({hasText:'Waiting for them to rejoin'}).waitFor();assert.ok(await learner.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')));
    await join(learner);await connected();assert.equal(await learner.getByRole('button',{name:'Mute',exact:true}).count(),1);console.log('PASS: learner leave/rejoin ignores old offers and resets mute/camera controls');
    await tutor.evaluate(()=>{window.testCancelScreenShare=true;});await tutor.getByRole('button',{name:'Share screen',exact:true}).click();assert.equal(await tutor.getByRole('alert').count(),0);
    await tutor.getByRole('button',{name:'Share screen',exact:true}).click();await tutor.getByRole('button',{name:'Stop sharing',exact:true}).click();await tutor.getByRole('button',{name:'Share screen',exact:true}).waitFor();assert.ok(await tutor.evaluate(()=>window.testPeers.at(-1).getSenders().find(s=>s.track?.kind==='video').track===window.testTracks.find(t=>t.kind==='video')));console.log('PASS: explicit stop sharing restores camera track');
    await tutor.getByRole('button',{name:'Leave',exact:true}).click();await learner.getByRole('status').filter({hasText:'Waiting for them to rejoin'}).waitFor();await join(tutor);await connected();console.log('PASS: tutor rejoin works while learner remains');
    await tutor.getByRole('button',{name:'Leave',exact:true}).click();await learner.getByRole('button',{name:'Leave',exact:true}).click();await learner.reload();await tutor.reload();await join(learner);await join(tutor);await connected();console.log('PASS: learner joins first with stale signal history from previous calls');
    // SPA navigation must close media even when React reuses the classroom component.
    await learner.evaluate(()=>{history.pushState({},'', '/live-classroom/00000000-0000-4000-8000-000000000999');dispatchEvent(new PopStateEvent('popstate'));});
    await learner.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));
    await tutor.getByRole('link',{name:'Back to bookings'}).click();await tutor.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));
    assert.deepEqual(errors,[]);console.log('PASS: outsider blocked, free intro join link, navigation cleanup and no uncaught browser errors');
  } catch(e) {for(const c of browser?.contexts()||[])for(const p of c.pages())console.error('BROWSER FAILURE',p.url(),(await p.locator('body').innerText()).slice(-3500));throw e;} finally {if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exit(1);});
