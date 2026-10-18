import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {Button} from '@/components/ui/button';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';
export default function AssessmentModerationPanel(){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(null),[notes,setNotes]=useState({});
 const load=useCallback(async()=>{setLoading(true);const {data,error}=await supabase.rpc('admin_assessment_review_queue');setLoading(false);if(error)toast.error(error.message);else setItems(data||[]);},[]);
 useEffect(()=>{load();},[load]);
 const decide=async(a,decision)=>{
  const reason=(notes[a.id]||'').trim();
  if(decision!=='approved'&&reason.length<5)return toast.error('Provide a reason of at least 5 characters.');
  if(!window.confirm('Confirm '+decision+' for '+a.title+'?'))return;
  setBusy(a.id);
  const {error}=await supabase.rpc('admin_moderate_tutor_assessment',{p_assessment:a.id,p_decision:decision,p_reason:reason});
  setBusy(null);if(error)toast.error(error.message);else{toast.success('Moderation decision recorded');load();}
 };
 const pending=items.filter(a=>a.moderation_status==='pending');
 return <Card><CardHeader><CardTitle>Assessment moderation</CardTitle><p className="text-sm text-muted-foreground">Admin approval is required before tutors publish quizzes, tests, assignments or examinations. Reviews do not expose learner submissions or marks.</p></CardHeader>
 <CardContent className="space-y-4">
 <div className="flex justify-between items-center"><strong>Pending review: {pending.length}</strong><Button variant="outline" onClick={load} disabled={loading}>Refresh</Button></div>
 {loading?<p>Loading moderation queue…</p>:!items.length?<p>No tutor assessments yet.</p>:items.map(a=><section key={a.id} className="rounded-lg border p-4 space-y-3">
 <div><h3 className="font-semibold">{a.title}</h3><p className="text-sm text-muted-foreground">{a.kind} · {a.subject} · Grade {a.grade} · {a.max_marks} marks</p><p className="text-xs">Tutor ID: {a.tutor_id} · Publication: {a.status} · Review: {a.moderation_status}</p></div>
 <p className="text-sm whitespace-pre-wrap">{a.instructions||'No additional instructions'}</p>
 <ol className="list-decimal pl-5 space-y-2 text-sm">{(a.questions||[]).map((q,i)=><li key={i}><p className="whitespace-pre-wrap">{q.prompt} ({q.marks} marks)</p>{q.type==='mcq'&&<><ol className="list-[lower-alpha] pl-5">{(q.options||[]).map((option,j)=><li key={j}>{option}</li>)}</ol><p className="text-xs font-medium">Answer key: option {Number(q.correct_index)+1}</p></>}</li>)}</ol>
 {a.moderation_reason&&<p className="text-sm">Previous moderation reason: {a.moderation_reason}</p>}
 {(a.moderation_status==='pending'||a.moderation_status==='approved')&&<div className="space-y-2">
 <label className="text-sm block">Moderation notes / rejection reason
 <Textarea maxLength={2000} value={notes[a.id]||''} onChange={e=>setNotes(n=>({...n,[a.id]:e.target.value}))} placeholder="CAPS alignment, answer key, appropriateness, feedback…"/></label>
 <div className="flex flex-wrap gap-2">
 {a.moderation_status==='pending'&&<><Button disabled={busy===a.id} onClick={()=>decide(a,'approved')}>Approve</Button><Button variant="outline" disabled={busy===a.id} onClick={()=>decide(a,'rejected')}>Reject with reason</Button></>}
 {a.moderation_status==='approved'&&<Button variant="destructive" disabled={busy===a.id} onClick={()=>decide(a,'suspended')}>Suspend assessment</Button>}
 </div></div>}
 </section>)}
 </CardContent></Card>;
}