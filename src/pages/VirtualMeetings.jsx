import {ArrowLeft,CalendarDays,Mail,ShieldCheck,Users,Video} from 'lucide-react';
import {CallButton} from '@/components/live/CallStudio';
import {clearMeetingReturn} from '@/lib/meeting-navigation';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabaseClient';
import {dispatchMeetingNotifications} from '@/lib/action-notifications';
import MeetingRoom from '@/components/meetings/MeetingRoom';
import InstantAdultCalls from '@/components/calls/InstantAdultCalls';

const PURPOSES={parent_support:'Parent–tutor support',tutor_reflection:'Tutor reflection & development',staff_support:'Administrator & tutor support'};
const formatTime=value=>new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value));
const initialStart=()=>new Date(Date.now()+2*3600000+15*60000).toISOString().slice(0,16);
export default function VirtualMeetings(){
  const {user}=useAuth();const {meetingId}=useParams();
  useEffect(()=>{if(meetingId)clearMeetingReturn('/meetings/'+meetingId);},[meetingId]);
  const [meetings,setMeetings]=useState([]),[meeting,setMeeting]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:'',purpose:'parent_support',agenda:'',starts:initialStart(),duration:'30',emails:''});
  const [notice,setNotice]=useState('');const request=useRef(null),generation=useRef(0),loadSequence=useRef(0);
  const canCreate=user?.is_super_admin||['admin','tutor','sace_tutor','student_tutor'].includes(user?.role);
  const load=useCallback(async()=>{
    const attempt=generation.current,sequence=++loadSequence.current;
    const {data,error:loadError}=await supabase.rpc(meetingId?'virtual_meeting_details':'list_virtual_meetings',meetingId?{meeting_key:meetingId}:undefined);
    if(attempt!==generation.current||sequence!==loadSequence.current)return;
    if(loadError){setError(loadError.message);if(['42501','P0001','PGRST301'].includes(loadError.code))setMeeting(null);setLoading(false);return;}
    if(meetingId)setMeeting(data);else setMeetings(data||[]);setLoading(false);
  },[meetingId]);
  useEffect(()=>{
    generation.current++;setLoading(true);setMeeting(null);setError('');load();
    const timer=setInterval(load,5000);return()=>{generation.current++;clearInterval(timer);};
  },[load,user?.id]);
  const create=async e=>{
    e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{
      const args={meeting_title:form.title,meeting_purpose:form.purpose,meeting_agenda:form.agenda,scheduled_start:new Date(form.starts+':00+02:00').toISOString(),duration_minutes:Number(form.duration),invite_emails:form.emails.split(/[,;\n]/).map(s=>s.trim()).filter(Boolean)};
      const fingerprint=JSON.stringify(args);if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
      const {data:createdId,error:createError}=await supabase.rpc('create_virtual_meeting',{...args,client_request_id:request.current.id});if(createError)throw createError;
      const email=await dispatchMeetingNotifications(createdId);
      request.current=null;setForm({...form,title:'',agenda:'',emails:''});setNotice(email.status==='accepted'?'Meeting requested. Invitation emails accepted for sending. Reminders are scheduled for 1 hour and 30 minutes before the start.':'Meeting requested. Invitation emails are queued for automatic delivery. Reminders are scheduled for 1 hour and 30 minutes before the start.');await load();
    }catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const act=async(id,decision)=>{
    if(busy)return;setBusy(true);setError('');
    try{const {error:actionError}=await supabase.rpc(['accepted','declined'].includes(decision)?'respond_virtual_meeting':'close_virtual_meeting',{meeting_key:id,decision});if(actionError)throw actionError;await dispatchMeetingNotifications(id);await load();}catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const response=m=>m.participants?.find(p=>p.user_id===user.id)?.response;
  return <main className="studio-page">
    <header className="studio-page-header"><div><Link to="/meetings" className="studio-back">{meetingId&&<ArrowLeft size={16} aria-hidden="true"/>}Virtual meetings</Link><span className="studio-eyebrow">SmartBridge conversations</span><h1>{meetingId?meeting?.title||'Private virtual meeting':'A space to connect.'}</h1><p>Parent support, tutor reflection and professional development. Thoughtful conversations, together in one private space.</p></div><span className="studio-badge"><ShieldCheck size={16} aria-hidden="true"/> Free · Invitation only</span></header>
    {error&&<p role="alert" className="studio-alert mb-4">{error}</p>}
    {notice&&<p role="status" className="studio-status mb-4"><Mail size={18} aria-hidden="true"/>{notice}</p>}
    {!meetingId&&user&&<InstantAdultCalls user={user}/>}
    {meetingId?loading?<p role="status" className="studio-panel">Loading meeting…</p>:meeting&&<>
      <section className="studio-meeting-info space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs"><span className="studio-badge"><CalendarDays size={14} aria-hidden="true"/>{formatTime(meeting.starts_at)} (SAST)</span><span className="text-muted-foreground">Status: {meeting.status} · Your invitation: {response(meeting)}</span></div>
        <details className="studio-settings"><summary>Meeting details · {meeting.participants.length} participants</summary><div className="studio-settings-body space-y-3"><p className="text-sm font-semibold">{PURPOSES[meeting.purpose]}</p><p className="studio-note">{formatTime(meeting.starts_at)} – {formatTime(meeting.ends_at)} (SAST)</p>{meeting.agenda&&<p className="whitespace-pre-wrap text-sm leading-relaxed">{meeting.agenda}</p>}<p className="studio-note">Invitees can first join from the scheduled start until five minutes afterwards.</p><ul className="studio-people">{meeting.participants.map(p=><li className="studio-person" key={p.user_id}><span className="studio-person-avatar" aria-hidden="true">{(p.full_name||'P').slice(0,1)}</span><span>{p.full_name||'Participant'}{p.user_id===meeting.host_id?' · Host':''}<small>{p.role.replaceAll('_',' ')} · {p.response}</small></span></li>)}</ul></div></details>
        {meeting.host_id!==user.id&&meeting.status==='scheduled'&&<div className="flex flex-wrap gap-2">{response(meeting)!=='accepted'&&<CallButton variant="primary" disabled={busy} onClick={()=>act(meeting.id,'accepted')}>Accept invitation</CallButton>}{response(meeting)!=='declined'&&<CallButton disabled={busy} onClick={()=>act(meeting.id,'declined')}>Decline invitation</CallButton>}</div>}
      </section><MeetingRoom meeting={meeting} user={user} onRefresh={load}/>
    </>:<div className={canCreate?'studio-meetings-layout':'space-y-5'}>
      {canCreate?<form onSubmit={create} className="studio-panel studio-form space-y-4"><div><span className="studio-eyebrow">Make time for a conversation</span><h2>Request a meeting</h2><p className="studio-panel-intro">Bring parents, tutors or administrators together. We’ll send the invitations and reminders for you.</p></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Meeting title<input required minLength={3} maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="block w-full" placeholder="Give your conversation a name"/></label>
        <label className="space-y-1 text-sm">Meeting purpose<select aria-label="Meeting purpose" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} className="block w-full">{Object.entries(PURPOSES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="space-y-1 text-sm">Start (South Africa time)<input type="datetime-local" required value={form.starts} onChange={e=>setForm({...form,starts:e.target.value})} className="block w-full"/></label>
        <label className="space-y-1 text-sm">Duration<select aria-label="Duration" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className="block w-full">{[15,30,45,60,90,120].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label></div>
        <label className="block space-y-1 text-sm">Invite account emails<textarea required value={form.emails} onChange={e=>setForm({...form,emails:e.target.value})} className="block w-full" placeholder="parent@example.com, tutor@example.com"/><span className="block studio-note">Invite 1–5 people using their registered account emails, separated by commas. You are included as the host.</span></label>
        <label className="block space-y-1 text-sm">Agenda (optional)<textarea maxLength={2000} value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})} className="block w-full" placeholder="What would you like to discuss?"/></label>
        <div className="rounded-xl bg-accent/50 p-3 text-xs leading-relaxed text-accent-foreground"><span className="inline-flex items-center gap-2 font-semibold"><Mail size={14} aria-hidden="true"/> Invitations, taken care of</span><p className="mt-1">Email invitations include the meeting link and time. Reminders go to the host and invitees who haven’t declined, 1 hour and 30 minutes before the start. Only future reminders are scheduled for short-notice meetings.</p></div>
        <button disabled={busy} className="studio-button studio-button--primary w-full"><Mail size={16} aria-hidden="true"/>{busy?'Requesting…':'Send meeting invitations'}</button>
      </form>:<p className="studio-status"><Users size={18} aria-hidden="true"/>Administrators and verified tutors can invite you. Accept or decline your invitations below.</p>}
      <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="studio-eyebrow">Your diary</span><h2 className="text-lg font-semibold">Your meetings & invitations</h2></div><CallButton onClick={()=>load()}>Refresh meetings</CallButton></div>
        {loading?<p role="status" className="studio-panel">Loading meetings…</p>:!meetings.length?<div className="studio-empty"><Video size={32} aria-hidden="true"/><h3>No meeting invitations yet.</h3><p>Your upcoming conversations will appear here, with everything you need to join.</p></div>:meetings.map(m=><article key={m.id} className="studio-meeting-card space-y-3"><span className="studio-eyebrow">{PURPOSES[m.purpose]}</span><h3 className="font-semibold">{m.title}</h3><p className="text-sm flex items-center gap-2"><CalendarDays size={15} aria-hidden="true"/>{formatTime(m.starts_at)} (SAST)</p><p className="text-xs text-muted-foreground">{m.status} · {m.participants.length} invited participants · Your invitation: {response(m)}</p><div className="flex flex-wrap gap-2"><Link className="studio-button studio-button--primary" to={'/meetings/'+m.id}>Open meeting</Link>{m.status==='scheduled'&&m.host_id!==user.id&&<>{response(m)!=='accepted'&&<CallButton disabled={busy} onClick={()=>act(m.id,'accepted')}>Accept invitation</CallButton>}{response(m)!=='declined'&&<CallButton disabled={busy} onClick={()=>act(m.id,'declined')}>Decline invitation</CallButton>}</>}{m.host_id===user.id&&m.status==='scheduled'&&<CallButton variant="quiet" disabled={busy} onClick={()=>act(m.id,'cancelled')}>Cancel meeting</CallButton>}</div></article>)}
      </section>
    </div>}
  </main>;
}
