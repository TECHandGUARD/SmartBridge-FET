export const DEFAULT_ICE_SERVERS=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
export const CALL_QUALITY={saver:{video:180000,audio:24000,fps:10,scale:2},balanced:{video:500000,audio:32000,fps:15,scale:1}};
const cached=new Map();
export function validRelayServers(value){
 if(!Array.isArray(value)||value.length>10)return [];
 return value.filter(server=>server&&typeof server.username==='string'&&server.username.length<2048&&typeof server.credential==='string'&&server.credential.length<4096&&Array.isArray(server.urls)&&server.urls.length>0&&server.urls.every(url=>typeof url==='string'&&/^turns?:[a-z0-9.-]+:\d+(?:\?transport=(?:udp|tcp))?$/i.test(url)));
}
export async function getCallIceConfig(client,roomKind,roomId,{force=false,endpoint=import.meta.env?.VITE_CALL_RELAY_URL}={}){
 const direct={iceServers:DEFAULT_ICE_SERVERS,relayAvailable:false,expiresAt:0};
 if(!endpoint)return direct;
 try{
  const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw new Error('Invalid relay endpoint');
  const {data,error}=await client.auth.getSession();if(error||!data?.session?.access_token)throw new Error('Sign in before connecting');
  const key=data.session.user.id+':'+roomKind+':'+roomId;
  const previous=cached.get(key);if(!force&&previous?.expiresAt>Date.now()+30000)return previous;
  const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({room_kind:roomKind,room_id:roomId}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('Relay unavailable');
  const body=await response.json(),servers=validRelayServers(body.iceServers);
  if(!servers.length||!Number.isFinite(body.expires_in)||body.expires_in<30)throw new Error('Invalid relay response');
  const config={iceServers:[...DEFAULT_ICE_SERVERS,...servers],relayAvailable:true,expiresAt:Date.now()+Math.min(body.expires_in,300)*1000};cached.set(key,config);if(cached.size>30)cached.delete(cached.keys().next().value);return config;
 }catch{return {...direct,warning:'The relay is temporarily unavailable. Direct connections may not work on this network.'};}
}
export async function applyCallQuality(pc,quality='saver'){
 const profile=CALL_QUALITY[quality]||CALL_QUALITY.saver;
 await Promise.all(pc.getSenders().filter(sender=>sender.track).map(async sender=>{
  try{const parameters=sender.getParameters();if(!parameters.encodings?.length)return;
   parameters.encodings.forEach(encoding=>{encoding.maxBitrate=sender.track.kind==='video'?profile.video:profile.audio;if(sender.track.kind==='video'){encoding.maxFramerate=profile.fps;encoding.scaleResolutionDownBy=profile.scale;}});
   await sender.setParameters(parameters);
  }catch{/* Unsupported controls retain the browser's negotiated encoding. */}
 }));
}
export async function selectedCallRoute(pc){
 const stats=await pc.getStats();let pair;
 for(const report of stats.values())if(report.type==='transport'&&report.selectedCandidatePairId)pair=stats.get(report.selectedCandidatePairId);
 if(!pair)for(const report of stats.values())if(report.type==='candidate-pair'&&report.state==='succeeded'&&report.nominated)pair=report;
 const local=pair&&stats.get(pair.localCandidateId),remote=pair&&stats.get(pair.remoteCandidateId);
 return local?.candidateType==='relay'||remote?.candidateType==='relay'?'relay':'direct';
}
