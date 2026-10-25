import React,{useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';

const executives=['CEO','COO','CFO','CMO','CIO','General Manager'];
export default function ExecutiveTrainingRecords(){
 const [executive,setExecutive]=useState('COO');
 const [instruction,setInstruction]=useState('');
 const [records,setRecords]=useState([]);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const review=async(id,action)=>{
  if(!supabase || busy)return;
  setBusy(true);setMessage('');
  const {data,error}=await supabase.rpc('ai_review_training',{p_id:id,p_action:action});
  setBusy(false);
  if(error||data!==true){setMessage('Review action failed. Check administrator access and current status.');return;}
  await load();setMessage(action==='approve'?'Instruction approved for review purposes; not activated in live AI.':'Instruction withdrawn.');
 };
 const load=async()=>{
  if(!supabase)return setMessage('Database unavailable.');
  const {data,error}=await supabase.from('ai_executive_training').select('id,executive,instruction,status,version,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)setMessage('Training history unavailable. Administrator access is required.');
  else setRecords(data||[]);
 };
 useEffect(()=>{load();},[]);
 const save=async(e)=>{
  e.preventDefault();
  if(instruction.trim().length<10)return setMessage('Enter at least 10 characters.');
  setBusy(true);setMessage('');
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setMessage('Sign in as an administrator.');setBusy(false);return;}
  const {error}=await supabase.from('ai_executive_training').insert({executive,instruction:instruction.trim(),created_by:user.id,status:'draft'});
  setBusy(false);
  if(error)return setMessage('Unable to save. Check your administrator permission.');
  setInstruction('');setMessage('Draft saved. This does not change an AI executive’s behaviour.');await load();
 };
 return <section className="rounded-xl border bg-card p-5 space-y-4" aria-label="Saved executive training">
  <header><h2 className="text-xl font-semibold">Saved executive instructions</h2><p className="text-sm text-muted-foreground">Phase 1: store draft guidance privately. No instructions are automatically activated or sent to AI models.</p></header>
  <form onSubmit={save} className="space-y-3">
   <label htmlFor="saved-executive" className="block text-sm font-medium">Executive</label>
   <select id="saved-executive" value={executive} onChange={e=>setExecutive(e.target.value)} className="w-full rounded-lg border bg-background p-3">{executives.map(x=><option key={x}>{x}</option>)}</select>
   <label htmlFor="saved-instruction" className="block text-sm font-medium">Draft instruction</label>
   <textarea id="saved-instruction" value={instruction} maxLength={6000} onChange={e=>setInstruction(e.target.value)} rows={4} className="w-full rounded-lg border bg-background p-3 text-base" placeholder="Describe the policy or behaviour this executive should follow…"/>
   <button type="submit" disabled={busy||instruction.trim().length<10} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50">{busy?'Saving…':'Save draft instruction'}</button>
  </form>
  {message&&<p role="status" className="text-sm">{message}</p>}
  <div><h3 className="font-semibold">Training history</h3>{!records.length?<p className="mt-2 text-sm text-muted-foreground">No accessible training records yet.</p>:<ul className="mt-3 space-y-3">{records.map(row=><li key={row.id} className="rounded-lg border p-3"><p className="text-sm font-semibold">{row.executive} · {row.status} · v{row.version}</p><p className="mt-1 text-sm whitespace-pre-wrap break-words">{row.instruction}</p><time className="mt-1 block text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</time><div className="mt-3 flex flex-wrap gap-2">{row.status==='draft'&&<button type="button" disabled={busy} onClick={()=>review(row.id,'approve')} className="rounded-lg border px-3 py-2 disabled:opacity-50">Approve instruction</button>}{(row.status==='draft'||row.status==='approved')&&<button type="button" disabled={busy} onClick={()=>review(row.id,'withdraw')} className="rounded-lg border px-3 py-2 disabled:opacity-50">Withdraw</button>}</div></li>)}</ul>}</div>
 </section>;
}