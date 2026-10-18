import {useState,useEffect,useCallback} from 'react';
import {useAuth} from '@/lib/AuthContext';
import {supabase} from '@/lib/supabaseClient';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
const emptyQuestion=()=>({type:'written',prompt:'',marks:5,options:['','','',''],correct_index:0});
const fresh=()=>({title:'',subject:'Mathematics',grade:10,kind:'assignment',student_id:'',instructions:'',opens_at:'',due_at:'',time_limit_minutes:'',questions:[emptyQuestion()]});
const err=e=>toast.error(e?.message||'Request failed');
function TutorCentre({user}){
 const [students,setStudents]=useState([]),[items,setItems]=useState([]),[subs,setSubs]=useState([]),[form,setForm]=useState(fresh),[busy,setBusy]=useState(false),[marking,setMarking]=useState({});
 const load=useCallback(async()=>{
  const [a,b]=await Promise.all([supabase.from('tutor_assessments').select('*').eq('tutor_id',user.id).order('created_at',{ascending:false}),supabase.from('tutor_bookings').select('student_id,student_name').eq('tutor_id',user.id).in('status',['confirmed','completed'])]);
  if(a.error)err(a.error);else setItems(a.data||[]);
  if(b.error)err(b.error);else setStudents([...new Map((b.data||[]).filter(x=>x.student_id).map(x=>[x.student_id,{id:x.student_id,name:x.student_name||'Learner'}])).values()]);
 },[user.id]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{if(!items.length){setSubs([]);return;}let live=true;supabase.from('tutor_assessment_submissions').select('*').in('assessment_id',items.map(x=>x.id)).then(({data,error})=>{if(live){if(error)err(error);else setSubs(data||[]);}});return()=>{live=false;};},[items]);
 const change=(k,v)=>setForm(f=>({...f,[k]:v}));
 const question=(i,k,v)=>setForm(f=>({...f,questions:f.questions.map((q,j)=>j===i?{...q,[k]:v}:q)}));
 const save=async()=>{
  if(!form.student_id||!form.title.trim()||!form.subject.trim()||!form.opens_at||!form.due_at||form.questions.some(q=>!q.prompt.trim()||(q.type==='mcq'&&q.options.some(o=>!o.trim()))))return toast.error('Complete all required fields and questions.');
  if(new Date(form.due_at)<=new Date(form.opens_at)||new Date(form.due_at)<=new Date())return toast.error('Choose valid opening and future due dates.');
  const max_marks=form.questions.reduce((sum,q)=>sum+Number(q.marks),0);
  if(max_marks>500||max_marks<1||!Number.isInteger(max_marks)||form.questions.some(q=>!Number.isInteger(Number(q.marks))||Number(q.marks)<1||Number(q.marks)>100))return toast.error('Marks must be whole numbers from 1 to 100, total at most 500.');
  setBusy(true);
  const questions=form.questions.map(q=>q.type==='mcq'?{type:q.type,prompt:q.prompt,marks:Number(q.marks),options:q.options,correct_index:Number(q.correct_index)}:{type:'written',prompt:q.prompt,marks:Number(q.marks)});
  const {error}=await supabase.from('tutor_assessments').insert({tutor_id:user.id,student_id:form.student_id,title:form.title,subject:form.subject,grade:Number(form.grade),kind:form.kind,instructions:form.instructions,opens_at:new Date(form.opens_at).toISOString(),due_at:new Date(form.due_at).toISOString(),time_limit_minutes:form.time_limit_minutes?Number(form.time_limit_minutes):null,questions,max_marks,status:'draft'});
  setBusy(false);if(error)return err(error);toast.success('Draft created and sent for admin review. You can publish only after approval.');setForm(fresh());load();
 };
 const changeStatus=async(a,status)=>{setBusy(true);const {error}=await supabase.from('tutor_assessments').update({status}).eq('id',a.id).eq('tutor_id',user.id);setBusy(false);if(error)err(error);else load();};
 const resubmit=async(a)=>{setBusy(true);const {error}=await supabase.rpc('request_tutor_assessment_review',{p_assessment:a.id});setBusy(false);if(error)err(error);else{toast.success('Sent back for admin review');load();}};
 const mark=async(s,a)=>{const m=marking[s.id]||{};const score=m.score===undefined?s.score:Number(m.score);if(score===null||score===''||!Number.isFinite(Number(score))||Number(score)<0||Number(score)>a.max_marks)return toast.error('Enter a mark within the maximum.');setBusy(true);const {error}=await supabase.rpc('mark_tutor_assessment',{p_submission:s.id,p_score:Number(score),p_feedback:m.feedback===undefined?s.feedback:m.feedback});setBusy(false);if(error)err(error);else{toast.success('Mark saved');load();}};
 const openFile=async(path)=>{const {data,error}=await supabase.storage.from('tutor-assessments').createSignedUrl(path,60);if(error)err(error);else window.open(data.signedUrl,'_blank','noopener,noreferrer');};
 return <div className="w-full min-w-0 space-y-5">
 <Card className="min-w-0 overflow-hidden"><CardHeader><CardTitle>Set a test, assignment, quiz or exam</CardTitle><p className="text-sm text-muted-foreground">Create questions here, save your draft and wait for admin approval before publishing.</p></CardHeader><CardContent className="min-w-0 space-y-4">
 <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
 <label>Assigned learner<select className="block min-h-11 min-w-0 w-full rounded border bg-background p-2" value={form.student_id} onChange={e=>change('student_id',e.target.value)}><option value="">Select learner with confirmed booking</option>{students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label>Assessment type<select className="block border rounded p-2 w-full bg-background" value={form.kind} onChange={e=>change('kind',e.target.value)}>{['quiz','test','assignment','exam'].map(t=><option key={t}>{t}</option>)}</select></label>
 <label className="min-w-0">Title<Input className="mt-1 w-full min-w-0" value={form.title} maxLength={160} onChange={e=>change('title',e.target.value)}/></label>
 <label className="min-w-0">Subject<Input className="mt-1 w-full min-w-0" value={form.subject} maxLength={100} onChange={e=>change('subject',e.target.value)}/></label>
 <label>Grade<select className="block border rounded p-2 w-full bg-background" value={form.grade} onChange={e=>change('grade',Number(e.target.value))}>{[10,11,12].map(g=><option key={g} value={g}>{g}</option>)}</select></label>
 <label className="min-w-0">Time limit (minutes, optional)<Input className="mt-1 w-full min-w-0" type="number" min="5" max="240" value={form.time_limit_minutes} onChange={e=>change('time_limit_minutes',e.target.value)}/></label>
 <label className="min-w-0">Opening time<Input className="mt-1 w-full min-w-0" type="datetime-local" value={form.opens_at} onChange={e=>change('opens_at',e.target.value)}/></label>
 <label className="min-w-0">Due date<Input className="mt-1 w-full min-w-0" type="datetime-local" value={form.due_at} onChange={e=>change('due_at',e.target.value)}/></label>
 </div><label className="block min-w-0">Instructions<Textarea className="mt-1 w-full min-w-0" maxLength={5000} value={form.instructions} onChange={e=>change('instructions',e.target.value)}/></label>
 {form.questions.map((q,i)=><div key={i} className="min-w-0 space-y-3 rounded border p-3">
 <div className="flex flex-wrap items-center justify-between gap-2"><strong>Question {i+1}</strong><Button variant="outline" disabled={form.questions.length===1} onClick={()=>change('questions',form.questions.filter((_,j)=>j!==i))}>Remove</Button></div>
 <Textarea className="w-full min-w-0" placeholder="Question text" maxLength={2000} value={q.prompt} onChange={e=>question(i,'prompt',e.target.value)}/>
 <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_7rem]"><select className="min-h-11 max-w-full rounded border bg-background p-2" value={q.type} onChange={e=>question(i,'type',e.target.value)}><option value="written">Written answer</option><option value="mcq">Multiple choice</option></select><Input className="min-w-0 w-full" aria-label="Marks" type="number" min="1" max="100" value={q.marks} onChange={e=>question(i,'marks',e.target.value)}/></div>
 {q.type==='mcq'&&<div className="space-y-2">{q.options.map((v,j)=><Input key={j} aria-label={'Option '+(j+1)} placeholder={'Option '+(j+1)} value={v} onChange={e=>question(i,'options',q.options.map((o,k)=>k===j?e.target.value:o))}/>)}<label>Correct option <select className="border rounded p-2 bg-background" value={q.correct_index} onChange={e=>question(i,'correct_index',Number(e.target.value))}>{[0,1,2,3].map(n=><option key={n} value={n}>{n+1}</option>)}</select></label></div>}
 </div>)}
 <div className="flex flex-col gap-2 sm:flex-row"><Button className="w-full sm:w-auto" variant="outline" disabled={form.questions.length>=50} onClick={()=>change('questions',[...form.questions,emptyQuestion()])}>Add question</Button><Button className="w-full sm:w-auto" disabled={busy||!students.length} onClick={save}>Save draft</Button></div>
 {!students.length&&<p className="text-sm text-muted-foreground">No eligible learner bookings yet. Once a learner has a confirmed or completed booking with you, you can assign them an assessment.</p>}
 </CardContent></Card>
 <Card className="min-w-0 overflow-hidden"><CardHeader><CardTitle>Assessment management and marking</CardTitle></CardHeader><CardContent className="space-y-4">
 {!items.length&&<p>No assessments created.</p>}
 {items.map(a=><div key={a.id} className="border rounded p-3 space-y-2"><div className="flex flex-wrap justify-between gap-2"><div><strong>{a.title}</strong><p>{a.kind} · {a.subject} · {a.max_marks} marks · {a.status} · Review: {a.moderation_status||'pending'}</p>{a.moderation_reason&&<p className="text-sm">Moderator: {a.moderation_reason}</p>}<p className="text-xs">Due {new Date(a.due_at).toLocaleString()}</p></div>{a.status==='draft'&&a.moderation_status==='approved'?<Button disabled={busy} onClick={()=>changeStatus(a,'published')}>Publish</Button>:a.status==='draft'&&a.moderation_status==='rejected'?<Button disabled={busy} variant="outline" onClick={()=>resubmit(a)}>Request another review</Button>:a.status==='published'?<Button disabled={busy} variant="outline" onClick={()=>changeStatus(a,'closed')}>Close</Button>:null}</div>
 {subs.filter(s=>s.assessment_id===a.id).map(s=><div key={s.id} className="bg-muted/30 rounded p-3 space-y-2"><p className="text-sm">{students.find(x=>x.id===s.student_id)?.name||'Learner'} · {s.status} {s.score!==null?'· '+s.score+'/'+a.max_marks:''}</p>
 {s.status!=='in_progress'&&<>{a.questions.map((q,i)=><p key={i} className="text-sm"><strong>Question {i+1}:</strong> {q.prompt} — {String(s.answers?.[i]??'No answer')}</p>)}
 {s.attachment_path&&<Button variant="outline" onClick={()=>openFile(s.attachment_path)}>View uploaded work</Button>}
 <Input aria-label="Mark" type="number" min="0" max={a.max_marks} placeholder="Score" value={marking[s.id]?.score??s.score??''} onChange={e=>setMarking(m=>({...m,[s.id]:{...m[s.id],score:e.target.value}}))}/>
 <Textarea aria-label="Feedback" placeholder="Tutor feedback" maxLength={5000} value={marking[s.id]?.feedback??s.feedback??''} onChange={e=>setMarking(m=>({...m,[s.id]:{...m[s.id],feedback:e.target.value}}))}/>
 <Button disabled={busy} onClick={()=>mark(s,a)}>Save mark and feedback</Button></>}
 </div>)}</div>)}
 </CardContent></Card></div>;
}
function StudentCentre(){
 const [items,setItems]=useState([]),[current,setCurrent]=useState(null),[answers,setAnswers]=useState({}),[file,setFile]=useState(null),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const {data,error}=await supabase.rpc('my_tutor_assessments');if(error)err(error);else setItems(data||[]);},[]);
 useEffect(()=>{load();},[load]);
 const start=async(a)=>{setBusy(true);const {error}=await supabase.rpc('start_tutor_assessment',{p_assessment:a.id});setBusy(false);if(error)return err(error);setCurrent(a);setAnswers({});setFile(null);};
 const submit=async()=>{if(!window.confirm('Submit your work? You cannot edit it after submitting.'))return;setBusy(true);try{
  let path=null;if(file){if(file.size>10485760||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw Error('Use PDF, PNG or JPEG under 10 MB.');
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw Error('Sign in again.');
   path=current.id+'/'+user.id+'/'+crypto.randomUUID()+'.'+(file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg');
   const {error}=await supabase.storage.from('tutor-assessments').upload(path,file,{contentType:file.type});if(error)throw error;
  }
  const {error}=await supabase.rpc('submit_tutor_assessment',{p_assessment:current.id,p_answers:answers,p_attachment:path});if(error)throw error;
  toast.success('Submitted');setCurrent(null);load();
 }catch(e){err(e);}finally{setBusy(false);}};
 return <div className="space-y-4">{current?<Card><CardHeader><CardTitle>{current.title}</CardTitle></CardHeader><CardContent className="space-y-4">
 <p>{current.instructions}</p><p className="text-sm">Due {new Date(current.due_at).toLocaleString()}{current.time_limit_minutes?' · Time limit: '+current.time_limit_minutes+' minutes from start':''}</p>
 {current.questions.map((q,i)=><div key={i} className="space-y-2"><strong>{i+1}. {q.prompt} ({q.marks} marks)</strong>{q.type==='mcq'?q.options.map((v,j)=><label key={j} className="flex gap-2"><input type="radio" name={'q'+i} checked={answers[i]===String(j)} onChange={()=>setAnswers(a=>({...a,[i]:String(j)}))}/>{v}</label>):<Textarea maxLength={10000} value={answers[i]||''} onChange={e=>setAnswers(a=>({...a,[i]:e.target.value}))}/>}</div>)}
 <label>Optional handwritten work (PDF/JPEG/PNG, 10 MB maximum)<Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
 <Button disabled={busy} onClick={submit}>Submit assessment</Button> <Button variant="outline" onClick={()=>setCurrent(null)}>Back</Button>
 </CardContent></Card>:<><h2 className="text-xl font-semibold">My assigned assessments</h2>{!items.length&&<p>No assigned assessments yet.</p>}
 {items.map(a=><Card key={a.id}><CardContent className="pt-5 flex flex-wrap justify-between gap-3"><div><strong>{a.title}</strong><p>{a.kind} · {a.subject} · Grade {a.grade} · {a.max_marks} marks</p><p className="text-xs">Opens {new Date(a.opens_at).toLocaleString()} · Due {new Date(a.due_at).toLocaleString()}</p><p className="text-sm">{a.submission_status||'Not started'}{a.score!==null?' · '+a.score+'/'+a.max_marks:''}</p>{a.submission_status==='marked'&&a.feedback&&<p>Feedback: {a.feedback}</p>}</div>
 {(!a.submission_status||a.submission_status==='in_progress')&&a.status==='published'&&new Date(a.opens_at)<=new Date()&&new Date(a.due_at)>new Date()&&<Button disabled={busy} onClick={()=>start(a)}>{a.submission_status?'Resume':'Start'}</Button>}
 </CardContent></Card>)}</>}</div>;
}
export default function AssessmentCentre(){const {user}=useAuth();if(!user)return <p>Sign in first.</p>;const tutor=['tutor','sace_tutor','student_tutor'].includes(user.role);return <main className="mx-auto w-full max-w-5xl min-w-0 space-y-5 px-3 py-5 pb-24 sm:p-6"><h1 className="break-words text-2xl font-bold sm:text-3xl">Assessment Centre</h1><p className="text-muted-foreground">Tutor-set quizzes, tests, assignments and exams.</p>{tutor?<TutorCentre user={user}/>:user.role==='student'?<StudentCentre/>:<p>Available to learners and approved tutors.</p>}</main>;}
