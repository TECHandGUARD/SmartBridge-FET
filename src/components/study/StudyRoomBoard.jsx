import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Badge} from '@/components/ui/badge';
import {Card,CardContent} from '@/components/ui/card';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Loader2,MessageCircle,Plus,Trash2,Flag,Heart} from 'lucide-react';
import {toast} from 'sonner';
const POST_FIELDS='id,room_id,subject,author_name,author_id,type,title,body,is_pinned,is_locked,is_hidden,is_archived,reply_count,upvotes,created_at,updated_at,moderation_status';
const REPLY_FIELDS='id,post_id,author_id,author_name,body,moderation_status,created_at';
const REPORT_REASONS=['spam','harassment','hate_speech','inappropriate','false_info','privacy','other'];
const PAGE_SIZE=20;

export default function StudyRoomBoard({room,user}) {
 const [posts,setPosts]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const [form,setForm]=useState({type:'Note',title:'',body:''}),[showForm,setShowForm]=useState(false),[posting,setPosting]=useState(false);
 const [filter,setFilter]=useState('all'),[page,setPage]=useState(0),[hasMore,setHasMore]=useState(false);
 const [replyText,setReplyText]=useState({}),[replyBusy,setReplyBusy]=useState(null),[expanded,setExpanded]=useState(null),[replies,setReplies]=useState({});
 const [liked,setLiked]=useState(new Set()),[report,setReport]=useState(null),[reason,setReason]=useState('spam'),[comment,setComment]=useState(''),[reporting,setReporting]=useState(false);
 const [deleting,setDeleting]=useState(null),[deleteBusy,setDeleteBusy]=useState(false);
 const generation=useRef(0),requestKeys=useRef(new Map());
 const admin=user?.is_super_admin===true;
 const keyFor=(scope,content)=>{const previous=requestKeys.current.get(scope);if(previous?.content===content)return previous.id;const id=crypto.randomUUID();requestKeys.current.set(scope,{content,id});return id;};
 const load=useCallback(async(reset=true)=>{
  const epoch=generation.current;setLoading(true);setError('');
  try {
   let query=supabase.from('study_room_posts').select(POST_FIELDS).eq('room_id',room.id).eq('is_archived',false).order('is_pinned',{ascending:false}).order('created_at',{ascending:false});
   if(filter!=='all')query=query.eq('type',filter);
   const offset=reset?0:page*PAGE_SIZE;const {data,error:failure}=await query.range(offset,offset+PAGE_SIZE-1);if(failure)throw failure;
   if(epoch!==generation.current)return;
   setPosts(previous=>reset?data||[]:[...previous,...(data||[])]);setPage(reset?1:page+1);setHasMore(data?.length===PAGE_SIZE);
   if(data?.length){const result=await supabase.from('study_room_reactions').select('post_id,type').in('post_id',data.map(post=>post.id)).eq('user_id',user.id);if(result.error)throw result.error;if(epoch===generation.current)setLiked(previous=>new Set([...(reset?[]:previous),...(result.data||[]).filter(item=>item.type==='heart').map(item=>item.post_id)]));}
  }catch{if(epoch===generation.current)setError('Could not load the room. Please retry.');}finally{if(epoch===generation.current)setLoading(false);}
 },[room.id,user.id,filter,page]);
 useEffect(()=>{generation.current++;setPosts([]);setReplies({});setExpanded(null);setPage(0);requestKeys.current.clear();load(true);return()=>{generation.current++;};},[room.id,filter]);
 const allowed=async action=>{const {data,error}=await supabase.functions.invoke('check-rate-limit',{body:{action}});if(error)throw new Error('Could not check posting limits. Please retry.');if(!data?.allowed)throw new Error('Please wait before submitting again.');};
 const submitPost=async event=>{
  event.preventDefault();if(posting)return;setPosting(true);
  try {await allowed('posts');const body={room_id:room.id,type:form.type,title:form.title.trim()||null,body:form.body.trim(),request_id:keyFor('post',JSON.stringify(form))};const result=await supabase.functions.invoke('moderate-post',{body});if(result.error||!result.data?.id)throw new Error('Post could not be submitted.');requestKeys.current.delete('post');setForm({type:'Note',title:'',body:''});setShowForm(false);toast.success('Post submitted for administrator review.');await load(true);}catch(error){toast.error(error.message);}finally{setPosting(false);}
 };
 const loadReplies=async id=>{const {data,error}=await supabase.from('study_room_replies').select(REPLY_FIELDS).eq('post_id',id).order('created_at',{ascending:true}).limit(50);if(error){toast.error('Could not load replies');return;}setReplies(previous=>({...previous,[id]:data||[]}));};
 const submitReply=async post=>{
  if(replyBusy)return;const text=String(replyText[post.id]||'').trim();if(!text)return;setReplyBusy(post.id);
  try {await allowed('replies');const result=await supabase.functions.invoke('moderate-reply',{body:{post_id:post.id,body:text,request_id:keyFor('reply:'+post.id,text)}});if(result.error||!result.data?.id)throw new Error('Reply could not be submitted.');requestKeys.current.delete('reply:'+post.id);setReplyText(previous=>({...previous,[post.id]:''}));await loadReplies(post.id);toast.success('Reply submitted for administrator review.');}catch(error){toast.error(error.message);}finally{setReplyBusy(null);}
 };
 const react=async post=>{
  try {const result=liked.has(post.id)?await supabase.from('study_room_reactions').delete().eq('post_id',post.id).eq('user_id',user.id).eq('type','heart'):await supabase.from('study_room_reactions').insert({post_id:post.id,user_id:user.id,type:'heart'});if(result.error)throw result.error;setLiked(previous=>{const next=new Set(previous);if(next.has(post.id))next.delete(post.id);else next.add(post.id);return next;});}catch{toast.error('Could not update your reaction');}
 };
 const submitReport=async event=>{
  event.preventDefault();if(!report||reporting)return;setReporting(true);
  try {await allowed('reports');const result=await supabase.functions.invoke('report-content',{body:{post_id:report.id,reason,comment:comment.trim()||null}});if(result.error||!result.data?.approved)throw new Error('Report could not be submitted.');setReport(null);setComment('');toast.success('Report received for administrator review.');}catch(error){toast.error(error.message);}finally{setReporting(false);}
 };
 const review=async(post,decision)=>{const {error}=await supabase.rpc('review_study_content',{kind:'post',target:post.id,decision});if(error){toast.error('Could not change this post');return;}await load(true);};
 const deletePost=async()=>{if(!deleting||deleteBusy)return;setDeleteBusy(true);try{const result=await supabase.rpc('archive_study_post',{target:deleting.id});if(result.error)throw result.error;setDeleting(null);await load(true);toast.success('Post removed from the room');}catch{toast.error('Could not delete the post');}finally{setDeleteBusy(false);}};
 return <section className="space-y-4" aria-label={`${room.name} study board`}>
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">{room.name} study board</h2><p className="text-sm text-muted-foreground">Posts and replies are reviewed before appearing to the room. Avoid sharing contact details.</p></div><Button type="button" onClick={()=>setShowForm(previous=>!previous)}><Plus className="w-4 h-4"/>{showForm?'Cancel':'New post'}</Button></div>
  {showForm&&<form onSubmit={submitPost} className="space-y-3 rounded-xl border p-4"><label className="block text-sm">Post type<Select value={form.type} onValueChange={type=>setForm(previous=>({...previous,type}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Note">Note</SelectItem><SelectItem value="Question">Question</SelectItem></SelectContent></Select></label><label className="block text-sm">Title<Input maxLength={200} value={form.title} onChange={event=>setForm(previous=>({...previous,title:event.target.value}))}/></label><label className="block text-sm">Your post<Textarea required maxLength={10000} value={form.body} onChange={event=>setForm(previous=>({...previous,body:event.target.value}))}/></label><Button type="submit" disabled={posting||!form.body.trim()}>{posting?<Loader2 className="w-4 h-4 animate-spin"/>:null}Submit for review</Button></form>}
  <label className="block text-sm max-w-xs">Show<Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All posts</SelectItem><SelectItem value="Note">Notes</SelectItem><SelectItem value="Question">Questions</SelectItem></SelectContent></Select></label>
  {error&&<div role="alert" className="rounded-xl border p-4"><p>{error}</p><Button type="button" variant="outline" onClick={()=>load(true)}>Retry</Button></div>}
  {posts.map(post=><Card key={post.id} className={post.is_hidden?'opacity-60':''}><CardContent className="pt-5 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{post.type}</Badge>{post.moderation_status!=='approved'&&<Badge variant="secondary">{post.moderation_status==='pending'?'Awaiting review':'Not published'}</Badge>}{post.is_hidden&&<Badge variant="destructive">Hidden</Badge>}<span className="text-xs text-muted-foreground">{post.author_name} · {new Date(post.created_at).toLocaleDateString('en-ZA')}</span></div>{post.title&&<h3 className="font-semibold">{post.title}</h3>}<p className="whitespace-pre-wrap break-words">{post.body}</p><div className="flex flex-wrap gap-2">{post.moderation_status==='approved'&&!post.is_hidden&&<><Button type="button" size="sm" variant="outline" aria-pressed={liked.has(post.id)} onClick={()=>react(post)}><Heart className="w-4 h-4"/>Like</Button><Button type="button" size="sm" variant="outline" onClick={()=>{setExpanded(expanded===post.id?null:post.id);loadReplies(post.id);}}><MessageCircle className="w-4 h-4"/>Replies ({post.reply_count||0})</Button>{post.author_id!==user.id&&<Button type="button" size="sm" variant="ghost" onClick={()=>setReport(post)}><Flag className="w-4 h-4"/>Report</Button>}</>}{post.author_id===user.id&&<Button type="button" size="sm" variant="ghost" onClick={()=>setDeleting(post)}><Trash2 className="w-4 h-4"/>Delete</Button>}{admin&&<><Button type="button" size="sm" variant="outline" onClick={()=>review(post,post.is_hidden?'visible':'hidden')}>{post.is_hidden?'Show':'Hide'}</Button><Button type="button" size="sm" variant="outline" onClick={()=>review(post,post.is_locked?'unlocked':'locked')}>{post.is_locked?'Unlock replies':'Lock replies'}</Button></>}</div>{expanded===post.id&&<div className="space-y-3 border-t pt-3">{(replies[post.id]||[]).map(reply=><div key={reply.id} className="rounded-lg bg-muted p-3"><p className="text-xs font-medium">{reply.author_name}{reply.moderation_status==='pending'?' · Awaiting review':''}</p><p className="whitespace-pre-wrap break-words text-sm">{reply.body}</p></div>)}{!post.is_locked?<div><label className="block text-sm">Your reply<Textarea maxLength={5000} value={replyText[post.id]||''} onChange={event=>setReplyText(previous=>({...previous,[post.id]:event.target.value}))}/></label><Button type="button" className="mt-2" disabled={Boolean(replyBusy)||!String(replyText[post.id]||'').trim()} onClick={()=>submitReply(post)}>Submit reply for review</Button></div>:<p className="text-sm">Replies are locked.</p>}</div>}</CardContent></Card>)}
  {loading&&<p role="status" className="text-sm">Loading posts…</p>}{!loading&&!error&&!posts.length&&<p className="text-sm text-muted-foreground">No posts yet. Start with a note or question.</p>}{hasMore&&<Button type="button" variant="outline" disabled={loading} onClick={()=>load(false)}>Load more</Button>}
  <Dialog open={Boolean(report)} onOpenChange={open=>{if(!open&&!reporting)setReport(null);}}><DialogContent><DialogHeader><DialogTitle>Report this post</DialogTitle></DialogHeader><form onSubmit={submitReport} className="space-y-3"><label className="block text-sm">Reason<Select value={reason} onValueChange={setReason}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{REPORT_REASONS.map(value=><SelectItem key={value} value={value}>{value.replaceAll('_',' ')}</SelectItem>)}</SelectContent></Select></label><label className="block text-sm">Optional explanation<Textarea maxLength={1000} value={comment} onChange={event=>setComment(event.target.value)}/></label><Button type="submit" disabled={reporting}>Submit report</Button></form></DialogContent></Dialog>
  <Dialog open={Boolean(deleting)} onOpenChange={open=>{if(!open&&!deleteBusy)setDeleting(null);}}><DialogContent><DialogHeader><DialogTitle>Remove your post?</DialogTitle></DialogHeader><p>The post and its replies will no longer appear in the room.</p><div className="flex gap-2"><Button type="button" variant="outline" disabled={deleteBusy} onClick={()=>setDeleting(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={deleteBusy} onClick={deletePost}>Remove post</Button></div></DialogContent></Dialog>
 </section>;
}
