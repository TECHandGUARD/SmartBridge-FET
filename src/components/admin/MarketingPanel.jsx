import {useEffect,useState,useCallback,useRef} from 'react';
import {Link} from 'react-router-dom';
import {supabase} from '@/lib/supabaseClient';
import {useAuth} from '@/lib/AuthContext';
import {withTimeout} from '@/lib/auth-utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import MediaUploadField from '@/components/media/MediaUploadField';
const EMPTY={id:null,slug:'',title:'',summary:'',body:'',kind:'article',event_at:'',published:false,version:0,media:null};
export default function MarketingPanel(){
 const {user}=useAuth();
 const [form,setForm]=useState(EMPTY),[rows,setRows]=useState([]),[metrics,setMetrics]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);const saving=useRef(false);
 const load=useCallback(async()=>{try{const [posts,counts]=await Promise.all([withTimeout(supabase.from('marketing_posts').select('*,marketing_post_media(object_path,media_type,alt_text)').order('created_at',{ascending:false}).limit(200)),withTimeout(supabase.rpc('marketing_metrics'))]);if(posts.error||counts.error)throw posts.error||counts.error;setRows(posts.data||[]);setMetrics(counts.data);setError('');}catch(e){setError(e.message);}},[]);
 useEffect(()=>{load();},[load]);
 async function save(e){
  e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setError('');setNotice('');
  try{
   const {data:savedId,error:saveError}=await withTimeout(supabase.rpc('save_marketing_post',{p_id:form.id,p_slug:form.slug,p_title:form.title,p_summary:form.summary,p_body:form.body,p_kind:form.kind,p_event_at:form.event_at?new Date(form.event_at).toISOString():null,p_published:form.published,p_version:form.version}));
   if(saveError)throw saveError;
   if(!savedId)throw new Error('The post was saved without returning its identifier. Refresh before retrying.');
   if(form.media?.path){const {error:mediaError}=await withTimeout(supabase.from('marketing_post_media').upsert({post_id:savedId,object_path:form.media.path,media_type:form.media.kind,alt_text:form.media.caption||''},{onConflict:'post_id'}));if(mediaError)throw mediaError;}
   else {const {error:mediaError}=await withTimeout(supabase.from('marketing_post_media').delete().eq('post_id',savedId));if(mediaError)throw mediaError;}
   setForm(EMPTY);setNotice('Post and campaign media saved.');await load();
  }catch(e){setError(e.message+' Refresh the list before retrying to confirm whether your post was saved.');}
  finally{saving.current=false;setBusy(false);}
 }
 const editPost=p=>{const media=p.marketing_post_media?.[0];setForm({...p,event_at:p.event_at?new Date(new Date(p.event_at).getTime()-new Date(p.event_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'',media:media?{path:media.object_path,kind:media.media_type,caption:media.alt_text||''}:null});setNotice('');setError('');};
 return <section className="space-y-6">
  <div className="flex justify-between flex-wrap gap-3"><div><h2 className="text-2xl font-bold">Marketing & public posts</h2><p>Publish articles, campaigns and events with image or video creative attached to the existing post.</p></div><Button variant="outline" disabled={busy} onClick={load}>Refresh posts</Button></div>
  <form onSubmit={save} className="border rounded-2xl p-5 grid gap-4 shadow-sm">
   <h3 className="font-bold">{form.id?'Edit post':'New post'}</h3>
   <label>Title<Input required maxLength={160} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>Link name<Input required pattern="[a-z0-9][a-z0-9-]{2,79}" placeholder="exam-preparation-workshop" readOnly={!!form.id} value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})}/></label>
   <label>Type<select className="block border rounded-lg p-2 bg-background" value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option value="article">Article</option><option value="campaign">Campaign</option><option value="event">Event</option></select></label>
   <label>Summary<Input maxLength={400} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></label>
   <label>Post content<textarea className="block w-full min-h-48 rounded-xl border p-3 bg-background" required={form.published} maxLength={30000} value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
   <div className="rounded-2xl border bg-muted/20 p-4 space-y-2"><div><h4 className="font-semibold">Campaign creative</h4><p className="text-xs text-muted-foreground">Add a poster, campaign image or short promotional video. Public media is only shown when its post is published.</p></div><MediaUploadField bucket="marketing-media" pathPrefix={user.id+'/campaigns'} value={form.media} onChange={media=>setForm(current=>({...current,media}))} disabled={busy}/></div>
   {form.kind==='event'&&<label>Event date and time (your device time zone)<Input type="datetime-local" required={form.published} value={form.event_at} onChange={e=>setForm({...form,event_at:e.target.value})}/></label>}
   <label className="flex gap-3"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/>Publish publicly</label>
   <div className="flex flex-wrap gap-3"><Button disabled={busy}>{busy?'Saving…':'Save post'}</Button><Button disabled={busy} variant="outline" type="button" onClick={()=>setForm(EMPTY)}>New / cancel edit</Button></div>
  </form>
  {error&&<p role="alert" className="text-red-700 break-words">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {metrics&&<p>Referred registrations: {metrics.referred_registrations}. Paying members below count verified live payment records after attribution; test payments are excluded.</p>}
  <div className="grid gap-4">{rows.map(p=>{const m=metrics?.campaigns?.find(c=>c.id===p.id),media=p.marketing_post_media?.[0];return <article key={p.id} className="border rounded-2xl p-4 space-y-3 break-words"><h3 className="font-bold">{p.title}</h3><p>{p.published?'Published':'Draft'} · {m?.registrations||0} registrations · {m?.paying_members||0} paying members</p>{media&&<p className="text-xs text-muted-foreground">Attached {media.media_type} · {media.alt_text||'No caption supplied'}</p>}<Button variant="outline" disabled={busy} onClick={()=>editPost(p)}>Edit {p.title}</Button>{p.published&&<Link className="block underline" to={'/news/'+p.slug+'?campaign='+p.slug}>Open public post</Link>}</article>;})}</div>
 </section>;
}
