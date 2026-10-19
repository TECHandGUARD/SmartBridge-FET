import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const request=(body={},headers={Authorization:'Bearer test'})=>new Request('https://example.test/function',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
const active={id:'user-id',email:'user@example.test',role:'student',is_active:true};
const groq=(text)=>Response.json({choices:[{message:{content:text}}]});

test('study APIs retain text and structured contracts while rejecting caller-selected models and invalid provider content',async()=>{
 const calls=[];const client=fakeClient(active);const runtime=edgeRuntime('invokeLLM',{client,fetch:async(url,options)=>{calls.push({url,options});return groq('An explanation');}});
 let response=await runtime.handle(request({prompt:'Explain algebra',task:'study-assistant'}));assert.equal(response.status,200);assert.equal((await response.json()).response,'An explanation');
 assert.equal(calls[0].options.headers.Authorization,'Bearer model-test-key');assert.ok(JSON.parse(calls[0].options.body).messages[0].content.includes('educational assistant'));
 response=await runtime.handle(request({prompt:'Explain algebra',model:'any-model'}));assert.equal(response.status,400);assert.equal(calls.length,1);
 const plan={weekly_plan:[{day:'Monday',date:'2026-10-13',total_hours:1,sessions:[{time:'14:00',subject:'Math',duration_min:60,focus:'Algebra',priority:'High'}]}],tips:['Take breaks'],summary:'A plan'};
 const structured=edgeRuntime('invokeLLM',{client:fakeClient(active),fetch:async()=>groq(JSON.stringify(plan))});response=await structured.handle(request({prompt:'Plan my week',task:'study-plan'}));assert.deepEqual(await response.json(),plan);
 const invalid=edgeRuntime('invokeLLM',{client:fakeClient(active),fetch:async()=>groq('{"weekly_plan":"bad"}')});assert.equal((await invalid.handle(request({prompt:'Plan',task:'study-plan'}))).status,502);
});

test('quota exhaustion, invalid JSON and oversized bodies fail before provider calls',async()=>{
 const client=fakeClient(active);client.rpc=async()=>({data:false,error:null});const runtime=edgeRuntime('invokeLLM',{client});
 assert.equal((await runtime.handle(request({prompt:'Explain algebra'}))).status,429);
 assert.equal((await runtime.handle(request({prompt:'a'.repeat(40000)}))).status,413);
 assert.equal((await runtime.handle(new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:'{invalid'}))).status,400);
 const missing=fakeClient(active);missing.rpc=async()=>({error:{message:'missing'}});assert.equal((await edgeRuntime('invokeLLM',{client:missing}).handle(request({prompt:'Explain'}))).status,503);
});

test('lesson generation requires a verified tutor and valid grade and returns editable draft fields',async()=>{
 assert.equal((await edgeRuntime('generateLessonPlan',{client:fakeClient(active)}).handle(request({subject:'Math',topic:'Algebra',grade:'Grade 12'}))).status,403);
 const lesson={objectives:['Solve equations'],resources:['Textbook'],homework:'Practise',notes:'Review understanding'};
 const runtime=edgeRuntime('generateLessonPlan',{client:fakeClient({...active,role:'tutor',is_verified:true}),fetch:async()=>groq(JSON.stringify(lesson))});
 assert.equal((await runtime.handle(request({subject:'Math',topic:'Algebra',grade:'Grade 9'}))).status,400);
 assert.deepEqual(await (await runtime.handle(request({subject:'Math',topic:'Algebra',grade:'Grade 12'}))).json(),lesson);
});

test('ordinary users cannot use arbitrary email recipients; administrators preserve plain text and HTML delivery contracts',async()=>{
 assert.equal((await edgeRuntime('sendEmail',{client:fakeClient(active)}).handle(request({to:'victim@example.test',subject:'Spam',body:'Spam'}))).status,403);
 const sends=[];const runtime=edgeRuntime('sendEmail',{client:fakeClient({...active,role:'admin'}),fetch:async(url,options)=>{sends.push(JSON.parse(options.body));return Response.json({id:'email-1'});}});
 const response=await runtime.handle(request({to:'recipient@example.test',subject:'Report',body:'Plain text',html:'<p>Report</p>',from_name:'Spoofed sender'}));
 assert.equal(response.status,200);assert.deepEqual(sends[0].to,['recipient@example.test']);assert.equal(sends[0].text,'Plain text');assert.equal(sends[0].from,'SmartBridge <noreply@example.test>');assert.equal((await response.json()).status,'accepted');
});

