import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const eventId='00000000-0000-4000-8000-000000003011';
const request=body=>new Request('https://example.test/dispatch',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)});
const claimed={id:eventId,to:'stored-recipient@example.test',subject:'Account approved',message:'Your account is ready.'};
function clientFor(event=claimed){return fakeClient({id:'user-id',role:'admin',is_active:true},call=>({data:call.table==='claim_action_notification'?event:call.table==='finish_action_notification'?true:[],error:null}));}
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
