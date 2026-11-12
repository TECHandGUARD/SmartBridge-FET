import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {createMeetingCall} from '@/lib/meeting-call';
import {requestCallMedia} from '@/lib/call-media';
import {DEFAULT_ICE_SERVERS} from '@/lib/call-network';
import {Phone,PhoneOff,Video,Mic,MicOff,VideoOff} from 'lucide-react';

function VideoTile({stream,label,muted=false}){
 const ref=useRef(null);
 useEffect(()=>{const node=ref.current;if(node){node.srcObject=stream||null;if(stream)node.play().catch(()=>{});}return()=>{if(node)node.srcObject=null;};},[stream]);
 return <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-40"><video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover"/><span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">{label}</span></div>;
}
export default function InstantAdultCalls({user}){
 const [calls,setCalls]=useState([]),[email,setEmail]=useState(''),[kind,setKind]=useState('audio'),[active,setActive]=useState(null),[local,setLocal]=useState(null),[remote,setRemote]=useState(null),[muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [pushState,setPushState]=useState('');
 const enablePush=async()=>{try{if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Push notifications are unavailable in this browser. On iPhone, first add SmartBridge to your Home Screen.');const key=import.meta.env.VITE_CALL_PUSH_PUBLIC_KEY;if(!key)throw new Error('Background call alerts are not configured yet.');const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Notification permission was not granted');const reg=await navigator.serviceWorker.register('/call-notification-sw.js');const bytes=Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(key.length/4)*4,'=')),x=>x.charCodeAt(0));const subscription=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});const {error:e}=await supabase.rpc('register_adult_call_push',{push_subscription:subscription.toJSON()});if(e)throw e;setPushState('Notifications enabled for this device.');}catch(e){setPushState(e.message);}};
 const engine=useRef(null),media=useRef(null),current=useRef(null),heartbeat=useRef(null);
 const stopMedia=useCallback(()=>{engine.current?.stop();engine.current=null;media.current?.getTracks().forEach(t=>t.stop());media.current=null;setLocal(null);setRemote(null);setActive(null);current.current=null;},[]);
 const load=useCallback(async()=>{const {data,error:e}=await supabase.from('instant_adult_calls').select('*').or('caller_id.eq.'+user.id+',callee_id.eq.'+user.id).order('created_at',{ascending:false}).limit(30);if(!e)setCalls(data||[]);},[user.id]);
 useEffect(()=>{load();const timer=setInterval(load,3000);return()=>clearInterval(timer);},[load]);
 useEffect(()=>{const c=current.current;if(!c)return;const latest=calls.find(x=>x.id===c.id);if(latest?.status==='ended'||latest?.status==='declined'||latest?.status==='missed'){stopMedia();return;}if(latest?.status==='accepted'&&!engine.current&&!media.current){connect(latest).catch(e=>setError(e.message));}},[calls,stopMedia]);
 useEffect(()=>()=>{stopMedia();},[stopMedia]);
 const connect=async c=>{
  if(media.current||engine.current)return;
  setError('');const stream=await requestCallMedia(c.kind==='video'?'video':'audio');media.current=stream;setLocal(stream);setMuted(!stream.getAudioTracks().length);setCameraOff(!stream.getVideoTracks().length);
  try{const peer=c.caller_id===user.id?c.callee_id:c.caller_id;
   const instance=createMeetingCall({client:supabase,meetingId:c.id,userId:user.id,stream,signalTable:'instant_adult_call_signals',iceConfig:{iceServers:DEFAULT_ICE_SERVERS,relayAvailable:false,expiresAt:0},onRemote:(_id,s)=>setRemote(s),onStatus:()=>{},onError:setError});
   engine.current=instance;instance.start([peer]);setActive(c);
  }catch(e){stopMedia();throw e;}
 };
 const start=async()=>{
  if(!email.trim()||busy)return;setBusy(true);setError('');
  try{const {data:recipient,error:lookupError}=await supabase.rpc('lookup_instant_adult_contact',{contact_email:email.trim()});if(lookupError)throw lookupError;if(!recipient)throw new Error('No eligible contact found');
   const {data:id,error:e}=await supabase.rpc('start_instant_adult_call',{recipient,call_kind:kind});if(e)throw e;current.current={id};await load();
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const respond=async(c,decision)=>{setBusy(true);setError('');try{const {error:e}=await supabase.rpc('respond_instant_adult_call',{call_key:c.id,decision});if(e)throw e;if(decision==='accepted'){current.current=c;await connect({...c,status:'accepted'});}await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const hangup=async()=>{const c=current.current;stopMedia();if(c)await supabase.rpc('end_instant_adult_call',{call_key:c.id});await load();};
 const incoming=calls.find(c=>c.callee_id===user.id&&c.status==='ringing'&&Date.parse(c.expires_at)>Date.now());
 const outgoing=calls.find(c=>c.caller_id===user.id&&c.status==='ringing'&&Date.parse(c.expires_at)>Date.now());
 const inCall=active||calls.find(c=>c.id===current.current?.id&&c.status==='accepted');
 return <section className="studio-panel space-y-4" aria-label="Instant voice and video calls">
  <div><h2 className="text-xl font-semibold">Instant calls</h2><p className="text-sm text-muted-foreground">Call another approved adult account. Keep this page open to receive incoming calls.</p></div>
  <div className="flex flex-wrap items-center gap-2"><button className="studio-button" type="button" onClick={enablePush}>Enable call notifications</button><p className="text-xs text-muted-foreground" role="status">{pushState||'Notifications require permission and an installed home-screen app on iPhone.'}</p></div>
  {error&&<p role="alert" className="text-red-600">{error}</p>}
  {incoming&&!inCall&&<div className="rounded-xl border p-4 space-y-3" role="alert"><p className="font-semibold">Incoming {incoming.kind} call</p><div className="flex gap-2"><button className="studio-button studio-button--primary" disabled={busy} onClick={()=>respond(incoming,'accepted')}>Accept</button><button className="studio-button" disabled={busy} onClick={()=>respond(incoming,'declined')}>Decline</button></div></div>}
  {inCall?<div className="space-y-3"><p role="status">Connected call · {inCall.kind}</p><div className="grid sm:grid-cols-2 gap-3"><VideoTile stream={local} label="You" muted/><VideoTile stream={remote} label="Other participant"/></div><div className="flex flex-wrap gap-2"><button className="studio-button" onClick={()=>{const t=media.current?.getAudioTracks()[0];if(t){t.enabled=!t.enabled;setMuted(!t.enabled);}}}>{muted?<MicOff size={16}/>:<Mic size={16}/>} Microphone</button><button className="studio-button" onClick={()=>{const t=media.current?.getVideoTracks()[0];if(t){t.enabled=!t.enabled;setCameraOff(!t.enabled);}}}>{cameraOff?<VideoOff size={16}/>:<Video size={16}/>} Camera</button><button className="studio-button studio-button--primary" onClick={hangup}><PhoneOff size={16}/> End call</button></div></div>:outgoing?<div className="flex items-center gap-3"><p role="status">Ringing…</p><button className="studio-button" onClick={()=>{current.current=outgoing;hangup();}}>Cancel</button></div>:<div className="flex flex-wrap gap-2"><label className="flex-1 min-w-48 text-sm">Registered contact email<input type="email" className="block w-full mt-1" value={email} onChange={e=>setEmail(e.target.value)} placeholder="contact@example.com"/></label><select aria-label="Call type" className="rounded-lg border p-2" value={kind} onChange={e=>setKind(e.target.value)}><option value="audio">Voice</option><option value="video">Video</option></select><button className="studio-button studio-button--primary self-end" disabled={busy||!email.trim()} onClick={start}><Phone size={16}/> Call</button></div>}
  <div><h3 className="font-medium">Recent calls</h3><ul className="text-sm space-y-1">{calls.slice(0,8).map(c=><li key={c.id}>{c.kind==='video'?'Video':'Voice'} · {c.status} · {new Date(c.created_at).toLocaleString('en-ZA')}</li>)}</ul></div>
 </section>;
}