test('parent reports require an approved learner link and derive content and recipient on the server',async()=>{
 const profile=call=>call.filters.some(([key])=>key==='email')?{id:'learner-id',email:'learner@example.test',role:'student',is_active:true}:{...active,role:'parent'};
 const denied=fakeClient(profile,()=>({data:null,error:null}));assert.equal((await edgeRuntime('sendEmail',{client:denied}).handle(request({kind:'parent-report',student_email:'learner@example.test'}))).status,404);
 const sends=[];const client=fakeClient(profile,call=>({data:call.table==='parent_student_links'?{id:'approved-link'}:[{subject:'Math',grade:'Grade 12',study_sessions:3}],error:null}));
 const response=await edgeRuntime('sendEmail',{client,fetch:async(url,options)=>{sends.push(JSON.parse(options.body));return Response.json({id:'email-1'});}}).handle(request({kind:'parent-report',student_email:'learner@example.test',to:'attacker@example.test',body:'Forged progress'}));
 assert.equal(response.status,200);assert.deepEqual(sends[0].to,['user@example.test']);assert.match(sends[0].text,/3 completed/);assert.ok(!sends[0].text.includes('Forged progress'));
 assert.ok(client.calls.find(c=>c.table==='parent_student_links').filters.some(([k,v])=>k==='status'&&v==='approved'));
});

test('booking notifications reject unowned records and derive the recipient from the owned booking',async()=>{
 const tutor={...active,role:'tutor',is_verified:true};const id='00000000-0000-4000-8000-000000000201';
 const denied=fakeClient(tutor,()=>({data:null,error:null}));assert.equal((await edgeRuntime('sendEmail',{client:denied}).handle(request({kind:'booking-status',booking_id:id}))).status,404);
 const client=fakeClient(call=>call.filters.some(([k,v])=>k==='id'&&v==='learner-id')?{...active,id:'learner-id',email:'learner@example.test'}:tutor,call=>({data:call.table==='tutor_bookings'?{id,tutor_id:'user-id',student_id:'learner-id',status:'confirmed',subject:'Math',date:'2026-10-13',time:'14:00'}:null,error:null}));
 const sends=[];assert.equal((await edgeRuntime('sendEmail',{client,fetch:async(url,options)=>{sends.push(JSON.parse(options.body));return Response.json({id:'email-1'});}}).handle(request({kind:'booking-status',booking_id:id,to:'attacker@example.test'}))).status,200);
 assert.deepEqual(sends[0].to,['learner@example.test']);assert.ok(client.calls.find(c=>c.table==='tutor_bookings').filters.some(([k,v])=>k==='tutor_id'&&v==='user-id'));
});

const paymentEnv={PAYMENTS_API_ENABLED:'true',YOCO_MODE:'test',YOCO_SECRET_KEY:'sk_test_isolated',PAYMENT_STUDENT_AMOUNT_CENTS:'2000',YOCO_WEBHOOK_SECRET:'whsec_'+Buffer.from('isolated-signature-test-secret').toString('base64')};
test('checkout ignores browser authority and sends a stable intent, server amount and trusted callbacks',async()=>{
 const calls=[],rpc=[];const client=fakeClient(active,call=>({data:call.table==='payment_gateway_settings'?{provider:'yoco',enabled:true,mode:'test',priority:0}:call.table==='subscription_prices'?{amount_cents:2000}:[],error:null}));client.rpc=async(name,args)=>{rpc.push({name,args});return {data:name==='consume_api_quota'?true:{id:args.request_id,status:'pending',amount_cents:2000,mode:'test'},error:null};};
 const runtime=edgeRuntime('createCheckout',{client,env:paymentEnv,fetch:async(url,options)=>{calls.push({url,options});return Response.json({id:'ch-test',amount:2000,currency:'ZAR',processingMode:'test',redirectUrl:'https://c.yoco.com/checkout/test'});}});
 const id='00000000-0000-4000-8000-000000000501';for(let i=0;i<2;i++)assert.equal((await runtime.handle(request({product:'student',request_id:id}))).status,200);
 assert.equal(calls[0].options.headers['Idempotency-Key'],calls[1].options.headers['Idempotency-Key']);const payload=JSON.parse(calls[0].options.body);assert.equal(payload.amount,2000);assert.match(payload.successUrl,/staging.example.test/);
 assert.equal((await runtime.handle(request({product:'student',request_id:id,amount:1}))).status,400);
 assert.equal((await runtime.handle(request({product:'__proto__',request_id:id}))).status,400);
 assert.equal((await edgeRuntime('createCheckout',{client}).handle(request({product:'student',request_id:id}))).status,503);
});

