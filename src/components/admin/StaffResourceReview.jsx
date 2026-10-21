import FileLink from '@/components/operations/FileLink';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
import {Button} from '@/components/ui/button';
export default function StaffResourceReview(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(null);
 const load=useCallback(async()=>{setLoading(true);setError('');try{const {data,error}=await withTimeout(supabase.rpc('staff_resource_queue'));if(error)throw error;setItems(Array.isArray(data)?data:[]);}catch(e){setItems([]);setError(e.message);}finally{setLoading(false);}},[]);
 useEffect(()=>{load();},[load]);
 const decide=async(id,approved)=>{setBusy(id);setError('');try{const {error}=await withTimeout(supabase.rpc('staff_review_resource',{p_resource:id,p_approved:approved}));if(error)throw error;await load();}catch(e){setError(e.message);}finally{setBusy(null);}};
 return <section className="space-y-4"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">Resource reviews</h2><Button variant="outline" onClick={load} disabled={loading}>Refresh</Button></div>{error&&<p role="alert">{error}</p>}{loading?<p role="status">Loading resources…</p>:!items.length?<p>No resources to review.</p>:items.map(r=><article key={r.id} className="border rounded-xl p-4 space-y-3"><h3 className="font-semibold">{r.title}</h3><p className="text-sm">{r.subject} · {r.grade} · {r.type} · {r.is_rejected?'Rejected':r.is_approved?'Approved':'Pending'}</p>{r.file_url&&<FileLink reference={r.file_url}>Open resource for review</FileLink>}<div className="flex gap-3"><Button disabled={!!busy||r.is_approved} onClick={()=>decide(r.id,true)}>Approve</Button><Button variant="outline" disabled={!!busy||r.is_rejected} onClick={()=>decide(r.id,false)}>Reject</Button></div></article>)}</section>;
}
