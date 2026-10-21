import test from 'node:test';import assert from 'node:assert/strict';import {createHmac} from 'node:crypto';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const account={id:'user-id',email:'user@example.test',role:'student',is_active:true};
const request=body=>new Request('https://example.test',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json'},body:JSON.stringify(body)});
const settings=[{provider:'yoco',enabled:false,mode:'test',priority:0},{provider:'paystack',enabled:true,mode:'test',priority:1}];
const env={PAYMENTS_API_ENABLED:'true',PAYSTACK_TEST_SECRET_KEY:'sk_test_isolated',SUPABASE_ANON_KEY:'public-test-key',PAYMENT_STUDENT_AMOUNT_CENTS:'2000'};
test('gateway catalog hides disabled/unconfigured providers and never exposes credentials',async()=>{
 const client=fakeClient(account,()=>({data:settings,error:null}));
 const response=await edgeRuntime('paymentGateways',{client,env}).handle(request({action:'list'}));const result=await response.json();
 assert.deepEqual(result.gateways.map(g=>g.provider),['paystack']);assert.ok(!JSON.stringify(result).includes('sk_test'));
 const admin=await edgeRuntime('paymentGateways',{client:fakeClient({...account,role:'admin'},()=>({data:settings,error:null})),env}).handle(request({action:'admin-list'}));const catalog=await admin.json();assert.equal(catalog.gateways.length,2);assert.equal(catalog.gateways[1].live_ready,false);
});
test('only administrators can change gateways and unconfigured modes cannot be enabled',async()=>{
 assert.equal((await edgeRuntime('paymentGateways',{client:fakeClient(account),env}).handle(request({action:'save',provider:'paystack',enabled:true,mode:'test',priority:0}))).status,403);
 const calls=[],client=fakeClient({...account,role:'admin'},()=>({data:settings,error:null}));client.rpc=async(name,args)=>{calls.push({name,args});return {data:true,error:null};};
 const runtime=edgeRuntime('paymentGateways',{client,env});assert.equal((await runtime.handle(request({action:'save',provider:'paystack',enabled:true,mode:'live',priority:0}))).status,409);assert.equal(calls.length,0);
 assert.equal((await runtime.handle(request({action:'save',provider:'custom-url',enabled:true,mode:'test',priority:0}))).status,400);
 assert.equal((await runtime.handle(request({action:'save',provider:'paystack',enabled:true,mode:'test',priority:2}))).status,200);assert.equal(calls[0].name,'set_payment_gateway');assert.ok(!Object.hasOwn(calls[0].args,'actor_id'));
});
test('Paystack initialization uses server pricing, authenticated email and stable references',async()=>{
 const sends=[],rpc=[];const id='00000000-0000-4000-8000-000000000601';const client=fakeClient(account,call=>({data:call.table==='payment_gateway_settings'?settings[1]:call.table==='subscription_prices'?{amount_cents:3750}:[],error:null}));
 client.rpc=async(name,args)=>{rpc.push({name,args});return {data:name==='consume_api_quota'?true:{id,amount_cents:3750,mode:'test',provider:'paystack',status:'pending'},error:null};};
 const runtime=edgeRuntime('createCheckout',{client,env,fetch:async(url,options)=>{sends.push({url,options});return Response.json({status:true,data:{reference:`sb-test-${id}`,authorization_url:'https://checkout.paystack.com/test-checkout'}});}});
 for(let i=0;i<2;i++)assert.equal((await runtime.handle(request({gateway:'paystack',product:'student',request_id:id}))).status,200);
 assert.equal(sends[0].url,'https://api.paystack.co/transaction/initialize');const payload=JSON.parse(sends[0].options.body);assert.equal(payload.email,'user@example.test');assert.equal(payload.amount,3750);assert.equal(payload.currency,'ZAR');assert.equal(payload.reference,JSON.parse(sends[1].options.body).reference);assert.equal(rpc[1].args.provider_key,'paystack');
});
test('Paystack signatures and server verification protect fulfillment even after a gateway is disabled',async()=>{
 const calls=[],client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{success:true},error:null};};
 const event={event:'charge.success',data:{domain:'test',reference:'sb-test-known-order',id:123}},raw=JSON.stringify(event);
 const webhook=(key=env.PAYSTACK_TEST_SECRET_KEY)=>new Request('https://example.test',{method:'POST',headers:{'x-paystack-signature':createHmac('sha512',key).update(raw).digest('hex')},body:raw});
 const runtime=edgeRuntime('paystackWebhook',{client,env:{...env,PAYMENTS_API_ENABLED:'false'},fetch:async()=>Response.json({status:true,data:{domain:'test',reference:event.data.reference,status:'success',id:123,amount:2000,currency:'ZAR'}})});
 assert.equal((await runtime.handle(webhook('forged-key'))).status,401);assert.equal(calls.length,0);
 assert.equal((await runtime.handle(webhook())).status,200);assert.equal(calls[0].args.provider_key,'paystack');assert.equal(calls[0].args.payment_key,'paystack-123');
 const invalid=edgeRuntime('paystackWebhook',{client,env,fetch:async()=>Response.json({status:true,data:{domain:'live',reference:event.data.reference,status:'success',id:123,amount:2000,currency:'ZAR'}})});assert.equal((await invalid.handle(webhook())).status,400);assert.equal(calls.length,1);
});
test('Yoco rejects sub-R2 checkout before contacting the provider and never increases the quoted amount',async()=>{
 let calls=0;const id='00000000-0000-4000-8000-000000000601';
 const client=fakeClient(account,call=>({data:call.table==='payment_gateway_settings'?{provider:'yoco',enabled:true,mode:'live',priority:0}:call.table==='subscription_prices'?{amount_cents:100}:[],error:null}));
 client.rpc=async name=>({data:name==='consume_api_quota'?true:{id,amount_cents:100,mode:'live',provider:'yoco',status:'pending'},error:null});
 const runtime=edgeRuntime('createCheckout',{client,env:{...env,YOCO_LIVE_SECRET_KEY:'sk_live_isolated',YOCO_LIVE_WEBHOOK_SECRET:'whsec_isolated'},fetch:async()=>{calls++;throw new Error('Provider must not be called');}});
 const response=await runtime.handle(request({gateway:'yoco',product:'student',request_id:id}));assert.equal(response.status,422);assert.match((await response.json()).error,/at least R2/);assert.equal(calls,0);
});
