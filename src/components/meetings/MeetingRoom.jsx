import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createMeetingCall} from '@/lib/meeting-call';

function ParticipantVideo({stream,label,muted=false}) {
  const video=useRef(null);
  useEffect(()=>{if(video.current)video.current.srcObject=stream||null;},[stream]);
  return <div className="overflow-hidden rounded-xl bg-slate-900 text-white"><video ref={video} autoPlay playsInline muted={muted} aria-label={label} className="h-52 w-full object-contain"/><p className="px-3 py-2 text-sm">{label}</p></div>;
}
export default function MeetingRoom({meeting,user,onRefresh}) {
  const [joined,setJoined]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [local,setLocal]=useState(null),[remote,setRemote]=useState({}),[statuses,setStatuses]=useState({});
  const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[sharing,setSharing]=useState(false);
  const stream=useRef(null),screen=useRef(null),call=useRef(null),generation=useRef(0),joining=useRef(false),sharePending=useRef(false);
  const stop=useCallback(()=>{
    generation.current++;joining.current=false;call.current?.stop();call.current=null;
    screen.current?.getTracks().forEach(t=>t.stop());screen.current=null;
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    setJoined(false);setBusy(false);setLocal(null);setRemote({});setStatuses({});setMuted(false);setCameraOff(false);setSharing(false);
  },[]);
  useEffect(()=>()=>stop(),[meeting.id,user.id,stop]);
  const accepted=meeting.participants.filter(p=>p.response==='accepted').map(p=>p.user_id);
  const signature=accepted.join(',');
  useEffect(()=>{call.current?.setParticipants(signature.split(','));},[signature]);
  useEffect(()=>{if(!meeting.can_join){stop();}},[meeting.can_join,stop]);
  const join=async()=>{
    if(joining.current||call.current||!meeting.can_join)return;
    joining.current=true;setBusy(true);setError('');const attempt=++generation.current;
    try{
      const {data,error:accessError}=await supabase.rpc('virtual_meeting_details',{meeting_key:meeting.id});
      if(accessError||!data?.can_join)throw new Error('Accept the invitation and join within the scheduled meeting window.');
      if(attempt!==generation.current)return;
      if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)throw new Error('Use a current browser with camera and microphone support.');
      const media=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{width:{ideal:640},height:{ideal:360},frameRate:{ideal:15,max:20}}});
      if(attempt!==generation.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;setLocal(media);
      call.current=createMeetingCall({client:supabase,meetingId:meeting.id,userId:user.id,stream:media,
        onRemote:(id,value)=>setRemote(previous=>({...previous,[id]:value})),
        onStatus:(id,value)=>{setStatuses(previous=>({...previous,[id]:value}));if(value==='connected')setError('');},onError:setError});
      call.current.start(data.participants.filter(p=>p.response==='accepted').map(p=>p.user_id));setJoined(true);
    }catch(e){if(attempt===generation.current){stop();setError(e.message);}}
    finally{if(attempt===generation.current){joining.current=false;setBusy(false);}}
  };
  const stopSharing=async()=>{
    const media=screen.current;screen.current=null;media?.getTracks().forEach(t=>t.stop());
    const camera=stream.current?.getVideoTracks()[0];if(camera&&call.current)await call.current.replaceVideo(camera);
    setSharing(false);
  };
  const share=async()=>{
    if(sharePending.current)return;
    if(screen.current){await stopSharing();return;}
    if(!navigator.mediaDevices?.getDisplayMedia){setError('Screen sharing is unavailable on this device.');return;}
    sharePending.current=true;const attempt=generation.current;
    try{const media=await navigator.mediaDevices.getDisplayMedia({video:true});
      if(attempt!==generation.current||!call.current){media.getTracks().forEach(t=>t.stop());return;}
      screen.current=media;const track=media.getVideoTracks()[0];track.onended=()=>{stopSharing().catch(e=>setError(e.message));};
      await call.current.replaceVideo(track);setSharing(true);
    }catch(e){await stopSharing().catch(()=>{});setError(e.message);}finally{sharePending.current=false;}
  };
  const close=async()=>{
    setBusy(true);try{const {error:closeError}=await supabase.rpc('close_virtual_meeting',{meeting_key:meeting.id,decision:'ended'});if(closeError)throw closeError;stop();await onRefresh();}catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6" aria-label="Meeting room">
    <p className="text-sm text-muted-foreground">Private meeting · up to 6 participants · no recording</p>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!meeting.can_join&&<p role="status">Accept your invitation to join. Rooms open 20 minutes before the scheduled start and close 30 minutes after the end, or when the host ends the meeting.</p>}
    {joined&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ParticipantVideo stream={local} label="You" muted/>
      {meeting.participants.filter(p=>p.user_id!==user.id&&p.response==='accepted').map(p=><div key={p.user_id}><ParticipantVideo stream={remote[p.user_id]} label={p.full_name||'Participant'}/><p className="mt-1 text-xs">{statuses[p.user_id]||'Waiting to join'}</p></div>)}
    </div>}
    <div className="flex flex-wrap gap-2">
      {!joined?<button className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!meeting.can_join||busy} onClick={join}>{busy?'Connecting…':'Join meeting'}</button>:<>
        <button className="rounded-lg border px-4 py-2" onClick={()=>{const track=stream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled);}}}>{muted?'Unmute':'Mute'}</button>
        <button className="rounded-lg border px-4 py-2" onClick={()=>{const track=stream.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCameraOff(!track.enabled);}}}>{cameraOff?'Camera on':'Camera off'}</button>
        <button className="rounded-lg border px-4 py-2" onClick={share}>{sharing?'Stop sharing':'Share screen'}</button>
        <button className="rounded-lg bg-red-600 px-4 py-2 text-white" onClick={stop}>Leave meeting</button>
        {meeting.host_id===user.id&&<button className="rounded-lg border border-red-400 px-4 py-2" disabled={busy} onClick={close}>End for everyone</button>}
      </>}
    </div>
    <p className="text-xs text-muted-foreground">Small-group video uses more data as people join. Some mobile or school networks may prevent a direct connection.</p>
  </section>;
}
