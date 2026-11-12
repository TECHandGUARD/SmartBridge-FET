import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Video, ShieldCheck, CalendarClock, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

const platform = link => {
  if (!link) return 'Not selected';
  if (link.includes('/live-classroom/')) return 'SmartBridge Live';
  try { const host = new URL(link).hostname.toLowerCase(); if (host.includes('zoom.')) return 'Zoom'; if (host.includes('teams.') || host.includes('microsoft.')) return 'Microsoft Teams'; } catch { /* unknown link */ }
  return 'External meeting';
};

export default function TutorLiveClassroomHub({ user, onOpenBookings }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true); setError('');
    const today = new Intl.DateTimeFormat('en-CA',{ timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
    const { data, error: requestError } = await supabase.from('tutor_bookings')
      .select('id,subject,date,time,status,session_link,student_email')
      .eq('tutor_email',user.email).eq('status','confirmed').gte('date',today)
      .order('date',{ascending:true}).order('time',{ascending:true}).limit(15);
    if (requestError) setError('Could not load sessions. Please retry.');
    else setSessions(data||[]);
    setLoading(false);
  },[user?.email]);

  useEffect(() => {
    load();
    if (!user?.email) return;
    const channel=supabase.channel('tutor-live-hub-'+user.id)
      .on('postgres_changes',{event:'*',schema:'public',table:'tutor_bookings',filter:'tutor_email=eq.'+user.email},()=>load()).subscribe();
    return ()=>{supabase.removeChannel(channel);};
  },[user?.email,user?.id,load]);

  return <section className="space-y-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 shadow-sm dark:border-indigo-900 dark:from-indigo-950/40 dark:via-background dark:to-cyan-950/20 sm:p-6" aria-label="SmartBridge Live classroom">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-600 p-3 text-white"><Video size={22}/></div>
        <div><h2 className="text-xl font-extrabold text-foreground">SmartBridge Live Classroom</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Your private one-to-one classroom for booked lessons. Choose SmartBridge Live, Zoom or Microsoft Teams when confirming a booking.</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-background dark:text-indigo-300"><ShieldCheck size={14}/> Free video pilot</span>
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={onOpenBookings} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">Choose platform in Booking Requests</button>
      <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-semibold hover:bg-muted"><RefreshCw size={15}/> Refresh sessions</button>
    </div>
    <div className="rounded-xl border bg-background/85 p-3 sm:p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold"><CalendarClock size={18} className="text-indigo-600"/> Confirmed upcoming classrooms</h3>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Loading sessions…</p> :
        error ? <p role="alert" className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={16}/>{error}</p> :
        sessions.length===0 ? <div className="space-y-2"><p className="text-sm font-medium">No confirmed upcoming sessions yet.</p><p className="text-sm text-muted-foreground">The classroom is ready, but a learner must book a session and you must confirm it first. Then its Join Classroom button will appear here.</p></div> :
        <div className="space-y-2">{sessions.map(session=><div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
          <div className="min-w-0"><p className="font-semibold">{session.subject || 'Tutoring session'}</p><p className="text-xs text-muted-foreground">{session.date} · {session.time} SAST · {platform(session.session_link)}</p></div>
          {session.session_link ? (session.session_link.includes('/live-classroom/') ?
            <Link className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700" to={`/live-classroom/${session.id}`}><Video size={15}/> Open Classroom</Link> :
            <a className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold hover:bg-muted" href={session.session_link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Join {platform(session.session_link)}</a>
          ) : <span className="text-xs text-amber-700">Meeting link not set</span>}
        </div>)}</div>}
    </div>
    <p className="text-xs text-muted-foreground">SmartBridge Live admits only the confirmed tutor and learner, from 20 minutes before the session until 30 minutes after its end. Direct WebRTC may fail on restricted networks; Zoom and Teams remain alternatives. Video recording is not enabled.</p>
  </section>;
}
