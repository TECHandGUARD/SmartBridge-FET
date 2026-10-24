export async function sendInstantCallSignal(client,callId,recipient,kind,payload){
  const {error}=await client.rpc('send_instant_adult_signal',{call_key:callId,recipient,signal_kind:kind,signal_payload:payload});
  if(error)throw error;
}
