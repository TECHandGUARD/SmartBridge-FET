const jobNames={study:'Study reminders','session-24h':'Session reminders (24 hours)','session-1h':'Session reminders (1 hour)',nbt:'NBT reminders',deadlines:'Application deadlines',subscriptions:'Subscription expiry','weekly-parents':'Weekly parent reports',alerts:'Administrator alerts'};
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
export default function OperationsPanel(){
 const [status,setStatus]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState('');
 const load=useCallback(async()=>{setError('');try{const {data,error:failure}=await supabase.functions.invoke('operations-status',{body:{}});if(failure)throw failure;setStatus(data);}catch(failure){setError(failure.message||'Operations unavailable.');}},[]);
 useEffect(()=>{load();},[load]);
 const toggle=async(job)=>{setSaving(job.key);try{const {error:failure}=await supabase.functions.invoke('operations-status',{body:{action:'set-job',job_key:job.key,enabled:!job.enabled}});if(failure)throw failure;await load();}catch(failure){toast.error(failure.message||'Job could not be changed.');}finally{setSaving('');}};
 return <section className="space-y-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-bold">Operations</h2><Button variant="outline" onClick={load}>Refresh</Button></div>{error?<p role="alert">{error}</p>:!status?<p role="status">Loading operations…</p>:<>
 <p>Server monitoring: {status.monitoring_configured?'configured':'not configured'}. Scheduler: {status.scheduler_ready?'configured':'not configured'}. Recorded failures in the last day: {status.recent_errors||0}.</p>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Job</th><th className="text-left p-2">Status</th><th className="text-left p-2">Last completed</th><th className="p-2">Action</th></tr></thead><tbody>{(status.jobs||[]).map(job=><tr key={job.key}><td className="p-2">{jobNames[job.key]||job.key}</td><td className="p-2">{job.enabled?job.status||'Waiting for first run':'Disabled'}</td><td className="p-2">{job.last_finished?new Date(job.last_finished).toLocaleString('en-ZA'):'No completed run'}</td><td className="p-2"><Button size="sm" variant="outline" disabled={!!saving||(!job.enabled&&!status.scheduler_ready)} onClick={()=>toggle(job)}>{job.enabled?'Disable':'Enable'}</Button></td></tr>)}</tbody></table></div>
 <h3 className="font-bold">Recent events</h3>{status.events?.length?<ul className="space-y-1">{status.events.map((event,index)=><li key={index} className="text-sm">{event.source}: {event.code} {event.http_status||''} — {new Date(event.created_at).toLocaleString('en-ZA')}</li>)}</ul>:<p>No events recorded. This does not prove every service is healthy.</p>}
 </>}</section>;
}
