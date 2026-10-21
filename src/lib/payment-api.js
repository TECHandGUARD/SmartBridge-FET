import {withTimeout} from './auth-utils.js';
// Cover token acquisition as well as the HTTP request, so a stalled session or
// connection cannot leave checkout or gateway administration spinning forever.
export async function invokePayment(client,name,body,{timeout=20000}={}){
 const controller=new AbortController();
 try{
  const result=await withTimeout(client.functions.invoke(name,{body,signal:controller.signal}),timeout);
  if(result.error){
   let message='Payment service unavailable. Check your connection and retry.';
   try{const details=await withTimeout(result.error.context?.clone().json(),2000);if(typeof details?.error==='string'&&details.error.length<=300)message=details.error;}catch{/* Use a bounded, recoverable error without transport details. */}
   throw new Error(message);
  }
  if(!result.data||typeof result.data!=='object')throw new Error('Payment service returned no result. Please retry.');
  return result;
 }finally{controller.abort();}
}
