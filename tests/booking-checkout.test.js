import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const id='00000000-0000-4000-8000-000000009901';
const request=body=>new Request('https://example.supabase.co/functions/v1/create-checkout',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify(body)});
const env={PAYMENTS_API_ENABLED:'true',YOCO_MODE:'test',YOCO_SECRET_KEY:'sk_test_test',YOCO_WEBHOOK_SECRET:'whsec_test'};
test('booking checkout uses its owned server quote and returns to bookings instead of subscriptions',async()=>{
 let sent;
 const client=fakeClient(undefined,call=>{
  if(call.table==='payment_gateway_settings')return {data:{enabled:true,mode:'test'},error:null};
  if(call.table==='create_booking_payment_order')return {data:{id,user_id:'user-id',product:'booking',booking_id:id,amount_cents:15000,mode:'test',status:'pending'},error:null};
  return {data:true,error:null};
 });
 const runtime=edgeRuntime('createCheckout',{client,env,fetch:async(url,options)=>{sent=JSON.parse(options.body);return new Response(JSON.stringify({id:'checkout-test',amount:15000,currency:'ZAR',processingMode:'test',redirectUrl:'https://c.yoco.com/checkout/test'}));}});
 const result=await runtime.handle(request({product:'booking',booking_id:id,request_id:id,gateway:'yoco'}));
 assert.equal(result.status,200,await result.clone().text());
 assert.equal(sent.amount,15000);assert.match(sent.successUrl,/\/bookings\?booking=.*payment=processing/);
 assert.equal(client.calls.some(call=>call.table==='create_gateway_payment_order'),false);
 assert.equal(client.calls.find(call=>call.table==='create_booking_payment_order').data.booking_key,id);
});
test('booking checkout rejects a client price and refunds require administrator authority',async()=>{
 const client=fakeClient();
 const runtime=edgeRuntime('createCheckout',{client,env});
 assert.equal((await runtime.handle(request({product:'booking',booking_id:id,request_id:id,amount:1}))).status,400);
 assert.equal((await runtime.handle(request({action:'refund_booking',booking_id:id}))).status,403);
 assert.equal(client.calls.some(call=>call.table==='prepare_booking_refund'),false);
});
for(const scenario of ['succeeded','pending','rejected','mismatch','unavailable'])test(`booking refund ${scenario} preserves provider confirmation boundary`,async()=>{
 const client=fakeClient({id:'user-id',role:'admin',is_active:true},call=>call.table==='prepare_booking_refund'?{data:{id,checkout_id:'ch-test',amount_cents:15000,mode:'test',currency:'ZAR',refund_status:'requested'},error:null}:{data:true,error:null});
 let key;
 const runtime=edgeRuntime('createCheckout',{client,env,fetch:async(url,options)=>{
  key=options.headers['Idempotency-Key'];assert.equal(JSON.parse(options.body).amount,15000);
  if(scenario==='unavailable')throw new Error('network');
  if(scenario==='rejected')return Response.json({code:'refund_unavailable'},{status:422});
  return Response.json({id:scenario==='mismatch'?'other-checkout':'ch-test',refundId:'rfd-test',status:scenario==='pending'?'pending':'succeeded'});
 }});
 const result=await runtime.handle(request({action:'refund_booking',booking_id:id}));
 assert.equal(key,`smartbridge-refund-${id}`);
 const settle=client.calls.find(call=>call.table==='settle_booking_refund');
 if(['succeeded','pending'].includes(scenario)){
  assert.equal(result.status,200);assert.equal(settle.data.settled,scenario==='succeeded');
 }else{assert.equal(result.status,scenario==='unavailable'?503:502);assert.equal(settle,undefined);}
});
