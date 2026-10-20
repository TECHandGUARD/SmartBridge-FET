// Small-room mesh. Booking classrooms keep their independent access contract.
const ICE_SERVERS = [{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
export function createMeetingCall({client,meetingId,userId,stream,onRemote,onStatus,onError,presentation}) {
  const sessionId=crypto.randomUUID();
  /** @type {Map<string, any>} */
  const peers=new Map();
  const retired=new Map();
  const seen=new Set();
  let participants=[];
  let active=true,channel,timer,polling=false;
  let queue=Promise.resolve(),cursor=new Date(Date.now()-60000).toISOString(),lastReady=0;
  let videoTrack=stream.getVideoTracks()[0];
  const report=e=>{if(active)onError(e?.message||'Meeting connection interrupted. Try leaving and rejoining.');};
  const send=async(id,kind,payload={})=>{
    if(!active)return;
    const {error}=await client.from('virtual_meeting_signals').insert({meeting_id:meetingId,sender_id:userId,recipient_id:id,kind,
      payload:{...payload,session_id:sessionId,target_session:kind==='ready'&&!payload.ack?null:peers.get(id)?.session}});
    if(error)throw error;
  };
  const remove=id=>{presentation?.detach(id);const p=peers.get(id);p?.pc.close();peers.delete(id);onRemote(id,null,'Left');};
  const makePeer=(id,remoteSession)=>{
    const previous=peers.get(id);
    if(previous){if(!retired.has(id))retired.set(id,new Set());retired.get(id).add(previous.session);remove(id);}
    const pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
    const p={pc,session:remoteSession,pending:[],offered:false};peers.set(id,p);
    presentation?.attach(pc,id,userId<id);
    stream.getTracks().forEach(track=>pc.addTrack(track.kind==='video'?videoTrack:track,stream));
    pc.ontrack=e=>{if(active&&peers.get(id)===p)onRemote(id,e.streams[0],'Connecting');};
    pc.onicecandidate=e=>{if(e.candidate&&active&&peers.get(id)===p)send(id,'ice',{candidate:e.candidate.toJSON()}).catch(report);};
    pc.onconnectionstatechange=()=>{
      if(!active||peers.get(id)!==p)return;
      onStatus(id,pc.connectionState);
      if(pc.connectionState==='failed')onError('A participant could not connect on this network. Leave and rejoin; restrictive networks may need a TURN relay.');
    };
    return p;
  };
  const handle=async m=>{
    if(!active||m.meeting_id!==meetingId||m.recipient_id!==userId||!participants.includes(m.sender_id)||seen.has(m.id))return;
    const payload=m.payload||{},id=m.sender_id;
    if(!payload.session_id||retired.get(id)?.has(payload.session_id)||(payload.target_session&&payload.target_session!==sessionId))return;
    let p=peers.get(id);
    if(m.kind!=='ready'&&(!p||payload.target_session!==sessionId||p.session!==payload.session_id))return;
    seen.add(m.id);
    if(m.kind==='ready') {
      if(!p||p.session!==payload.session_id)p=makePeer(id,payload.session_id);
      if(!payload.ack)await send(id,'ready',{ack:true});
      // Exactly one participant offers for each pair, avoiding offer collisions.
      if(userId<id&&!p.offered){
        p.offered=true;
        try{await p.pc.setLocalDescription(await p.pc.createOffer());if(active&&peers.get(id)===p)await send(id,'offer',{sdp:p.pc.localDescription.sdp});}
        catch(e){p.offered=false;if(p.pc.signalingState==='have-local-offer')await p.pc.setLocalDescription({type:'rollback'}).catch(()=>{});throw e;}
      }
    } else if(m.kind==='offer'&&userId>id&&p.pc.signalingState==='stable') {
      await p.pc.setRemoteDescription({type:'offer',sdp:payload.sdp});
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
      const {data,error}=await client.from('virtual_meeting_signals').select('*').eq('meeting_id',meetingId).eq('recipient_id',userId)
        .gte('created_at',cursor).order('created_at',{ascending:true}).order('id',{ascending:true}).limit(1000);
      if(error)throw error;if(!active)return;
      for(const row of data||[])await enqueue(row);
      if(data?.length)cursor=new Date(new Date(data.at(-1).created_at).getTime()-1000).toISOString();
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
        .on('postgres_changes',{event:'INSERT',schema:'public',table:'virtual_meeting_signals',filter:'meeting_id=eq.'+meetingId},event=>{enqueue(event.new);})
        .subscribe(state=>{if(state==='SUBSCRIBED')recover();});
      timer=setInterval(recover,2000);recover();
    },
    setParticipants(ids){
      participants=ids.filter(id=>id!==userId);
      for(const id of peers.keys())if(!participants.includes(id))remove(id);
    },
    async replaceVideo(track){
      videoTrack=track;
      await Promise.all([...peers.values()].map(p=>p.pc.getSenders().find(s=>s.track?.kind==='video')?.replaceTrack(track)));
    },
    stop(){
      if(!active)return;
      for(const id of peers.keys())send(id,'leave').catch(()=>{});
      active=false;clearInterval(timer);if(channel)client.removeChannel(channel);
      for(const id of [...peers.keys()])remove(id);
    }
  };
}
