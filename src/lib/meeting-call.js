// Small-room mesh. Booking classrooms keep their independent access contract.
import {DEFAULT_ICE_SERVERS,applyCallQuality,selectedCallRoute} from './call-network';
export function createMeetingCall({client,meetingId,userId,stream,onRemote,onStatus,onError,presentation=null,reactions=null,chat=null,iceConfig={iceServers:DEFAULT_ICE_SERVERS,relayAvailable:false,expiresAt:0},getIceConfig=null,relayOnly=false,receiveVideo=true,quality='saver',signalTable='virtual_meeting_signals',onRoute=(_id,_route)=>{}}) {
  if(!['virtual_meeting_signals','instant_adult_call_signals'].includes(signalTable))throw new Error('Invalid signaling transport');
  const sessionId=crypto.randomUUID();
  const browserConnection=/** @type {any} */(navigator).connection;
  /** @type {Map<string, any>} */
  const peers=new Map();
  const retired=new Map();
  const seen=new Set();
  let participants=[];
  let active=true,channel,timer,polling=false;
  let queue=Promise.resolve(),cursor=new Date(Date.now()-60000).toISOString(),lastReady=0;
  let currentQuality=quality;
  let videoTrack=stream.getVideoTracks()[0];
  const report=e=>{if(active)onError(e?.message||'Meeting connection interrupted. Try leaving and rejoining.');};
  const send=async(id,kind,payload={})=>{
    if(!active)return;
    const payloadWithSession={...payload,session_id:sessionId,target_session:kind==='ready'&&!payload.ack?null:peers.get(id)?.session};
    const {error}=signalTable==='instant_adult_call_signals' ? await client.rpc('send_instant_adult_signal',{call_key:meetingId,recipient:id,signal_kind:kind,signal_payload:payloadWithSession}) : await client.from(signalTable).insert({meeting_id:meetingId,sender_id:userId,recipient_id:id,kind,payload:payloadWithSession});
    if(error)throw error;
  };
  const remove=id=>{clearTimeout(peers.get(id)?.restartTimer);presentation?.detach(id);reactions?.detach(id);chat?.detach(id);const p=peers.get(id);p?.pc.close();peers.delete(id);onRemote(id,null,'Left');onStatus(id,'Left');};
  const requestRestart=(id,p)=>{
    if(!active||peers.get(id)!==p||Date.now()-(p.lastRestart||0)<8000)return;
    p.lastRestart=Date.now();
    queue=queue.then(async()=>{
      if(!active||peers.get(id)!==p)return;
      if(getIceConfig){const fresh=await getIceConfig();if(fresh.relayAvailable||!iceConfig.relayAvailable)iceConfig=fresh;if(!active||peers.get(id)!==p)return;p.pc.setConfiguration({iceServers:iceConfig.iceServers,iceTransportPolicy:relayOnly?'relay':'all'});}
      if(userId<id&&p.pc.signalingState==='stable'){
        await p.pc.setLocalDescription(await p.pc.createOffer({iceRestart:true}));
        if(active&&peers.get(id)===p)await send(id,'offer',{sdp:p.pc.localDescription.sdp});
      }else if(userId>id)await send(id,'ready',{restart:true});
    }).catch(report);
  };
  const resume=()=>{recover();for(const [id,p] of peers)requestRestart(id,p);};
  const visible=()=>{if(document.visibilityState==='visible'){recover();for(const [id,p] of peers)if(p.pc.connectionState!=='connected')requestRestart(id,p);}};
  const makePeer=(id,remoteSession)=>{
    const previous=peers.get(id);
    if(previous){if(!retired.has(id))retired.set(id,new Set());retired.get(id).add(previous.session);remove(id);}
    const pc=new RTCPeerConnection({iceServers:iceConfig.iceServers,iceTransportPolicy:relayOnly?'relay':'all'});
    const p={pc,session:remoteSession,pending:[],offered:false,lastRestart:0,created:Date.now(),restartTimer:null};peers.set(id,p);
    presentation?.attach(pc,id,userId<id);
    reactions?.attach(pc,id,userId<id);
    chat?.attach(pc,id,userId<id);
    stream.getTracks().forEach(track=>pc.addTrack(track.kind==='video'?videoTrack:track,stream));
    for(const kind of ['audio','video'])if(!stream.getTracks().some(track=>track.kind===kind))pc.addTransceiver(kind,{direction:kind==='video'&&!receiveVideo?'inactive':'recvonly'});
    pc.ontrack=e=>{if(active&&peers.get(id)===p)onRemote(id,e.streams[0],'Connecting');};
    pc.onicecandidate=e=>{if(e.candidate&&active&&peers.get(id)===p)send(id,'ice',{candidate:e.candidate.toJSON()}).catch(report);};
    pc.onconnectionstatechange=()=>{
      if(!active||peers.get(id)!==p)return;
      onStatus(id,pc.connectionState);
      if(pc.connectionState==='connected'){clearTimeout(p.restartTimer);p.restartTimer=null;applyCallQuality(pc,currentQuality);selectedCallRoute(pc).then(route=>{if(active&&peers.get(id)===p)onRoute(id,route);}).catch(()=>{});}
      if(['failed','disconnected'].includes(pc.connectionState)&&!p.restartTimer){p.restartTimer=setTimeout(()=>{p.restartTimer=null;requestRestart(id,p);},pc.connectionState==='failed'?500:3000);}
      if(pc.connectionState==='failed')onError('Reconnecting this participant. If the network stays blocked, try relay connection mode or audio and slides.');
    };
    pc.oniceconnectionstatechange=pc.onconnectionstatechange;
    return p;
  };
  const handle=async m=>{
    if(!active||m.meeting_id!==meetingId||m.recipient_id!==userId||!participants.includes(m.sender_id)||seen.has(m.id))return;
    const payload=m.payload||{},id=m.sender_id;
    if(!payload.session_id||retired.get(id)?.has(payload.session_id)||(payload.target_session&&payload.target_session!==sessionId))return;
    let p=peers.get(id);
    if(m.kind!=='ready'&&(!p||payload.target_session!==sessionId||p.session!==payload.session_id))return;
    seen.add(m.id);
    if((m.kind==='ready'||m.kind==='offer')&&getIceConfig&&(!iceConfig.expiresAt||iceConfig.expiresAt<Date.now()+30000)){
      const fresh=await getIceConfig();if(!active)return;if(fresh.relayAvailable||!iceConfig.relayAvailable)iceConfig=fresh;
      if(p)p.pc.setConfiguration({iceServers:iceConfig.iceServers,iceTransportPolicy:relayOnly?'relay':'all'});
    }
    if(m.kind==='ready') {
      if(!p||p.session!==payload.session_id)p=makePeer(id,payload.session_id);
      if(!payload.ack)await send(id,'ready',{ack:true});
      // Exactly one participant offers for each pair, avoiding offer collisions.
      if(payload.restart&&userId<id&&p.offered){requestRestart(id,p);return;}
      if(userId<id&&!p.offered){
        p.offered=true;
        try{await p.pc.setLocalDescription(await p.pc.createOffer());if(active&&peers.get(id)===p)await send(id,'offer',{sdp:p.pc.localDescription.sdp});}
        catch(e){p.offered=false;if(p.pc.signalingState==='have-local-offer')await p.pc.setLocalDescription({type:'rollback'}).catch(()=>{});throw e;}
      }
    } else if(m.kind==='offer'&&userId>id&&p.pc.signalingState==='stable') {
      await p.pc.setRemoteDescription({type:'offer',sdp:payload.sdp});
      if(!receiveVideo)for(const transceiver of p.pc.getTransceivers())if(transceiver.receiver.track.kind==='video')transceiver.direction='inactive';
      for(const candidate of p.pending.splice(0))await p.pc.addIceCandidate(candidate);
      await p.pc.setLocalDescription(await p.pc.createAnswer());
      if(active&&peers.get(id)===p)await send(id,'answer',{sdp:p.pc.localDescription.sdp});
    } else if(m.kind==='answer'&&userId<id&&p.pc.signalingState==='have-local-offer') {
      await p.pc.setRemoteDescription({type:'answer',sdp:payload.sdp});
      for(const candidate of p.pending.splice(0))await p.pc.addIceCandidate(candidate);
    } else if(m.kind==='ice'&&payload.candidate) {
      if(p.pc.remoteDescription)await p.pc.addIceCandidate(payload.candidate);else p.pending.push(payload.candidate);
    } else if(m.kind==='leave') {
      if(!retired.has(id))retired.set(id,new Set());retired.get(id).add(p.session);remove(id);
    }
  };
  const enqueue=m=>{queue=queue.then(()=>handle(m)).catch(report);return queue;};
  const recover=async()=>{
    if(!active||polling)return;polling=true;
    try{
      const {data,error}=await client.from(signalTable).select('*').eq('meeting_id',meetingId).eq('recipient_id',userId)
        .gte('created_at',cursor).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(1000);
      if(error)throw error;if(!active)return;
      for(const row of data||[])await enqueue(row);
      if(data?.length)cursor=new Date(new Date(data.at(-1).created_at).getTime()-1000).toISOString();
      for(const [id,p] of peers)if(Date.now()-p.created>35*60000){p.created=Date.now();requestRestart(id,p);}
      if(Date.now()-lastReady>5000){
        await Promise.all(participants.filter(id=>peers.get(id)?.pc.connectionState!=='connected').map(id=>send(id,'ready').catch(report)));
        lastReady=Date.now();
      }
    }catch(e){report(e);}finally{polling=false;}
  };
  return {
    start(ids){
      participants=ids.filter(id=>id!==userId);
      channel=client.channel('virtual-meeting-'+meetingId+'-'+userId+'-'+sessionId)
        .on('postgres_changes',{event:'INSERT',schema:'public',table:signalTable,filter:'meeting_id=eq.'+meetingId},event=>{enqueue(event.new);})
        .subscribe(state=>{if(state==='SUBSCRIBED')recover();});
      timer=setInterval(recover,2000);window.addEventListener('online',resume);document.addEventListener('visibilitychange',visible);browserConnection?.addEventListener?.('change',resume);recover();
    },
    setParticipants(ids){
      participants=ids.filter(id=>id!==userId);
      for(const id of peers.keys())if(!participants.includes(id))remove(id);
    },
    setQuality(value){currentQuality=value;for(const p of peers.values())applyCallQuality(p.pc,value);},
    reconnect(){resume();},
    async replaceVideo(track){
      videoTrack=track;
      await Promise.all([...peers.values()].map(p=>p.pc.getSenders().find(s=>s.track?.kind==='video')?.replaceTrack(track)));
    },
    stop(){
      if(!active)return;
      for(const id of peers.keys())send(id,'leave').catch(()=>{});
      active=false;window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',visible);browserConnection?.removeEventListener?.('change',resume);clearInterval(timer);if(channel)client.removeChannel(channel);
      for(const id of [...peers.keys()])remove(id);
    }
  };
}
