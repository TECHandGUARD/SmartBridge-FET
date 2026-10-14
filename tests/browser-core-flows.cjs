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
 const errors=[]; const writes=[];
 const context=await browser.newContext();
 const page=await context.newPage(); page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message)});
 let profile={id:'00000000-0000-4000-8000-000000000101',email:'learner@example.test',full_name:'Test Learner',role:'user',onboarding_complete:false,is_active:true,is_super_admin:false};
 const authUser={id:profile.id,email:profile.email,user_metadata:{full_name:profile.full_name},aud:'authenticated',role:'authenticated'};
 const session={access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTQwMDAtODAwMC0wMDAwMDAwMDAxMDEiLCJleHAiOjQxMDI0NDQ4MDAsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.test',refresh_token:'test-refresh',expires_at:4102444800,expires_in:3600,token_type:'bearer',user:authUser};
 let failResult=true, failBooking=true, failOnboarding=false;
 let hasPremium=false;let examRows=[];const examWrites=[];
 let topicRows=[];let nbtProgress=null;let failNbtSave=true;
 let priceRows=[{product:'student',amount_cents:2000,revision:1},{product:'parent',amount_cents:5000,revision:1},{product:'tutor_pro',amount_cents:15000,revision:1}];
 let counselorRosterApproved=true; let counselorLinkState='';
 let legalRows=[];
 const deferredRequests=[];
 const deferredTables=['simulations','sim_quizzes','flashcards','weak_concepts','student_analytics','forum_answers','chat_rooms','chat_typing_status','tutor_applications','student_requests','tutor_verification_requests','school_subject_averages','booking_reschedule_requests'];
 const tutor={id:'tutor-1',user_id:'tutor-user',user_email:'tutor@example.test',full_name:'Test Tutor',hourly_rate:100,subjects:['Mathematics'],grades:['Grade 12'],is_verified:true,is_active:true,rating:5};
 const bookingCalls=[];let links=[];let bookingRows=[];let sessionCalls=[];let sessions=0;let reminderRows=[];let goalRows=[];const contractWrites=[];let roomPosts=[{id:'00000000-0000-4000-8000-000000000201',room_id:'math',author_id:'00000000-0000-4000-8000-000000000202',author_name:'Other learner',type:'Note',title:'Approved note',body:'Safe study content',moderation_status:'approved',created_at:'2026-10-13T10:00:00Z'}];const studyCalls=[];let denyStudyQuota=true,failStudyPost=true,roomReplies=[];

 // Keep browser fixtures isolated from live providers and third-party embeds.
 await context.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return host==='127.0.0.1'||host==='smartbridge-test.supabase.co'?route.continue():route.abort();});
 await context.route('https://smartbridge-test.supabase.co/**', async route=>{
  const req=route.request(),url=new URL(req.url()); let data=[];let status=200;
  if(deferredTables.includes(url.pathname.split('/').at(-1))) deferredRequests.push(url.pathname);
  if(url.pathname==='/rest/v1/syllabus_progress') {
    if(req.method()==='POST') {const value=req.postDataJSON();const row=Array.isArray(value)?value[0]:value;assert.equal(row.student_id,profile.id);topicRows=[row];data=topicRows;}
    else if(req.method()==='DELETE') {assert.equal(url.searchParams.get('student_id'),'eq.'+profile.id);topicRows=[];data=[];}
    else {assert.equal(url.searchParams.get('student_id'),'eq.'+profile.id);data=topicRows;}
  }
  if(url.pathname==='/rest/v1/nbt_planner_progress') {
    if(req.method()==='POST') {const body=req.postDataJSON();assert.equal(body.student_id,profile.id);assert.equal(body.student_email,profile.email);if(failNbtSave){failNbtSave=false;status=503;data={message:'Test save unavailable'};}else{nbtProgress=body;data=body;}}
    else {assert.equal(url.searchParams.get('student_id'),'eq.'+profile.id);data=nbtProgress;}
  }
  if(url.pathname==='/rest/v1/legal_documents') {
    if(req.method()==='POST') {assert.equal(profile.role,'admin');const body=req.postDataJSON();legalRows=[{...body,id:'legal-fixture',revision:1,document_sha256:'a'.repeat(64)}];data=[{id:'legal-fixture'}];}
    else if(req.method()==='PATCH') {assert.equal(profile.role,'admin');assert.equal(url.searchParams.get('revision'),'eq.1');legalRows=legalRows.map(row=>({...row,...req.postDataJSON(),revision:2}));data=[{id:'legal-fixture'}];}
    else if(req.method()==='DELETE') {assert.equal(profile.role,'admin');assert.equal(url.searchParams.get('revision'),'eq.2');legalRows=[];data=[{id:'legal-fixture'}];}
    else data=url.searchParams.get('is_published')==='eq.true'?legalRows.filter(row=>row.is_published):legalRows;
  }
  if(url.pathname==='/rest/v1/subscription_prices') data=priceRows;
  if(url.pathname==='/rest/v1/rpc/set_subscription_price') {const body=req.postDataJSON();assert.equal(profile.role,'admin');priceRows=priceRows.map(row=>row.product===body.product_key?{...row,amount_cents:body.new_amount_cents,revision:row.revision+1}:row);data=priceRows.find(row=>row.product===body.product_key);}
  if(url.pathname==='/rest/v1/application_deadlines') data=[{id:'nbt-date',event_name:'Test NBT',category:'NBT',date:'2099-12-01',is_active:true,is_approved:true}];
  if(url.pathname==='/rest/v1/rpc/get_counselor_dashboard') data={students:counselorRosterApproved?[{id:'00000000-0000-4000-8000-000000004013',email:'roster@example.test',full_name:'Roster Learner'}]:[],applications:[],documents:[]};
  if(url.pathname==='/rest/v1/rpc/queue_counselor_reminder') {assert.equal(req.postDataJSON().learner_id,'00000000-0000-4000-8000-000000004013');data='00000000-0000-4000-8000-000000004020';}
  if(url.pathname==='/rest/v1/rpc/get_counselor_sharing_requests') data=counselorLinkState?[{id:'00000000-0000-4000-8000-000000004021',school_name:'Fixture School',status:counselorLinkState}]:[];
  if(url.pathname==='/rest/v1/rpc/respond_counselor_link') {counselorLinkState=req.postDataJSON().decision;data=true;}
  if(url.pathname==='/auth/v1/user') data=authUser;
  if(url.pathname==='/auth/v1/token') data=session;
  if(url.pathname==='/rest/v1/users') data=[profile];
  if(url.pathname==='/rest/v1/rpc/complete_onboarding') {if(failOnboarding){failOnboarding=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Setup temporarily unavailable. Please retry.'})});return;}writes.push(req.postDataJSON());const chosen=req.postDataJSON().requested_role;profile={...profile,role:chosen.includes('tutor')?'tutor_pending':chosen,onboarding_complete:true};data=profile;}
  if(url.pathname==='/rest/v1/quizzes') data=[{id:'quiz-1',title:'Test Quiz',subject:'Mathematics',grade:'Grade 12',questions:[{question:'Test question?',options:['A','B','C','D'],correct_index:0,explanation:'Test explanation'}]}];
  if(url.pathname==='/rest/v1/quiz_results' && req.method()==='POST') { const body=req.postDataJSON();writes.push(body); if(failResult){failResult=false;status=403;data={message:'Test save failure',code:'42501'};}else data={...body,id:'result-1'}; }
  if(url.pathname==='/rest/v1/tutor_profiles') data=['sace_tutor','tutor'].includes(profile.role) ? {is_verified:true} : null;
  if(url.pathname==='/rest/v1/subscriptions' && hasPremium) data=[{id:'subscription-test',status:'active',end_date:'2099-12-31'}];
  if(url.pathname==='/rest/v1/exam_schedule') {
    if(req.method()==='POST') {const body=req.postDataJSON();assert.equal(body.student_id,profile.id);assert.equal(body.student_email,profile.email);examWrites.push(body);data={...body,id:'exam-test',is_published:false};examRows=[data];}
    else if(req.method()==='DELETE') {assert.equal(url.searchParams.get('id'),'eq.exam-test');examRows=[];data=[];}
    else {assert.equal(url.searchParams.get('student_id'),'eq.'+profile.id);data=examRows;}
  }
  if(url.pathname==='/rest/v1/study_reminders') {
    if(req.method()==='POST') { const body=req.postDataJSON();const row=Array.isArray(body)?body[0]:body;assert.ok(row.time);assert.equal('reminder_time' in row,false);assert.equal(row.student_id,profile.id);contractWrites.push(row);reminderRows=[{...row,id:'reminder-1'}];data=reminderRows[0]; }
    else {assert.equal(url.searchParams.has('user_email'),false);assert.equal(url.searchParams.get('select')?.includes('reminder_time'),false);data=reminderRows;}
  }
  if(url.pathname==='/rest/v1/weekly_goals') {
    if(req.method()==='POST') { const body=req.postDataJSON();const row=Array.isArray(body)?body[0]:body;assert.ok(row.week_start);assert.ok(row.target);assert.equal('target_value' in row,false);assert.equal(row.student_id,profile.id);contractWrites.push(row);goalRows=[{...row,id:'goal-1'}];data=goalRows[0]; }
    else {assert.equal(url.searchParams.has('week_start_date'),false);data=goalRows;}
  }
  if(url.pathname==='/rest/v1/tutor_directory') data=[tutor];
  if(url.pathname==='/rest/v1/tutor_bookings') data=bookingRows;
  if(url.pathname==='/rest/v1/study_progress') data=sessions ? [{id:'progress-1',subject:'Mathematics',grade:'Grade 12',study_sessions:sessions,last_access:'2026-10-11'}] : [];
  if(url.pathname==='/rest/v1/rpc/create_booking') {
    const body=req.postDataJSON();bookingCalls.push(body);
    if(failBooking){failBooking=false;status=503;data={message:'Temporary booking failure'};}
    else {data={id:'booking-1',student_id:profile.id,tutor_email:tutor.user_email,tutor_name:tutor.full_name,subject:body.chosen_subject,date:body.chosen_date,time:body.chosen_time,duration_hours:body.hours,amount:100*body.hours,status:'pending'};bookingRows=[data];}
  }
  if(url.pathname==='/rest/v1/rpc/get_parent_links') data=links;
  if(url.pathname==='/rest/v1/rpc/request_parent_link') {links=[{id:'link-1',parent_id:profile.id,student_id:profile.id,parent_email:'parent@example.test',student_email:'learner@example.test',status:'pending'}];data=true;}
  if(url.pathname==='/rest/v1/rpc/respond_parent_link') {links=links.map(link=>({...link,status:req.postDataJSON().decision}));data=true;}
  if(url.pathname==='/rest/v1/rpc/log_study_session') {sessionCalls.push(req.postDataJSON());sessions=1;data='session-1';}
  if(url.pathname.startsWith('/functions/')) {status=404;data={error:'Not available'};}
  if(url.pathname==='/rest/v1/study_rooms') data=[{id:'math',name:'Mathematics'}];
  if(url.pathname==='/rest/v1/rpc/join_study_room') data=true;
  if(url.pathname==='/rest/v1/study_room_posts') {assert.equal(url.searchParams.get('select').includes('author_email'),false);data=roomPosts;}
  if(url.pathname==='/rest/v1/study_room_replies') data=roomReplies;
  if(url.pathname==='/functions/v1/check-rate-limit') {if(denyStudyQuota){denyStudyQuota=false;status=503;data={error:'Unavailable'};}else{status=200;data={allowed:true};}}
  if(url.pathname==='/functions/v1/moderate-post') {studyCalls.push(req.postDataJSON());if(failStudyPost){failStudyPost=false;status=503;data={error:'Unavailable'};}else{status=200;data={id:'00000000-0000-4000-8000-000000000203',status:'pending',approved:false};roomPosts=[...roomPosts,{...req.postDataJSON(),...data,author_id:profile.id,author_name:profile.full_name,moderation_status:'pending',created_at:'2026-10-13T10:01:00Z'}];}}
  if(url.pathname==='/functions/v1/moderate-reply') {status=200;data={id:'00000000-0000-4000-8000-000000000204',status:'pending',approved:false};roomReplies=[{...req.postDataJSON(),...data,author_name:profile.full_name,moderation_status:'pending'}];}
  if(url.pathname==='/functions/v1/report-content') {status=200;data={id:'report-1',status:'received',approved:true};}
  if(url.pathname==='/rest/v1/rpc/archive_study_post') {roomPosts=roomPosts.filter(post=>post.id!==req.postDataJSON().target);data=true;}
  if(url.pathname==='/rest/v1/rpc/study_moderation_queue') data={posts:[],replies:[],reports:[]};

  if(url.pathname==='/auth/v1/user' && req.method()==='PUT') data=authUser;
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5173/login');
 await page.getByRole('button',{name:'Sign In',exact:true}).waitFor();
 console.log('PASS: signed-out login loads');
 await page.getByPlaceholder('Email address').fill(profile.email);
 await page.getByPlaceholder('Password',{exact:true}).fill('TestPassword123');
 await page.getByRole('button',{name:'Sign In',exact:true}).click();
 await page.getByText('Tell us who you are').waitFor();
 await page.getByRole('radio',{name:'Student',exact:true}).check();
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByRole('checkbox').check();
 await page.getByRole('button',{name:'Complete Setup',exact:true}).click();
 await page.waitForURL('http://127.0.0.1:5173/student-dashboard');
 assert.equal(writes[0].requested_role,'student');
 console.log('PASS: login -> guided onboarding -> learner dashboard');
 await page.goto('http://127.0.0.1:5173/quiz');
 const selectors=page.getByRole('combobox');
 await selectors.nth(0).click();await page.getByRole('option',{name:'Mathematics',exact:true}).click();
 await selectors.nth(1).click();await page.getByRole('option',{name:'Grade 12',exact:true}).click();
 await page.getByRole('button',{name:'Start Quiz'}).click();
 await page.getByRole('button',{name:'A',exact:true}).click();
 await page.getByRole('button',{name:'See Results'}).click();
 await page.getByText('Your result could not be saved. Please retry.').waitFor();
 await page.getByRole('button',{name:'See Results'}).click();
 await page.getByText('1 out of 1 correct').waitFor();
 assert.equal(writes[1].student_id,profile.id);assert.equal(writes[2].score,1);
 console.log('PASS: correct grade quiz saves with ownership ID; failed save retries without duplicate answers');
 await page.goto('http://127.0.0.1:5173/premium');
 await page.getByText('After payment',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Activate',exact:true}).count(),0);
 await page.getByText('Online payment is currently unavailable. Please contact support.',{exact:true}).waitFor();
 await page.getByText('EFT is currently unavailable. Please contact support.',{exact:true}).waitFor();
 assert.equal(await page.locator('a[href^="https://pay.yoco.com"]').count(),0);
 console.log('PASS: no self-activation of premium; unset checkout/EFT settings show unavailable');
 await page.goto('http://127.0.0.1:5173/admin');
 await page.waitForURL('http://127.0.0.1:5173/');console.log('PASS: learner blocked from admin route');
 await page.goto('http://127.0.0.1:5173/reset-password');
 await page.getByLabel('New password',{exact:true}).fill('ChangedPassword123');
 await page.getByLabel('Confirm password',{exact:true}).fill('ChangedPassword123');
 await page.getByRole('button',{name:'Save password'}).click();
 await page.waitForURL('http://127.0.0.1:5173/student-dashboard');console.log('PASS: reset-password route updates password');
 await page.goto('http://127.0.0.1:5173/bookings');
 await page.getByRole('button',{name:'Schedule New Session'}).click();
 await page.getByRole('combobox').nth(0).click();await page.getByRole('option',{name:/Test Tutor/}).click();
 await page.locator('input[type=date]').fill('2027-01-20');
 const submitBooking=page.getByRole('button',{name:/Submit|Reserve|Confirm|Dispatch/});
 await submitBooking.click();await page.getByText('Temporary booking failure').waitFor();
 await submitBooking.click();await page.getByText('Test Tutor',{exact:true}).waitFor();
 assert.equal(bookingCalls.length,2);assert.equal(bookingCalls[0].request_id,bookingCalls[1].request_id);assert.equal('amount' in bookingCalls[0],false);
 console.log('PASS: shared booking RPC retries with the same ID and supplies no browser price');
 profile={...profile,role:'parent'};
 await page.goto('http://127.0.0.1:5173/parent-dashboard');
 await page.getByLabel("Learner's email").fill('learner@example.test');
 await page.getByRole('button',{name:'Request report access'}).click();
 await page.getByText('pending',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Approve report access'}).count(),0);
 console.log('PASS: parent requests access without a self-approval control');
 profile={...profile,role:'student'};
 await page.goto('http://127.0.0.1:5173/student-dashboard');
 await page.getByRole('button',{name:'Approve report access'}).click();
 await page.getByText('approved',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Remove report access'}).click();
 await page.getByText('revoked',{exact:true}).waitFor();
 console.log('PASS: learner approves and revokes parent report access');
 await page.getByRole('button',{name:'My Progress',exact:true}).click();
 await page.getByRole('button',{name:'Track',exact:true}).click();
 await page.getByRole('combobox').nth(0).click();await page.getByRole('option',{name:/Mathematics/}).first().click();
 await page.getByRole('button',{name:'Log Study Session',exact:true}).click();
 await page.getByText(/^Study session logged!/).waitFor();
 assert.equal(sessionCalls.length,1);assert.ok(sessionCalls[0].request_id);
 console.log('PASS: progress tracker uses existing study-session records through one RPC');
 await page.getByRole('checkbox',{name:'Algebra',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('[role="checkbox"][aria-label="Algebra"]')?.getAttribute('aria-checked')==='true');
 assert.equal(topicRows.length,1);
 await page.reload();
 await page.waitForFunction(()=>document.querySelector('[role="checkbox"][aria-label="Algebra"]')?.getAttribute('aria-checked')==='true');
 await page.getByRole('checkbox',{name:'Algebra',exact:true}).press('Space');
 await page.waitForFunction(()=>document.querySelector('[role="checkbox"][aria-label="Algebra"]')?.getAttribute('aria-checked')==='false');
 assert.equal(topicRows.length,0);
 console.log('PASS: topic completion persists across reload and can be undone with account ownership');
 await page.getByRole('button',{name:'Add',exact:true}).click();
 await page.getByRole('button',{name:'Save Reminder',exact:true}).click();
 await page.getByText(/Reminder set for Mathematics/).waitFor();
 assert.ok(contractWrites.some(row=>row.time),'Reminder saves with the canonical field');
 await page.getByRole('button',{name:'Goals & Badges',exact:true}).click();
 await page.getByRole('button',{name:'Add Goal',exact:true}).click();
 await page.getByRole('button',{name:'Save Goal',exact:true}).click();
 await page.getByText(/^Goal added successfully!/).waitFor();
 assert.ok(contractWrites.some(row=>row.week_start),'Goal saves with canonical fields');
 console.log('PASS: reminders and weekly goals use real schema fields and ownership IDs');
 hasPremium=true;
 await page.goto('http://127.0.0.1:5173/student-dashboard?section=ai');
 await page.getByText('Upcoming Exams / Tests',{exact:true}).waitFor();
 await page.getByText('Upcoming Exams / Tests',{exact:true}).locator('..').getByRole('button',{name:'Add',exact:true}).click();
 await page.getByRole('combobox').filter({hasText:'Select subject'}).click();
 await page.getByRole('option',{name:'Mathematics',exact:true}).click();
 await page.locator('input[type="date"]').fill('2099-12-01');
 await page.getByRole('button',{name:'Add Exam',exact:true}).click();
 await page.getByRole('button',{name:'Delete Mathematics exam'}).waitFor();
 assert.equal(examWrites.length,1);
 await page.reload();
 await page.getByRole('button',{name:'Delete Mathematics exam'}).click();
 await page.waitForFunction(()=>!document.querySelector('[aria-label="Delete Mathematics exam"]'));
 assert.equal(examRows.length,0);
 hasPremium=false;
 console.log('PASS: personal exam save, UUID-scoped reload and deletion use the ownership contract');
 hasPremium=true;
 await page.goto('http://127.0.0.1:5173/opportunities');
 await page.getByRole('tab',{name:'NBT Planner',exact:true}).click();
 const nbtButton=page.getByRole('button',{name:'Complete AL: Reading Comprehension Basics',exact:true});
 await nbtButton.click();
 await page.getByText('Failed to save progress',{exact:true}).waitFor();
 assert.equal(nbtProgress,null);
 await nbtButton.click();
 await page.getByRole('button',{name:'Undo AL: Reading Comprehension Basics',exact:true}).waitFor();
 assert.equal(nbtProgress.completed_sessions['4_Monday'],true);
 await page.reload();
 await page.getByRole('tab',{name:'NBT Planner',exact:true}).click();
 await page.getByRole('button',{name:'Undo AL: Reading Comprehension Basics',exact:true}).click();
 await page.getByRole('button',{name:'Complete AL: Reading Comprehension Basics',exact:true}).waitFor();
 assert.deepEqual(nbtProgress.completed_sessions,{});
 hasPremium=false;
 console.log('PASS: failed NBT saves preserve the previous state; retries, reload and undo persist');
 await page.goto('http://127.0.0.1:5173/student-dashboard?section=goals');
 await page.getByRole('button',{name:'My Progress',exact:true}).click();


 // URL-backed sections preserve refresh and browser history.
 assert.ok(page.url().endsWith('?section=progress'));
 await page.reload();
 await page.getByRole('button',{name:'My Progress',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'My Progress',exact:true}).getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'My Subjects',exact:true}).click();
 await page.goBack();
 await page.waitForURL('**/student-dashboard?section=progress');
 console.log('PASS: dashboard section persists on reload and Back');
 await page.goto('http://127.0.0.1:5173/onboarding');
 await page.waitForURL('**/student-dashboard');
 console.log('PASS: completed accounts skip setup');

 for (const role of ['parent','sace_tutor','student_tutor']) {
  profile={...profile,role:'user',onboarding_complete:false};
  await page.setViewportSize({width:390,height:844});
  await page.goto('http://127.0.0.1:5173/onboarding');
  await page.getByRole('radio',{name:role==='parent'?'Parent / Guardian':role==='sace_tutor'?'SACE Registered Tutor':'Student Tutor',exact:true}).check();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  if(role!=='parent') {
   if(role==='sace_tutor') await page.getByLabel('SACE registration number').fill('SACE-TEST');
   else {
    await page.getByLabel('University',{exact:true}).selectOption('other');
    await page.getByLabel('University name').fill('Test University');
    await page.getByLabel('Student number',{exact:true}).fill('TEST123');
   }
   await page.getByRole('button',{name:'Continue',exact:true}).click();
   const before=writes.length;
   await page.getByRole('button',{name:'Read tutor agreement',exact:true}).click();
   await page.getByRole('region',{name:'Tutor agreement text'}).focus();
   await page.keyboard.press('Control+End');
   await page.getByRole('button',{name:'Accept agreement',exact:true}).click();
   assert.equal(writes.length,before,'Accepting an agreement must not submit');
  }
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('checkbox').check();
  await page.screenshot({path:'/tmp/smartbridge-'+role+'-review.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Setup must fit phone width');
  if(role==='parent') {
   failOnboarding=true;
   await page.getByRole('button',{name:'Complete Setup',exact:true}).click();
   await page.getByRole('alert').filter({hasText:'Setup temporarily unavailable'}).waitFor();
   assert.equal(await page.getByRole('checkbox').isChecked(),true);
  }
  await page.getByRole('button',{name:role==='parent'?'Complete Setup':'Submit application',exact:true}).click();
  await page.waitForURL('**/'+(role==='parent'?'parent-dashboard':'tutor-dashboard'));
  if(role==='parent') {
   await page.getByLabel("Learner's email").waitFor();
   await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
   await page.getByRole('link',{name:'Link a learner',exact:true}).click();
   await page.waitForURL('**/parent-dashboard?section=child');
   await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
   await page.getByRole('button',{name:'Sign out',exact:true}).waitFor();
   await page.keyboard.press('Escape');
  } else await page.getByRole('heading',{name:'Tutor verification pending',exact:true}).waitFor();
  console.log('PASS: '+role+' mobile setup, review and role destination');
 }
 profile={...profile,role:'sace_tutor',onboarding_complete:true};
 await page.goto('http://127.0.0.1:5173/tutor-dashboard?section=bookings');
 await page.getByRole('button',{name:'Booking Requests',exact:true}).waitFor();
 await page.getByRole('button',{name:'Open navigation menu',exact:true}).click();
 await page.getByRole('link',{name:'My bookings',exact:true}).waitFor();
 await page.keyboard.press('Escape');
 console.log('PASS: verified tutor sees relevant mobile navigation');
 profile={...profile,role:'tutor'};
 await page.goto('http://127.0.0.1:5173/tutor-dashboard');
 await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
 assert.equal(new URL(page.url()).pathname,'/tutor-dashboard');
 assert.equal(await page.getByRole('heading',{name:'Tutor verification pending',exact:true}).count(),0);
 console.log('PASS: verified legacy tutor role reaches its dashboard');
 profile={...profile,role:'student'};
 for(const width of [320,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:5173/subjects');
  await page.getByRole('navigation',{name:'Main navigation',exact:true}).filter({visible:true}).waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Page must fit width '+width);
  await page.evaluate(()=>{for(const animation of document.getAnimations()){if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish()}catch{}}}});
  await page.screenshot({path:'/tmp/smartbridge-subjects-'+width+'.png',fullPage:true});
 }
 console.log('PASS: navigation and subjects layout fit 320, 768, 1024 and 1440px');

 // Membership, failures and queued-content UI use the real endpoint contracts.
 await page.goto('http://127.0.0.1:5173/study-rooms');
 await page.getByRole('button',{name:'Join study room',exact:true}).click();
 await page.getByRole('heading',{name:'Approved note',exact:true}).waitFor();
 await page.getByRole('button',{name:'New post',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('My queued note');
 await page.getByLabel('Your post',{exact:true}).fill('A useful explanation');
 await page.getByRole('button',{name:'Submit for review',exact:true}).click();
 await page.getByText('Could not check posting limits. Please retry.',{exact:true}).waitFor();
 assert.equal(studyCalls.length,0,'Quota failure must prevent mutation');
 await page.getByRole('button',{name:'Submit for review',exact:true}).click();
 await page.getByText('Post could not be submitted.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Submit for review',exact:true}).click();
 await page.getByRole('heading',{name:'My queued note',exact:true}).waitFor();
 assert.equal(studyCalls.length,2);assert.equal(studyCalls[0].request_id,studyCalls[1].request_id);
 await page.getByText('Awaiting review',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Replies (0)',exact:true}).click();
 await page.getByLabel('Your reply',{exact:true}).fill('Helpful reply');
 await page.getByRole('button',{name:'Submit reply for review',exact:true}).click();
 await page.getByText('Helpful reply',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Report',exact:true}).click();
 await page.getByRole('button',{name:'Submit report',exact:true}).click();
 await page.getByText('Report received for administrator review.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Delete',exact:true}).click();
 await page.getByRole('button',{name:'Remove post',exact:true}).click();
 await page.getByRole('heading',{name:'My queued note',exact:true}).waitFor({state:'hidden'});
 console.log('PASS: study-room membership, fail-closed quotas, idempotent submission, queued replies, reports and withdrawal');

 if(process.env.AUDIT_ALL_PAGES==='1' || process.argv.includes('--all-pages')) {
  const publicPages=['/privacy','/TermsOfService','/terms','/about-tech-guard','/forgot-password','/not-a-real-page'];
  const sharedPages=['/','/subjects','/subjects/math','/tutors','/premium','/bookings','/search','/quiz','/study-rooms','/videos','/resources-library','/forum','/bursaries','/opportunities'];
  for(const route of [...publicPages,...sharedPages]) {console.log('AUDIT:',route);
   await page.goto('http://127.0.0.1:5173'+route);
   await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
   await page.evaluate(()=>{for(const animation of document.getAnimations()){if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish()}catch{}}}});
   await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
  }
  for(const [role,sections] of Object.entries({student:['subjects','progress','ai','goals','simulations','bookmarks','messages','applications'],parent:['child','progress','subjects','tutors','reports','premium'],sace_tutor:['upload','availability','students','earnings','messages','bookings','reviews','sessions']})) {
   profile={...profile,role,is_super_admin:false};
   const base=role==='student'?'student':role==='parent'?'parent':'tutor';
   for(const section of sections) {
    await page.goto('http://127.0.0.1:5173/'+base+'-dashboard?section='+section);
    await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
   await page.evaluate(()=>{for(const animation of document.getAnimations()){if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish()}catch{}}}});
   }
  }
  console.log('PASS: shared and public routes render');
  profile={...profile,role:'admin',is_super_admin:true};
  for(const route of ['/admin','/caps-admin','/payout-log','/counselor']) {
   await page.goto('http://127.0.0.1:5173'+route);
   await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
   await page.evaluate(()=>{for(const animation of document.getAnimations()){if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish()}catch{}}}});
   const tabs=await page.getByRole('tab').all();
   for(const tab of tabs) {await tab.click();await page.waitForFunction(()=>document.body.innerText.trim().length>20 && !document.body.innerText.includes('Loading SmartBridge FET...'));
   await page.evaluate(()=>{for(const animation of document.getAnimations()){if(animation.effect?.getTiming().iterations!==Infinity){try{animation.finish()}catch{}}}});}
  }
  console.log('PASS: broad route and dashboard-section render audit (mocked services)');
 }
 // Assert content and the resolved route; an HTTP 200 SPA shell can still render a 404.
 await page.goto('http://127.0.0.1:5173/TermsOfService');
 await page.getByRole('heading',{name:'Legal documents'}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/terms');
 await page.getByText('SmartBridge FET is operated by TECH AND GUARD (Pty) Ltd',{exact:false}).waitFor();
 profile={...profile,role:'school_counselor',is_super_admin:false,onboarding_complete:true};
 await page.goto('http://127.0.0.1:5173/counselor');
 await page.getByRole('heading',{name:'Counselor Dashboard',exact:true}).waitFor();
 await page.getByText('Roster Learner',{exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Assign staff and request sharing'}).count(),0);
 await page.getByRole('textbox',{name:'Search students'}).fill('No match');
 await page.getByText('Roster Learner',{exact:true}).waitFor({state:'hidden'});
 await page.getByRole('textbox',{name:'Search students'}).fill('');
 await page.getByRole('button',{name:'Remind',exact:true}).click();
 await page.getByText('Reminder recorded. Email remains queued for delivery.',{exact:true}).waitFor();
 counselorRosterApproved=false;
 await page.getByRole('button',{name:'Sync',exact:true}).click();
 await page.getByText('Roster Learner',{exact:true}).waitFor({state:'hidden'});
 profile={...profile,role:'student'};counselorLinkState='pending';
 await page.goto('http://127.0.0.1:5173/student-dashboard');
 await page.getByRole('button',{name:'Approve sharing',exact:true}).click();
 await page.getByRole('button',{name:'Approve sharing',exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Revoke sharing',exact:true}).click();
 await page.getByRole('button',{name:'Revoke sharing',exact:true}).waitFor({state:'hidden'});
 console.log('PASS: legacy legal route redirects to actual content; staff roster/search/queued reminder/revocation and learner sharing controls');
 profile={...profile,role:'admin',is_super_admin:true};
 await page.goto('http://127.0.0.1:5173/admin');
 await page.getByRole('tab',{name:'Subscription Prices',exact:true}).click();
 await page.getByLabel('New monthly price (ZAR)',{exact:true}).first().waitFor();
 await page.locator('#price-student').fill('37.50');
 await page.getByRole('button',{name:'Save Student Premium price',exact:true}).click();
 await page.getByText('Student Premium price saved.',{exact:true}).waitFor();
 assert.equal(priceRows.find(row=>row.product==='student').amount_cents,3750);
 await page.goto('http://127.0.0.1:5173/premium');
 await page.getByRole('button').filter({hasText:'Student Premium'}).getByText('R37.5',{exact:false}).waitFor();
 console.log('PASS: admin price save updates displayed subscription price');
 profile={...profile,role:'admin',is_super_admin:true};
 await page.goto('http://127.0.0.1:5173/admin');
 await page.getByRole('tab',{name:'Legal documents',exact:true}).click();
 await page.getByLabel('Title',{exact:true}).fill('Tutor payment timetable');
 await page.getByLabel('Document key',{exact:true}).fill('test_tutor_payments');
 await page.getByLabel('Who can view this document?',{exact:true}).selectOption('tutor');
 await page.getByLabel('Document text',{exact:true}).fill('Payments are reviewed monthly.');
 await page.getByLabel('Published to selected audience',{exact:true}).check();
 await page.getByRole('button',{name:'Save document',exact:true}).click();
 await page.getByText('Document saved.',{exact:true}).waitFor();
 assert.equal(legalRows[0].audience,'tutor');
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await page.getByLabel('Contains personal information / completed form',{exact:true}).check();
 assert.deepEqual(await page.getByLabel('Who can view this document?',{exact:true}).locator('option').evaluateAll(options=>options.map(option=>option.value)),['owner','admin']);
 await page.getByLabel('Who can view this document?',{exact:true}).selectOption('owner');
 await page.getByLabel('Specific user account ID',{exact:true}).fill(profile.id);
 await page.getByLabel(/^Version/).fill('1.1');
 await page.getByRole('button',{name:'Save document',exact:true}).click();
 await page.getByLabel('Document key',{exact:true}).waitFor();
 await page.getByLabel('Document key',{exact:true}).fill('');
 assert.equal(legalRows[0].audience,'owner');
 assert.equal(legalRows[0].contains_personal_information,true);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Delete',exact:true}).click();
 await page.getByText('Document deleted.',{exact:true}).waitFor();
 assert.equal(legalRows.length,0);
 console.log('PASS: administrator document create, private audience guard, versioned edit and delete');

 assert.deepEqual(errors,[]);
 assert.deepEqual(deferredRequests,[],'Deferred features must not query unfinished backend tables');
 assert.equal(await page.getByRole('button',{name:/Delete (My|Tutor) Account/}).count(),0,'Unimplemented permanent deletion must not be offered');
 } catch(error) {
  const debugPage=browser?.contexts()[0]?.pages()[0];
  if(debugPage){console.error('PAGE URL:',debugPage.url());console.error('PAGE TEXT:',(await debugPage.locator('body').innerText()).slice(0,5000));await debugPage.screenshot({path:'/tmp/fet-browser-failure.png'});}
  throw error;
 } finally { if(browser) await browser.close(); server.kill(); }
})().catch(e=>{console.error(e);process.exit(1)});
