import {mergeDirectMessages} from '@/lib/direct-messages';
import {useCallback,useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {withTimeout} from '@/lib/auth-utils';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {toast} from 'sonner';

export default function MessagingInbox({user,initialRecipientId=''}){
 const [contacts,setContacts]=useState([]),[selected,setSelected]=useState(initialRecipientId),[messages,setMessages]=useState([]);
 const [draft,setDraft]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[hasOlder,setHasOlder]=useState(false);
 const sendingRef=useRef(false),request=useRef(null),generation=useRef(0),bottom=useRef(null);
 const contact=contacts.find(c=>c.user_id===selected);
 const call=async(name,args={})=>{const {data,error}=await withTimeout(supabase.rpc(name,args));if(error)throw error;return data;};
 const load=useCallback(async(silent=false)=>{
  const epoch=generation.current;
  if(!user?.id)return;
  if(!silent)setLoading(true);
  try{
   const [people,rows]=await Promise.all([call('messaging_contacts'),selected?call('read_direct_thread',{other_user:selected}):Promise.resolve([])]);
   if(epoch!==generation.current)return;
   setContacts(people||[]);setMessages(previous=>mergeDirectMessages(previous,rows||[]));if(!silent)setHasOlder(rows?.length===50);setError('');
   if(selected&&document.visibilityState==='visible'){
    const newestIncoming=(rows||[]).find(row=>row.recipient_id===user.id);
    if(newestIncoming)await call('mark_direct_read',{other_user:selected,through_message:newestIncoming.id});
   }
  }catch{if(epoch===generation.current)setError('Messages could not be refreshed. Your draft is kept. Please retry.');}
  finally{if(epoch===generation.current)setLoading(false);}
 },[user?.id,selected]);
 useEffect(()=>{generation.current++;setMessages([]);setDraft('');request.current=null;load();
  const refresh=()=>{if(document.visibilityState==='visible')load(true);};
  const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);
  return()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[load]);
 const choose=id=>{if(sendingRef.current)return;if(draft.trim()&&!window.confirm('Discard your unsent message and switch conversations?'))return;setSelected(id);};
 const older=async()=>{if(!messages[0])return;const epoch=generation.current;try{const rows=await call('read_direct_thread',{other_user:selected,cursor_time:messages[0].created_at,cursor_id:messages[0].id});if(epoch!==generation.current)return;setMessages(previous=>mergeDirectMessages(previous,rows||[]));setHasOlder(rows?.length===50);}catch{toast.error('Older messages could not be loaded. Please retry.');}};
 const send=async e=>{e.preventDefault();const text=draft.trim();if(sendingRef.current||!text||!selected)return;
  sendingRef.current=true;setSending(true);
  if(request.current?.text!==text||request.current?.recipient!==selected)request.current={text,recipient:selected,id:crypto.randomUUID()};
  try{const row=await call('send_direct_message',{to_user:selected,message_text:text,client_request_id:request.current.id});setMessages(previous=>mergeDirectMessages(previous,[row]));setDraft('');request.current=null;setError('');bottom.current?.scrollIntoView({block:'nearest'});await load(true);}
  catch(err){toast.error(err.message||'Message was not confirmed. Your draft is kept; retry safely.');}
  finally{sendingRef.current=false;setSending(false);}
 };
 return <section aria-label="Free messages" className="rounded-xl border bg-card p-3 sm:p-5 space-y-4">
  <header><h2 className="text-xl font-bold">Messages</h2><p className="text-sm text-muted-foreground">Free person-to-person text messaging. No AI or premium plan is needed.</p><p className="text-xs text-muted-foreground mt-1">Learners and parents can contact verified tutors. Approved parent–learner links and existing tutoring contacts appear here. Messages refresh every five seconds while open.</p></header>
  {error&&<div role="alert" className="rounded-lg border p-3"><p>{error}</p><Button type="button" variant="outline" onClick={()=>load()}>Retry messages</Button></div>}
  <label className="block text-sm font-medium">Conversation<select aria-label="Conversation" value={selected} disabled={sending} onChange={e=>choose(e.target.value)} className="mt-1 block w-full min-w-0 rounded-lg border bg-background p-3"><option value="">Choose a contact</option>{contacts.map(c=><option key={c.user_id} value={c.user_id}>{c.full_name} · {c.role}{Number(c.unread_count)>0?` · ${c.unread_count} unread`:''}</option>)}</select></label>
  {loading?<p role="status">Loading messages…</p>:!selected?<p className="text-sm">{contacts.length?'Choose a contact to start or continue a conversation.':'No contacts yet. Learners and parents can find verified tutors here; tutors will see enquiries and their existing clients.'}</p>:<>
   <div className="h-80 overflow-y-auto rounded-lg bg-muted/30 p-3 space-y-3" aria-label="Conversation history" aria-live="polite">
    {hasOlder&&<Button type="button" variant="outline" onClick={older}>Load older messages</Button>}
    {!messages.length&&<p className="text-sm text-muted-foreground">No messages in this conversation yet.</p>}
    {messages.map(m=><article key={m.id} className={`rounded-lg p-3 max-w-[95%] sm:max-w-[85%] ${m.sender_id===user.id?'ml-auto bg-primary text-primary-foreground':'mr-auto border bg-card'}`}><p className="text-xs font-semibold">{m.sender_id===user.id?'You':contact?.full_name||'Contact'}</p><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p><p className="text-xs opacity-75 mt-1">{new Date(m.created_at).toLocaleString('en-ZA')}{m.sender_id===user.id?m.read_at?' · Read':' · Sent':''}</p></article>)}<div ref={bottom}/>
   </div>
   {contact?.can_send?<form onSubmit={send} className="space-y-2"><label className="block text-sm font-medium">Your message<Textarea aria-label="Your message" maxLength={4000} rows={3} value={draft} disabled={sending} onChange={e=>setDraft(e.target.value)} placeholder="Write a message…"/></label><div className="flex flex-wrap justify-between gap-2 items-center"><span className="text-xs text-muted-foreground">{draft.length}/4000</span><Button type="submit" disabled={sending||!draft.trim()}>{sending?'Sending…':'Send message'}</Button></div></form>:<p className="text-sm">This conversation is read-only because the account or relationship is no longer eligible.</p>}
  </>}
 </section>;
}
