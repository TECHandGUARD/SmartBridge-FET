import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const eventId='00000000-0000-4000-8000-000000003011';
const request=body=>new Request('https://example.test/dispatch',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)});
const claimed={id:eventId,to:'stored-recipient@example.test',subject:'Account approved',message:'Your account is ready.'};
function clientFor(event=claimed){return fakeClient({id:'user-id',role:'admin',is_active:true},call=>({data:call.table==='claim_action_notification'?event:call.table==='finish_action_notification'?true:call.table==='meeting_email_sender'?'SmartBridge FET <meetings@verified.example.test>':[],error:null}));}
test('notification recipients and text come from the leased DB event, not the request',async()=>{
 const client=clientFor();let payload;
 const runtime=edgeRuntime('dispatchNotifications',{client,fetch:async(_url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'provider-message'});}});
 const response=await runtime.handle(request({event_ids:[eventId],to:'forged@example.test',subject:'Forged'}));
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.accepted,1);assert.equal(result.delivered,false);
 assert.deepEqual(payload.to,['stored-recipient@example.test']);assert.equal(payload.subject,'Account approved');assert.ok(payload.text.includes(eventId));
 assert.equal(client.calls.find(c=>c.table==='claim_action_notification').data.caller_id,'user-id');
});
test('invalid event IDs and already accepted/leased events make no provider call',async()=>{
 let sends=0;const runtime=edgeRuntime('dispatchNotifications',{client:clientFor(null),fetch:async()=>{sends++;return Response.json({id:'unused'});}});
 assert.equal((await runtime.handle(request({event_ids:['not-an-id']}))).status,400);
 const response=await runtime.handle(request({event_ids:[eventId,eventId]}));assert.equal((await response.json()).accepted,0);assert.equal(sends,0);
});
test('missing sender configuration retains a failed outbox event without claiming delivery',async()=>{
 const client=clientFor();const runtime=edgeRuntime('dispatchNotifications',{client,env:{EMAIL_FROM:'',FROM_EMAIL:''},fetch:async()=>{throw new Error('Must not send');}});
 const result=await (await runtime.handle(request({event_ids:[eventId]}))).json();assert.equal(result.failed,1);assert.equal(result.delivered,false);
 const receipt=client.calls.find(c=>c.table==='finish_action_notification');assert.equal(receipt.data.message_id,null);assert.equal(receipt.data.error_code,'delivery_configuration_or_provider_failure');
});
test('forged job headers cannot use the service-only pending notification queue',async()=>{
 const client=clientFor();const runtime=edgeRuntime('dispatchNotifications',{client,env:{JOB_AUTH_SECRET:'correct-job-secret'},fetch:async()=>{throw new Error('Must not send');}});
 const req=new Request('https://example.test/dispatch',{method:'POST',headers:{'x-job-secret':'forged','Content-Type':'application/json'},body:'{"job":true}'});
 assert.equal((await runtime.handle(req)).status,401);assert.equal(client.calls.some(c=>c.table==='pending_action_notification_ids'),false);
});

test('an authenticated administrator cannot become a background job when the job secret is unconfigured',async()=>{
 const client=clientFor();const runtime=edgeRuntime('dispatchNotifications',{client,env:{JOB_AUTH_SECRET:''}});
 const req=new Request('https://example.test/dispatch',{method:'POST',headers:{Authorization:'Bearer test','x-job-secret':'forged','Content-Type':'application/json'},body:'{"job":true}'});
 assert.equal((await runtime.handle(req)).status,401);assert.equal(client.calls.some(c=>c.table==='pending_action_notification_ids'),false);
});

test('meeting email uses the stored meeting link and SAST time',async()=>{
 const client=clientFor({...claimed,meeting_id:eventId,message:'Support meeting. Start: 20 Oct 2026 14:00 SAST.'});let payload;
 const runtime=edgeRuntime('dispatchNotifications',{client,fetch:async(_url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'meeting-message'});}});
 assert.equal((await runtime.handle(request({event_ids:[eventId]}))).status,200);
 assert.ok(payload.text.includes('https://staging.example.test/meetings/'+eventId));assert.ok(payload.text.includes('14:00 SAST'));assert.equal(payload.from,'SmartBridge FET <meetings@verified.example.test>');
});
test('single-use meeting worker credential is checked before preparing reminders',async()=>{
 let valid=true;const client=fakeClient(undefined,call=>({data:call.table==='consume_meeting_mail_token'?valid:[],error:null}));
 const runtime=edgeRuntime('dispatchNotifications',{client});
 const job=()=>new Request('https://example.test/dispatch',{method:'POST',headers:{'x-meeting-job-token':'one-use-test-credential','Content-Type':'application/json'},body:'{}'});
 const first=await runtime.handle(job());assert.equal(first.status,200);assert.equal((await first.json()).email_configured,true);
 assert.ok(client.calls.some(c=>c.table==='prepare_meeting_emails'));valid=false;client.calls.length=0;
 assert.equal((await runtime.handle(job())).status,401);assert.equal(client.calls.some(c=>c.table==='prepare_meeting_emails'),false);
});
test('meeting worker surfaces missing sender configuration even when no emails are due',async()=>{
 const client=fakeClient(undefined,call=>({data:call.table==='consume_meeting_mail_token',error:null}));
 const runtime=edgeRuntime('dispatchNotifications',{client,env:{EMAIL_FROM:'',FROM_EMAIL:''}});
 const response=await runtime.handle(new Request('https://example.test/dispatch',{method:'POST',headers:{'x-meeting-job-token':'test','Content-Type':'application/json'},body:'{}'}));
 assert.equal(response.status,503);assert.equal(client.calls.some(c=>c.table==='prepare_meeting_emails'),false);
});

test('provider rejection records its HTTP status while preserving retryable mail',async()=>{
 const client=clientFor({...claimed,meeting_id:eventId});
 const runtime=edgeRuntime('dispatchNotifications',{client,fetch:async()=>Response.json({name:'validation_error'},{status:403})});
 const result=await (await runtime.handle(request({event_ids:[eventId]}))).json();assert.equal(result.failed,1);
 assert.equal(client.calls.find(c=>c.table==='finish_action_notification').data.error_code,'provider_http_403');
});
