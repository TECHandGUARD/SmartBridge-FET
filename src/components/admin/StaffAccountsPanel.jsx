import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
import {STAFF_DUTIES} from '@/lib/staff-access';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
const EMPTY={email:'',permissions:[],enabled:true,version:0};
export default function StaffAccountsPanel(){
 const [form,setForm]=useState(EMPTY),[roster,setRoster]=useState({accounts:[],audit:[]}),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{
  const {data,error}=await withTimeout(supabase.rpc('staff_account_roster'));if(error)throw error;
  if(!data||!Array.isArray(data.accounts)||!Array.isArray(data.audit))throw new Error('Staff accounts could not be loaded.');setRoster(data);
 }catch(e){setError(e.message);setRoster({accounts:[],audit:[]});}finally{setLoading(false);}},[]);
 useEffect(()=>{load();},[load]);
 const save=async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{
  const {error}=await withTimeout(supabase.rpc('set_staff_account',{p_email:form.email.trim(),p_permissions:form.permissions,p_enabled:form.enabled,p_expected_version:form.version}));if(error)throw error;
  setForm(EMPTY);setNotice('Staff access saved. Your changes are now active.');await load();
 }catch(e){setError(e.message+' Refresh the staff list and confirm the saved state before retrying.');}finally{setBusy(false);}};
 return <section className="space-y-5">
 <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">Staff accounts</h2><p className="text-sm text-muted-foreground">Full administrators assign duties to individual staff logins.</p></div><Button variant="outline" onClick={load} disabled={loading||busy}>Refresh staff list</Button></div>
 <Card><CardHeader><CardTitle>{form.version?'Edit staff access':'Add a staff account'}</CardTitle></CardHeader><CardContent>
 <p className="text-sm text-muted-foreground mb-4">Ask the staff member to register and confirm their own email first. Verify their identity, then enter that email here. They keep their own password and use the Staff workspace after signing in.</p>
 <form onSubmit={save} className="space-y-4">
 <label className="block text-sm">Registered staff email<Input type="email" required maxLength={254} readOnly={form.version>0} value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
 <fieldset disabled={busy} className="space-y-3"><legend className="font-semibold mb-2">Assigned duties</legend>
 {STAFF_DUTIES.map(d=><label key={d.key} className="flex gap-3 rounded-xl border p-3"><input type="checkbox" checked={form.permissions.includes(d.key)} onChange={e=>setForm({...form,permissions:e.target.checked?[...form.permissions,d.key]:form.permissions.filter(k=>k!==d.key)})}/><span><strong className="block text-sm">{d.label}</strong><span className="text-xs text-muted-foreground">{d.description}</span></span></label>)}
 <label className="flex gap-3 items-center"><input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>Staff access enabled</label>
 </fieldset>
 <div className="flex gap-3"><Button disabled={busy||!form.email.trim()||(form.enabled&&!form.permissions.length)}>{busy?'Saving staff access…':'Save staff access'}</Button>{form.version>0&&<Button type="button" variant="outline" disabled={busy} onClick={()=>setForm(EMPTY)}>Cancel edit</Button>}</div>
 </form></CardContent></Card>
 {error&&<p role="alert" className="text-red-700 break-words">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {loading?<p role="status">Loading staff accounts…</p>:<div className="space-y-3">{!roster.accounts.length&&<p>No staff accounts added yet.</p>}{roster.accounts.map(s=><Card key={s.user_id}><CardContent className="pt-4 space-y-2"><h3 className="font-semibold break-words">{s.full_name||s.email}</h3><p className="text-sm break-words">{s.email}</p><p className="text-sm">{s.enabled&&s.is_active?'Enabled':'Suspended or account inactive'} · {s.permissions.map(k=>STAFF_DUTIES.find(d=>d.key===k)?.label||k).join(', ')||'No duties'}</p><Button type="button" variant="outline" disabled={busy} onClick={()=>{setForm({email:s.email,permissions:s.permissions,enabled:s.enabled,version:s.version});setNotice('');setError('');}}>Edit permissions / suspend</Button></CardContent></Card>)}</div>}
 <p className="text-sm"><Link className="text-primary underline" to="/staff">Open Staff workspace</Link></p>
 <Card><CardHeader><CardTitle>Recent staff and access activity</CardTitle></CardHeader><CardContent className="space-y-3">{!roster.audit.length&&<p>No activity yet.</p>}{roster.audit.map(a=><article key={a.id} className="border-b pb-3 text-sm break-words"><p>{a.actor_name||'Account'} · {a.area} · {a.action}</p><p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString('en-ZA')} · Record: {a.target_id}</p>{a.area==='staff_accounts'&&<p className="text-xs">Assigned: {(a.detail.permissions||[]).join(', ')||'none'} · {a.detail.enabled?'enabled':'suspended'}</p>}</article>)}</CardContent></Card>
 </section>;
}
