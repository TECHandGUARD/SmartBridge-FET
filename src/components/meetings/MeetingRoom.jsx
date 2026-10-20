import {getCallIceConfig} from '@/lib/call-network';
import CallNetworkControls from '@/components/live/CallNetworkControls';
import InviteMeetingGuests from './InviteMeetingGuests';
import {dispatchMeetingNotifications} from '@/lib/action-notifications';
import {lazy,Suspense,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createMeetingCall} from '@/lib/meeting-call';
import {requestCallMedia,callMediaError,meetingAccessMessage} from '@/lib/call-media';
import {createMeetingReactions,MEETING_REACTIONS} from '@/lib/meeting-reactions';
import {useSlidePresentation} from '@/lib/use-slide-presentation';
const SlidePresentation=lazy(()=>import('@/components/live/SlidePresentation'));


function ParticipantVideo({stream,label,muted=false,reaction}) {
  const video=useRef(null);
  const [playbackBlocked,setPlaybackBlocked]=useState(false);
  useEffect(()=>{let cancelled=false;const node=video.current;if(node){node.srcObject=stream||null;setPlaybackBlocked(false);if(stream)node.play()?.catch(()=>{if(!cancelled)setPlaybackBlocked(true);});}return()=>{cancelled=true;};},[stream]);
  return <div className="overflow-hidden rounded-xl bg-slate-900 text-white"><video ref={video} autoPlay playsInline muted={muted} aria-label={label} className="h-52 w-full object-contain"/>{playbackBlocked&&<button className="m-3 rounded-lg border px-3 py-2" onClick={()=>video.current?.play().then(()=>setPlaybackBlocked(false)).catch(()=>{})}>Play meeting audio and video</button>}<p className="px-3 py-2 text-sm">{label}{reaction?.handRaised&&<span aria-label={`${label}: hand raised`}> · ✋ Hand raised</span>}{reaction?.emoji&&<span role="status" aria-label={`${label}: ${MEETING_REACTIONS[reaction.emoji]}`}> {reaction.emoji}</span>}</p></div>;
}
export default function MeetingRoom({meeting,user,onRefresh}) {
  const presenters=meeting.participants.filter(p=>['admin','tutor','sace_tutor','student_tutor'].includes(p.role)).map(p=>p.user_id);
  const {transport,received}=useSlidePresentation(meeting.id,user.id,presenters);
  const response=meeting.participants.find(p=>p.user_id===user.id)?.response;
  const inWindow=meeting.status==='scheduled'&&Date.parse(meeting.starts_at)<=Date.now()&&Date.now()<=Date.parse(meeting.starts_at)+5*60000;
  const canAttemptJoin=meeting.can_attempt_join??(meeting.can_join||(response==='invited'&&inWindow));
  const [quality,setQuality]=useState('saver'),[relayOnly,setRelayOnly]=useState(false),[network,setNetwork]=useState(null),[routes,setRoutes]=useState({});
  const [reactionState,setReactionState]=useState({});
  const reactions=useMemo(()=>createMeetingReactions({userId:user.id,onChange:(id,value)=>setReactionState(previous=>{const next={...previous};if(value)next[id]=value;else delete next[id];return next;})}),[meeting.id,user.id]);
  const [canShare,setCanShare]=useState(()=>typeof navigator.mediaDevices?.getDisplayMedia==='function');
  const [joined,setJoined]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [local,setLocal]=useState(null),[remote,setRemote]=useState({}),[statuses,setStatuses]=useState({});
  const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[sharing,setSharing]=useState(false);
  const stream=useRef(null),screen=useRef(null),call=useRef(null),generation=useRef(0),joining=useRef(false),sharePending=useRef(false);
  const stop=useCallback(()=>{
    generation.current++;joining.current=false;call.current?.stop();call.current=null;transport.reset();reactions.reset();
    screen.current?.getTracks().forEach(t=>t.stop());screen.current=null;
    stream.current?.getTracks().forEach(t=>t.stop());stream.current=null;
    setRoutes({});setJoined(false);setBusy(false);setLocal(null);setRemote({});setStatuses({});setMuted(false);setCameraOff(false);setSharing(false);
  },[transport,reactions]);
  useEffect(()=>()=>stop(),[meeting.id,user.id,stop]);
  const accepted=meeting.participants.filter(p=>p.response==='accepted'&&p.first_joined_at).map(p=>p.user_id);
  const signature=accepted.join(',');
  useEffect(()=>{call.current?.setParticipants(signature.split(','));},[signature]);
  useEffect(()=>{if(!meeting.can_join&&!joining.current){stop();}},[meeting.can_join,stop]);
  useEffect(()=>{call.current?.setQuality(quality);},[quality]);
  const join=async(mode='video')=>{
    if(joining.current||call.current||!canAttemptJoin)return;
    joining.current=true;setBusy(true);setError('');const attempt=++generation.current;
    try{
      const media=await requestCallMedia(mode==='audioSlides'?'audio':mode);
      if(attempt!==generation.current){media.getTracks().forEach(t=>t.stop());return;}
      stream.current=media;setLocal(media);setMuted(!media.getAudioTracks().length);setCameraOff(!media.getVideoTracks().length);
      const {data,error:accessError}=await supabase.rpc('join_virtual_meeting',{meeting_key:meeting.id});
      if(accessError)throw accessError;
      if(!data?.can_join)throw new Error('Meeting access is unavailable.');
      const iceConfig=await getCallIceConfig(supabase,'meeting',meeting.id);setNetwork(iceConfig);
      if(relayOnly&&!iceConfig.relayAvailable)throw new Error('The relay is unavailable. Try automatic connection mode or retry shortly.');
      await onRefresh();
      if(response==='invited')dispatchMeetingNotifications(meeting.id).catch(()=>{});
      if(attempt!==generation.current)return;
      call.current=createMeetingCall({client:supabase,meetingId:meeting.id,userId:user.id,stream:media,presentation:transport,reactions,iceConfig,relayOnly,receiveVideo:mode!=='audioSlides',quality,onRoute:(id,route)=>setRoutes(previous=>({...previous,[id]:route})),getIceConfig:()=>getCallIceConfig(supabase,'meeting',meeting.id,{force:true}),
        onRemote:(id,value)=>setRemote(previous=>({...previous,[id]:value})),
        onStatus:(id,value)=>{setStatuses(previous=>({...previous,[id]:value}));if(value==='connected')setError('');},onError:setError});
      call.current.start(data.participants.filter(p=>p.response==='accepted'&&p.first_joined_at).map(p=>p.user_id));setJoined(true);
    }catch(e){if(attempt===generation.current){stop();setError(callMediaError(e));}}
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
    if(!canShare)return;
    setError('');
    sharePending.current=true;const attempt=generation.current;
    try{const media=await navigator.mediaDevices.getDisplayMedia({video:true});
      if(attempt!==generation.current||!call.current){media.getTracks().forEach(t=>t.stop());return;}
      screen.current=media;const track=media.getVideoTracks()[0];track.onended=()=>{stopSharing().catch(e=>setError(e.message));};
      await call.current.replaceVideo(track);setSharing(true);
    }catch(e){await stopSharing().catch(()=>{});if(e.name==='NotSupportedError')setCanShare(false);else if(!['NotAllowedError','AbortError'].includes(e.name))setError(e.message);}finally{sharePending.current=false;}
  };
  const close=async()=>{
    if(!window.confirm('End this meeting for everyone? Everyone will disconnect and this meeting cannot be rejoined. Choose Leave meeting to leave on your own.'))return;
    setBusy(true);try{const {error:closeError}=await supabase.rpc('close_virtual_meeting',{meeting_key:meeting.id,decision:'ended'});if(closeError)throw closeError;stop();await dispatchMeetingNotifications(meeting.id);await onRefresh();}catch(e){setError(e.message);}finally{setBusy(false);}
  };
  return <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6" aria-label="Meeting room">
    <p className="text-sm text-muted-foreground">Private meeting · up to 6 participants · no recording</p>
    <CallNetworkControls quality={quality} onQuality={setQuality} relayOnly={relayOnly} onRelayOnly={setRelayOnly} joined={joined||busy} network={network} route={Object.values(routes).includes('relay')?'relay':Object.keys(routes).length?'direct':null}/>
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!meeting.can_join&&<p role="status">{response==='invited'&&inWindow?'Joining accepts your invitation. Choose camera and microphone, microphone only, or watch and listen.':meetingAccessMessage(meeting,user.id)}</p>}
    {!joined&&<p className="text-sm text-muted-foreground">Allow camera and microphone when your browser asks. Watch and listen lets you view the meeting and slides without turning on either device.</p>}
    {joined&&(!local?.getAudioTracks().length||!local?.getVideoTracks().length)&&<p role="status" className="text-sm text-muted-foreground">{!local?.getAudioTracks().length?'You joined to watch and listen. Your microphone and camera are off.':'You joined with microphone only. Your camera is off.'} Leave and rejoin with camera and microphone to enable both.</p>}
    {joined&&!canShare&&<p className="text-sm text-muted-foreground">Screen sharing is unavailable in this browser. Audio, video and viewing shared screens are still available.</p>}
    {joined&&meeting.participants.some(p=>p.user_id!==user.id&&p.response==='invited')&&!meeting.participants.some(p=>p.user_id!==user.id&&p.response==='accepted')&&<p role="status" className="text-sm text-muted-foreground">Waiting for invitees to accept. They can open the invitation email or Virtual Meetings to accept and join.</p>}
    {joined&&meeting.host_id===user.id&&<InviteMeetingGuests meeting={meeting} onRefresh={onRefresh}/>}
    {joined&&<Suspense fallback={<p>Loading slide controls…</p>}><SlidePresentation transport={transport} received={received} canPresent={presenters.includes(user.id)}/></Suspense>}
    {joined&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ParticipantVideo stream={local} label="You" muted reaction={reactionState[user.id]}/>
      {meeting.participants.filter(p=>p.user_id!==user.id&&p.response==='accepted').map(p=><div key={p.user_id}><ParticipantVideo stream={remote[p.user_id]} label={p.full_name||'Participant'} reaction={reactionState[p.user_id]}/><p className="mt-1 text-xs">{statuses[p.user_id]||'Waiting to join'}</p></div>)}
    </div>}
    <div className="flex flex-wrap gap-2">
      {!joined?<button className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50" disabled={!canAttemptJoin||busy} onClick={()=>join()}>{busy?'Connecting…':'Join meeting'}</button>:<>
        <button disabled={!local?.getAudioTracks().length} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={()=>{const track=stream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled);}}}>{muted?'Unmute':'Mute'}</button>
        <button disabled={!local?.getVideoTracks().length} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={()=>{const track=stream.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCameraOff(!track.enabled);}}}>{cameraOff?'Camera on':'Camera off'}</button>
        {canShare&&!!local?.getVideoTracks().length&&<button className="rounded-lg border px-4 py-2" onClick={share}>{sharing?'Stop sharing':'Share screen'}</button>}
        <button className="rounded-lg bg-red-600 px-4 py-2 text-white" onClick={stop}>Leave meeting</button>
        {meeting.host_id===user.id&&<button className="rounded-lg border border-red-400 px-4 py-2" disabled={busy} onClick={close}>End for everyone</button>}
      </>}
    </div>
    {!joined&&<div className="flex flex-wrap gap-2"><button disabled={!canAttemptJoin||busy} onClick={()=>join('audio')} className="rounded-lg border px-4 py-3 text-sm disabled:opacity-50">Join with microphone only</button><button disabled={!canAttemptJoin||busy} onClick={()=>join('listen')} className="rounded-lg border px-4 py-3 text-sm disabled:opacity-50">Join to watch and listen</button><button disabled={!canAttemptJoin||busy} onClick={()=>join('audioSlides')} className="rounded-lg border px-4 py-3 text-sm disabled:opacity-50">Join with audio and slides only</button></div>}
    {joined&&<div role="group" aria-label="Meeting reactions" className="flex flex-wrap gap-2"><button aria-pressed={!!reactionState[user.id]?.handRaised} onClick={()=>reactions.toggleHand()} className="rounded-lg border px-4 py-3 text-sm">{reactionState[user.id]?.handRaised?'✋ Lower hand':'✋ Raise hand'}</button>{Object.entries(MEETING_REACTIONS).map(([emoji,label])=><button key={emoji} aria-label={label} onClick={()=>reactions.react(emoji)} className="rounded-lg border px-4 py-3 text-xl">{emoji}</button>)}</div>}
    <p className="text-xs text-muted-foreground">Mobile and school networks can use the encrypted relay when direct connections are blocked. A network that blocks all calling traffic may still need administrator permission.</p>
  </section>;
}
