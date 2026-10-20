import {Camera,CameraOff,Mic,MicOff,MonitorUp,PhoneOff,Video,Headphones,Presentation,Users,DoorOpen,Hand,ShieldCheck} from 'lucide-react';
import {CallButton,CallWorkspace,VideoPlaceholder} from '@/components/live/CallStudio';
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


function ParticipantVideo({stream,label,muted=false,reaction,cameraOff=false,status=''}) {
  const video=useRef(null);
  const [playbackBlocked,setPlaybackBlocked]=useState(false),[hasVideo,setHasVideo]=useState(false);
  useEffect(()=>{
    let cancelled=false;const node=video.current;
    const update=()=>setHasVideo(!!stream?.getVideoTracks().some(track=>track.readyState==='live'&&!track.muted));
    update();stream?.addEventListener('addtrack',update);stream?.addEventListener('removetrack',update);
    const tracks=stream?.getVideoTracks()||[];tracks.forEach(track=>{track.addEventListener('unmute',update);track.addEventListener('mute',update);track.addEventListener('ended',update);});
    if(node){node.srcObject=stream||null;setPlaybackBlocked(false);if(stream)node.play()?.catch(()=>{if(!cancelled)setPlaybackBlocked(true);});}
    return()=>{cancelled=true;stream?.removeEventListener('addtrack',update);stream?.removeEventListener('removetrack',update);tracks.forEach(track=>{track.removeEventListener('unmute',update);track.removeEventListener('mute',update);track.removeEventListener('ended',update);});};
  },[stream]);
  return <div className="studio-tile"><video ref={video} autoPlay playsInline muted={muted} aria-label={label}/>{(!hasVideo||cameraOff)&&<VideoPlaceholder name={label} note={stream?'Camera is off':'Waiting to join'}/>}{playbackBlocked&&<button className="studio-video-play" onClick={()=>video.current?.play().then(()=>setPlaybackBlocked(false)).catch(()=>{})}>Play meeting audio and video</button>}<div className="studio-tile-footer"><span>{label}{reaction?.handRaised&&<span aria-label={`${label}: hand raised`}> · ✋ Hand raised</span>}{reaction?.emoji&&<span role="status" aria-label={`${label}: ${MEETING_REACTIONS[reaction.emoji]}`}> {reaction.emoji}</span>}</span><small>{status}</small></div></div>;
}
export default function MeetingRoom({meeting,user,onRefresh}) {
  const [compactVideos,setCompactVideos]=useState(false);
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
  return <CallWorkspace title="Meeting room" subtitle="Private meeting · up to 6 participants · no recording" joined={joined}>
    <div className="studio-content">
      {error&&<p role="alert" className="studio-alert">{error}</p>}
      {!meeting.can_join&&<p role="status" className="studio-status"><ShieldCheck size={18} aria-hidden="true"/>{response==='invited'&&inWindow?'Joining accepts your invitation. Choose camera and microphone, microphone only, or watch and listen.':meetingAccessMessage(meeting,user.id)}</p>}
      {!joined&&<div className="studio-join"><span className="studio-eyebrow">Your space to connect</span><h3>Choose how you join</h3><p>Allow camera and microphone when your browser asks. Watch and listen lets you view the meeting and slides without turning on either device.</p>
        <CallButton icon={Video} variant="primary" disabled={!canAttemptJoin||busy} onClick={()=>join()}>{busy?'Connecting…':'Join meeting'}</CallButton>
        <div className="studio-join-options">
          <CallButton icon={Mic} disabled={!canAttemptJoin||busy} onClick={()=>join('audio')} aria-label="Join with microphone only"><span>Join with microphone only<small>Keep your camera off.</small></span></CallButton>
          <CallButton icon={Headphones} disabled={!canAttemptJoin||busy} onClick={()=>join('listen')} aria-label="Join to watch and listen"><span>Join to watch and listen<small>No camera or microphone permission.</small></span></CallButton>
          <CallButton icon={Presentation} disabled={!canAttemptJoin||busy} onClick={()=>join('audioSlides')} aria-label="Join with audio and slides only"><span>Join with audio and slides only<small>Save data by skipping incoming video.</small></span></CallButton>
        </div>
      </div>}
      {joined&&<div className="flex justify-end"><CallButton aria-pressed={compactVideos} onClick={()=>setCompactVideos(value=>!value)}>{compactVideos?'Show full videos':'Compact videos'}</CallButton></div>}
      {joined&&<div className={`studio-video-grid ${compactVideos?'is-compact':''}`}>
        <ParticipantVideo stream={local} label="You" muted cameraOff={cameraOff} reaction={reactionState[user.id]} status={muted?'Microphone off':'You'}/>
        {meeting.participants.filter(p=>p.user_id!==user.id&&p.response==='accepted').map(p=><ParticipantVideo key={p.user_id} stream={remote[p.user_id]} label={p.full_name||'Participant'} reaction={reactionState[p.user_id]} status={statuses[p.user_id]||'Waiting to join'}/>)}
      </div>}
      {joined&&meeting.participants.some(p=>p.user_id!==user.id&&p.response==='invited')&&!meeting.participants.some(p=>p.user_id!==user.id&&p.response==='accepted')&&<p role="status" className="studio-status"><Users size={18} aria-hidden="true"/>Waiting for invitees to accept. They can open the invitation email or Virtual Meetings to accept and join.</p>}
      {joined&&(!local?.getAudioTracks().length||!local?.getVideoTracks().length)&&<p role="status" className="studio-note">{!local?.getAudioTracks().length?'You joined to watch and listen. Your microphone and camera are off.':'You joined with microphone only. Your camera is off.'} Leave and rejoin with camera and microphone to enable both.</p>}
      {joined&&<Suspense fallback={<p role="status" className="studio-note">Loading slide controls…</p>}><SlidePresentation transport={transport} received={received} canPresent={presenters.includes(user.id)}/></Suspense>}
      {joined&&<div role="group" aria-label="Meeting reactions" className="studio-reactions"><CallButton icon={Hand} aria-pressed={!!reactionState[user.id]?.handRaised} onClick={()=>reactions.toggleHand()}>{reactionState[user.id]?.handRaised?'✋ Lower hand':'✋ Raise hand'}</CallButton>{Object.entries(MEETING_REACTIONS).map(([emoji,label])=><CallButton key={emoji} aria-label={label} onClick={()=>reactions.react(emoji)}>{emoji}</CallButton>)}</div>}
      {joined&&meeting.host_id===user.id&&<details className="studio-settings"><summary>Invite another person</summary><div className="studio-settings-body"><InviteMeetingGuests meeting={meeting} onRefresh={onRefresh}/></div></details>}
      <CallNetworkControls quality={quality} onQuality={setQuality} relayOnly={relayOnly} onRelayOnly={setRelayOnly} joined={joined||busy} network={network} route={Object.values(routes).includes('relay')?'relay':Object.keys(routes).length?'direct':null}/>
      {joined&&!canShare&&<p className="studio-note">Screen sharing is unavailable in this browser. Audio, video and viewing shared screens are still available.</p>}
    </div>
    {joined&&<div className="studio-dock" role="group" aria-label="Meeting controls">
      <CallButton icon={muted?MicOff:Mic} aria-pressed={muted} disabled={!local?.getAudioTracks().length} onClick={()=>{const track=stream.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled);}}}>{muted?'Unmute':'Mute'}</CallButton>
      <CallButton icon={cameraOff?CameraOff:Camera} aria-pressed={cameraOff} disabled={!local?.getVideoTracks().length} onClick={()=>{const track=stream.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCameraOff(!track.enabled);}}}>{cameraOff?'Camera on':'Camera off'}</CallButton>
      {canShare&&!!local?.getVideoTracks().length&&<CallButton icon={MonitorUp} aria-pressed={sharing} onClick={share}>{sharing?'Stop sharing':'Share screen'}</CallButton>}
      <CallButton icon={PhoneOff} variant="danger" onClick={stop}>Leave meeting</CallButton>
      {meeting.host_id===user.id&&<CallButton icon={DoorOpen} variant="quiet" disabled={busy} onClick={close}>End for everyone</CallButton>}
    </div>}
  </CallWorkspace>;
}
