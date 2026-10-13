import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const names=fs.readdirSync('supabase/functions');
const request=(body={},headers={Authorization:'Bearer test-user'})=>new Request('https://example.test/function',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('all user/job function handlers handle preflight and reject missing authentication before querying or sending', async()=>{
 for(const name of names.filter(name=>!['yocoWebhook','resendWebhook'].includes(name))){
  const client=fakeClient();const runtime=edgeRuntime(name,{client});
  const preflight=await runtime.handle(new Request('https://example.test/function',{method:'OPTIONS'}));
  assert.equal(preflight.status,200,name);assert.ok(preflight.headers.get('Access-Control-Allow-Headers').includes('x-job-secret'));
  const rejected=await runtime.handle(request({},{}));assert.equal(rejected.status,401,name);assert.equal(client.calls.length,0,name);
 }
});

test('database administrators pass moderation gates; user-editable admin claims and inactive profiles do not',async()=>{
 for(const profile of [{id:'user-id',role:'student',is_active:true},{id:'user-id',role:'admin',is_active:false}]){
  const runtime=edgeRuntime('approveOpportunityContent',{client:fakeClient(profile)});
  assert.equal((await runtime.handle(request({type:'guide',id:'g1',action:'approve'}))).status,403);
 }
 const client=fakeClient({id:'user-id',role:'student',is_super_admin:true,is_active:true});
 assert.equal((await edgeRuntime('approveOpportunityContent',{client}).handle(request({}))).status,400);
});

test('standard and legacy booking webhook payloads preserve provider sending and share retry keys',async()=>{
 const sends=[];const client=fakeClient();
 const runtime=edgeRuntime('notifyBookingConfirmed',{client,env:{JOB_AUTH_SECRET:'automation-test'},fetch:async(url,options)=>{sends.push({url,options});return Response.json({id:'email-id'});}});
 const data={id:'booking-id',student_email:'learner@example.test',status:'confirmed',subject:'Math',date:'2026-10-12',time:'14:00',duration_hours:1};
 for(const body of [{type:'UPDATE',table:'tutor_bookings',record:data,old_record:{status:'pending'}},{data,old_data:{status:'pending'}}]){
  const response=await runtime.handle(request(body,{'x-job-secret':'automation-test'}));assert.equal(response.status,200);assert.equal((await response.json()).email_id,'email-id');
 }
 assert.equal(sends.length,2);assert.equal(sends[0].options.headers.get('Idempotency-Key'),sends[1].options.headers.get('Idempotency-Key'));
 assert.equal(JSON.parse(sends[0].options.body).from,'SmartBridge <noreply@example.test>');assert.ok(JSON.parse(sends[0].options.body).text.includes('https://staging.example.test/bookings'));
 assert.equal((await runtime.handle(request({record:data},{'x-job-secret':'wrong'}))).status,401);
 const skipped=await runtime.handle(request({record:data,old_record:{status:'confirmed'}},{'x-job-secret':'automation-test'}));assert.equal((await skipped.json()).skipped,true);assert.equal(sends.length,2);
});

test('failed email sends do not set reminder flags; successful NBT tracking uses existing columns',async()=>{
 const fixture={id:'nbt-id',student_email:'learner@example.test',student_name:'Learner',status:'registered',test_date:'2026-10-12',tests_registered:['AQL']};
 const Clock=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-11T10:00:00Z']));}};
 for(const success of [false,true]){
  const client=fakeClient(undefined,call=>({data:call.operation==='select'?[fixture]:null,error:null}));
  const response=await edgeRuntime('sendNBTReminders',{client,Date:Clock,env:{JOB_AUTH_SECRET:'job'},fetch:async()=>success?Response.json({id:'email-id'}):Response.json({error:'declined'},{status:400})}).handle(request({}, {'x-job-secret':'job'}));
  assert.equal(response.status,200);
  const updates=client.calls.filter(call=>call.table==='nbt_registrations'&&call.operation==='update');
  assert.equal(updates.length,success?1:0);
  if(success){assert.equal(updates[0].data.reminder_sent,true);assert.ok(!Object.hasOwn(updates[0].data,'reminder_sent_at'));}
 }
});

test('opportunity reviews call one atomic RPC with the verified actor and handle retries/failures',async()=>{
 const id='00000000-0000-4000-8000-000000000811';let fail=true;
 const client=fakeClient({id:'user-id',role:'student',is_super_admin:true,is_active:true},call=>{
  assert.equal(call.operation,'rpc');assert.equal(call.table,'review_opportunity_content');
  if(fail){fail=false;return {data:null,error:{message:'database unavailable'}};}
  return {data:{success:true,action:'approved',skipped:true},error:null};
 });
 const runtime=edgeRuntime('approveOpportunityContent',{client});
 const payload={type:'guide',id,action:'approve',admin_notes:'Reviewed',actor_id:'forged-user'};
 assert.equal((await runtime.handle(request(payload))).status,503);
 const response=await runtime.handle(request(payload));assert.equal(response.status,200);assert.equal((await response.json()).skipped,true);
 const writes=client.calls.filter(call=>call.table!=='users');assert.equal(writes.length,2);
 for(const call of writes){assert.equal(call.data.actor_id,'user-id');assert.equal(call.data.item_id,id);assert.equal(call.data.review_notes,'Reviewed');}
 for(const payload of [{type:'guide',id:'bad',action:'approve'},{type:'bad',id,action:'approve'},{type:'guide',id,action:'delete'},{type:'guide',id,action:'approve',admin_notes:'x'.repeat(5001)}]){
  assert.equal((await runtime.handle(request(payload))).status,400);
 }
 assert.equal(client.calls.filter(call=>call.table==='review_opportunity_content').length,2);
});

test('email retries keep the same key, reject missing provider IDs, and require real sender configuration',async()=>{
 let calls=0;const keys=[];
 const runtime=edgeRuntime(null,{fetch:async(_url,options)=>{calls++;keys.push(options.headers.get('Idempotency-Key'));return calls===1?new Response('',{status:503}):Response.json({id:'message-id'});}});
 await runtime.email.emailFetch({method:'POST',body:JSON.stringify({to:['learner@example.test'],subject:'Test',text:'Hello'})});
 assert.equal(calls,2);assert.equal(keys[0],keys[1]);
 await assert.rejects(edgeRuntime(null,{fetch:async()=>Response.json({})}).email.emailFetch({body:JSON.stringify({to:['learner@example.test']})}),/no message ID/);
 assert.throws(()=>edgeRuntime(null,{env:{EMAIL_FROM:'',FROM_EMAIL:'noreply@yourdomain.com'}}).config.emailSettings(),/verified sender/);
});

test('all five AI handlers use the configured model and header credential while retaining live response contracts',async()=>{
 for(const name of ['generateQuiz','studentOpportunitiesAssistant','discoverApplicationDeadlines','discoverOpportunityGuides','discoverUniversityProspectuses']){
  const calls=[];const client=fakeClient({id:'user-id',role:'admin',is_active:true},call=>({data:call.table==='universities'?[{name:'Test University',website:'https://example.test'}]:[],error:null}));
  const result={questions:[{question:'Test?',options:['A','B','C','D'],correct_index:0}],topic_summary:'Summary',response:'Answer',guides:[],deadlines:[],prospectuses:[]};
  const runtime=edgeRuntime(name,{client,fetch:async(url,options)=>{calls.push({url,options});return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]});}});
  const response=await runtime.handle(request({subject:'Math',grade:'Grade 12',topic:'Algebra',message:'What is NBT?'}));
  assert.equal(response.status,200,name);assert.equal(calls.length,1,name);
  assert.equal(calls[0].url,'https://generativelanguage.googleapis.com/v1beta/models/account-model:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'],'model-test-key');assert.ok(!calls[0].url.includes('model-test-key'));
 }
});

test('study reminders accept stored seconds and record acceptance to skip a repeated scheduler call',async()=>{
 const Clock=class extends Date{constructor(...args){super(...(args.length?args:['2026-10-11T14:00:00Z']));}};
 const reminder={id:'reminder-id',student_email:'learner@example.test',day_of_week:'Sunday',subject:'Math',time:'16:00:00',is_active:true};let sends=0;
 const client=fakeClient(undefined,call=>{
  if(call.table==='study_reminders'&&call.operation==='select')return {data:[reminder],error:null};
  if(call.table==='study_reminders'&&call.operation==='update')Object.assign(reminder,call.data);
  return {data:null,error:null};
 });
 const runtime=edgeRuntime('sendStudyReminders',{client,Date:Clock,env:{JOB_AUTH_SECRET:'job'},fetch:async()=>{sends++;return Response.json({id:'accepted-id'});}});
 const first=await runtime.handle(request({}, {'x-job-secret':'job'}));assert.equal((await first.json()).sent,1);
 const second=await runtime.handle(request({}, {'x-job-secret':'job'}));assert.equal((await second.json()).sent,0);assert.equal(sends,1);assert.equal(reminder.last_notified_at,'2026-10-11T14:00:00.000Z');
});