function signedRequest(event,{timestamp=String(Math.floor(Date.now()/1000)),raw=JSON.stringify(event),secret=Buffer.from('isolated-signature-test-secret')}={}){
 const id='delivery-id';const signature=createHmac('sha256',secret).update(`${id}.${timestamp}.${raw}`).digest('base64');return new Request('https://example.test/webhook',{method:'POST',headers:{'Content-Type':'application/json','webhook-id':id,'webhook-timestamp':timestamp,'webhook-signature':`v1,${signature}`},body:raw});
}
test('Yoco webhook rejects forged, expired, wrong-mode and malformed payments before database fulfillment',async()=>{
 const client=fakeClient();const calls=[];client.rpc=async(name,args)=>{calls.push({name,args});return {data:{success:true},error:null};};const runtime=edgeRuntime('yocoWebhook',{client,env:paymentEnv});
 const event={id:'event-id',type:'payment.succeeded',payload:{id:'payment-id',type:'payment',status:'succeeded',mode:'test',amount:2000,currency:'ZAR',metadata:{checkoutId:'ch-test'}}};
 assert.equal((await runtime.handle(request(event,{}))).status,401);
 assert.equal((await runtime.handle(signedRequest(event,{timestamp:'1'}))).status,401);
 assert.equal((await runtime.handle(signedRequest(event,{secret:Buffer.from('attacker-key')}))).status,401);
 assert.equal((await runtime.handle(signedRequest({...event,payload:{...event.payload,mode:'live'}}))).status,503);
 assert.equal((await runtime.handle(signedRequest({...event,payload:{...event.payload,amount:1}}))).status,400);assert.equal(calls.length,0);
 assert.equal((await runtime.handle(signedRequest(event))).status,200);assert.equal(calls[0].name,'fulfill_gateway_payment');assert.equal(calls[0].args.checkout_key,'ch-test');
});

test('Resend delivery callbacks verify Svix signatures before writing tracking and suppression events',async()=>{
 const calls=[];const client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{received:true},error:null};};
 const runtime=edgeRuntime('resendWebhook',{client,env:{RESEND_WEBHOOK_SECRET:paymentEnv.YOCO_WEBHOOK_SECRET}});
 const event={type:'email.bounced',created_at:new Date().toISOString(),data:{email_id:'email-1',to:['User@Example.test']}};
 const signed=signedRequest(event);const headers=new Headers({'Content-Type':'application/json'});for(const key of ['id','timestamp','signature'])headers.set(`svix-${key}`,signed.headers.get(`webhook-${key}`));
 assert.equal((await runtime.handle(request(event,{}))).status,401);
 assert.equal((await runtime.handle(new Request('https://example.test',{method:'POST',headers,body:JSON.stringify(event)}))).status,200);
 assert.equal(calls[0].name,'record_email_event');assert.deepEqual(Array.from(calls[0].args.recipient_emails),['user@example.test']);
});

test('suppressed recipients block provider sending and acceptance is recorded without claiming delivery',async()=>{
 const client=fakeClient();client.rpc=async()=>({data:false,error:null});
 const runtime=edgeRuntime(null,{client});await assert.rejects(()=>runtime.email.emailFetch({method:'POST',body:JSON.stringify({from:'noreply@example.test',to:['blocked@example.test'],subject:'Test',text:'Test'})},client),/suppressed/);
 const calls=[];const accepting=fakeClient();accepting.rpc=async(name,args)=>{calls.push({name,args});return {data:true,error:null};};
 const response=await edgeRuntime(null,{client:accepting,fetch:async()=>Response.json({id:'accepted-email'})}).email.emailFetch({method:'POST',body:JSON.stringify({from:'noreply@example.test',to:['user@example.test'],subject:'Test',text:'Test'})},accepting);
 assert.equal(response.status,200);assert.equal(calls[1].name,'record_email_acceptance');assert.equal(calls[1].args.provider_id,'accepted-email');
});
