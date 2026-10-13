export function createClientReporter(client){
 const seen=new Map();
 return async function report(code){
  if(!client||!['render_error','unhandled_rejection','request_error'].includes(code))return;
  if(Date.now()-(seen.get(code)||0)<60000)return;seen.set(code,Date.now());
  try{const {data}=await client.auth.getSession();if(!data?.session)return;await client.rpc('report_client_event',{event_code:code});}catch{/* Reporting must not interrupt recovery. */}
 };
}
export function monitoredFetch(fetcher,report){
 return async(...args)=>{try{const response=await fetcher(...args);if(response.status>=500)report('request_error');return response;}catch(error){report('request_error');throw error;}};
}
