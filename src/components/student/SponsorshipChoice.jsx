import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
export default function SponsorshipChoice({value='',onChange,disabled=false,refreshKey=''}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let mounted=true;setLoading(true);
  Promise.all([withTimeout(supabase.from('sponsorship_allocations').select('id,label,budget').eq('active',true)),withTimeout(supabase.from('sponsorship_reservations').select('allocation_id,amount,state'))]).then(([a,r])=>{
   if(a.error||r.error)throw a.error||r.error;
   if(mounted){setRows((a.data||[]).map(row=>({...row,remaining:Number(row.budget)-(r.data||[]).filter(item=>item.allocation_id===row.id&&item.state!=='released').reduce((sum,item)=>sum+Number(item.amount),0)})));setError('');}
  }).catch(()=>{if(mounted)setError('Sponsored funding could not be loaded. You can retry or book without sponsorship.');}).finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[retry,refreshKey]);
 if(loading)return <p className="text-xs text-muted-foreground" role="status">Checking sponsored session funding…</p>;
 if(error)return <p className="text-sm" role="status">{error} <button type="button" className="underline" onClick={()=>setRetry(v=>v+1)}>Retry</button></p>;
 if(!rows.length)return null;
 return <div className="space-y-1"><label className="text-sm font-medium" htmlFor="session-funding">Session funding</label><select id="session-funding" className="w-full rounded-md border bg-background p-2 text-sm" value={disabled?'':value} disabled={disabled} onChange={e=>onChange(e.target.value)}><option value="">Pay myself / free session</option>{rows.map(row=><option key={row.id} value={row.id}>{row.label} · R{row.remaining.toFixed(2)} remaining</option>)}</select><p className="text-xs text-muted-foreground">Sponsorship covers the full session when approved funding is available. The final balance is checked when booking. Cancellations return the reserved budget; no cash refund is paid to the learner.</p></div>;
}
