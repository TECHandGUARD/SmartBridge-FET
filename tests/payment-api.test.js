import test from 'node:test';
import assert from 'node:assert/strict';
import {invokePayment} from '../src/lib/payment-api.js';
test('payment requests time out even when session acquisition never settles, and abort their eventual fetch',async()=>{
 let signal;
 const client={functions:{invoke(_name,options){signal=options.signal;return new Promise(()=>{});}}};
 await assert.rejects(invokePayment(client,'payment-gateways',{}, {timeout:10}),/timed out/);assert.equal(signal.aborted,true);
});
test('payment wrapper returns valid catalogues, preserves safe API errors and rejects missing results',async()=>{
 const data={checkout_active:true,gateways:[{provider:'yoco'}]};
 assert.deepEqual((await invokePayment({functions:{invoke:async()=>({data,error:null})}},'payment-gateways',{})).data,data);
 await assert.rejects(invokePayment({functions:{invoke:async()=>({error:{context:Response.json({error:'Yoco requires a payment of at least R2.'})}})}},'create-checkout',{}),/at least R2/);
 await assert.rejects(invokePayment({functions:{invoke:async()=>({data:null,error:null})}},'payment-gateways',{}),/no result/);
 await assert.rejects(invokePayment({functions:{invoke:async()=>({error:{context:new Response('not json')}})}},'payment-gateways',{}),/Payment service unavailable/);
});
