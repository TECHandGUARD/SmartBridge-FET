import {clearMeetingReturn} from '@/lib/meeting-navigation';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabaseClient';
import {dispatchMeetingNotifications} from '@/lib/action-notifications';
import MeetingRoom from '@/components/meetings/MeetingRoom';

const PURPOSES={parent_support:'Parent–tutor support',tutor_reflection:'Tutor reflection & development',staff_support:'Administrator & tutor support'};
const formatTime=value=>new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value));
const initialStart=()=>new Date(Date.now()+2*3600000+15*60000).toISOString().slice(0,16);
export default function VirtualMeetings(){
  const {user}=useAuth();const {meetingId}=useParams();
  useEffect(()=>{if(meetingId)clearMeetingReturn('/meetings/'+meetingId);},[meetingId]);
  const [meetings,setMeetings]=useState([]),[meeting,setMeeting]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [form,setForm]=useState({title:'',purpose:'parent_support',agenda:'',starts:initialStart(),duration:'30',emails:''});
  const [notice,setNotice]=useState('');const request=useRef(null),generation=useRef(0);
  const canCreate=user?.is_super_admin||['admin','tutor','sace_tutor','student_tutor'].includes(user?.role);
  const load=useCallback(async()=>{
    const attempt=generation.current;
    const {data,error:loadError}=await supabase.rpc(meetingId?'virtual_meeting_details':'list_virtual_meetings',meetingId?{meeting_key:meetingId}:undefined);
    if(attempt!==generation.current)return;
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
  return <main className="mx-auto max-w-6xl space-y-5 px-4 py-7">
    <header><Link to="/meetings" className="text-sm text-primary">Virtual meetings</Link><h1 className="mt-2 text-2xl font-bold">{meetingId?meeting?.title||'Private virtual meeting':'Virtual Meetings'}</h1><p className="mt-2 text-sm text-muted-foreground">Parent support, tutor reflection and professional development. Free, invitation-only meetings for administrators, verified tutors and parents.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    {meetingId?loading?<p>Loading meeting…</p>:meeting&&<>
      <section className="space-y-2 rounded-xl border p-4"><p className="font-semibold">{PURPOSES[meeting.purpose]}</p><p>{formatTime(meeting.starts_at)} – {formatTime(meeting.ends_at)} (SAST)</p><p className="text-sm">Status: {meeting.status} · Your invitation: {response(meeting)}</p>{meeting.agenda&&<p className="whitespace-pre-wrap text-sm">{meeting.agenda}</p>}<ul className="space-y-1 text-sm">{meeting.participants.map(p=><li key={p.user_id}>{p.full_name||'Participant'} · {p.role.replaceAll('_',' ')} · {p.response}{p.user_id===meeting.host_id?' · Host':''}</li>)}</ul>
        {meeting.host_id!==user.id&&meeting.status==='scheduled'&&<div className="flex gap-2">{response(meeting)!=='accepted'&&<button disabled={busy} className="rounded-lg border px-3 py-2" onClick={()=>act(meeting.id,'accepted')}>Accept invitation</button>}{response(meeting)!=='declined'&&<button disabled={busy} className="rounded-lg border px-3 py-2" onClick={()=>act(meeting.id,'declined')}>Decline invitation</button>}</div>}
      </section><MeetingRoom meeting={meeting} user={user} onRefresh={load}/>
    </>:<>
      {canCreate?<form onSubmit={create} className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6"><h2 className="text-lg font-semibold">Request a meeting</h2>
        <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-sm">Meeting title<input required minLength={3} maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="block w-full rounded-lg border bg-background p-2"/></label>
        <label className="space-y-1 text-sm">Meeting purpose<select aria-label="Meeting purpose" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} className="block w-full rounded-lg border bg-background p-2">{Object.entries(PURPOSES).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
        <label className="space-y-1 text-sm">Start (South Africa time)<input type="datetime-local" required value={form.starts} onChange={e=>setForm({...form,starts:e.target.value})} className="block w-full rounded-lg border bg-background p-2"/></label>
        <label className="space-y-1 text-sm">Duration<select aria-label="Duration" value={form.duration} onChange={e=>setForm({...form,duration:e.target.value})} className="block w-full rounded-lg border bg-background p-2">{[15,30,45,60,90,120].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label></div>
        <label className="block space-y-1 text-sm">Invite account emails<textarea required value={form.emails} onChange={e=>setForm({...form,emails:e.target.value})} className="block w-full rounded-lg border bg-background p-2" placeholder="parent@example.com, tutor@example.com"/><span className="block text-xs text-muted-foreground">Invite 1–5 people using their registered account emails, separated by commas. You are included as the host. Email invitations include the meeting link and time. Reminders go to the host and invitees who haven’t declined, 1 hour and 30 minutes before the start. For meetings requested at short notice, only future reminders are scheduled.</span></label>
        <label className="block space-y-1 text-sm">Agenda (optional)<textarea maxLength={2000} value={form.agenda} onChange={e=>setForm({...form,agenda:e.target.value})} className="block w-full rounded-lg border bg-background p-2"/></label>
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?'Requesting…':'Send meeting invitations'}</button>
      </form>:<p className="rounded-xl border p-4 text-sm">Administrators and verified tutors can invite you. Accept or decline your invitations below.</p>}
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your meetings & invitations</h2><button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>load()}>Refresh meetings</button></div>
        {loading?<p>Loading meetings…</p>:!meetings.length?<p className="text-sm text-muted-foreground">No meeting invitations yet.</p>:meetings.map(m=><article key={m.id} className="space-y-2 rounded-xl border p-4"><h3 className="font-semibold">{m.title}</h3><p className="text-sm">{PURPOSES[m.purpose]} · {formatTime(m.starts_at)} (SAST)</p><p className="text-sm">{m.status} · {m.participants.length} invited participants · Your invitation: {response(m)}</p><div className="flex flex-wrap gap-2"><Link className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" to={'/meetings/'+m.id}>Open meeting</Link>{m.status==='scheduled'&&m.host_id!==user.id&&<>{response(m)!=='accepted'&&<button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>act(m.id,'accepted')}>Accept invitation</button>}{response(m)!=='declined'&&<button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>act(m.id,'declined')}>Decline invitation</button>}</>}{m.host_id===user.id&&m.status==='scheduled'&&<button disabled={busy} className="rounded-lg border px-3 py-2 text-sm" onClick={()=>act(m.id,'cancelled')}>Cancel meeting</button>}</div></article>)}
      </section>
    </>}
  </main>;
}
