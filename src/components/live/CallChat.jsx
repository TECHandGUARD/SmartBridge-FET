import {useEffect,useRef,useState} from 'react';
import {MessageSquare,Send} from 'lucide-react';
import {Button} from '@/components/ui/button';
export default function CallChat({chat,userId,participants=[]}){
 const [draft,setDraft]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const list=useRef(null);
 useEffect(()=>{const node=list.current;if(node&&node.scrollHeight-node.scrollTop-node.clientHeight<180)node.scrollTop=node.scrollHeight;},[chat.messages]);
 const post=event=>{event.preventDefault();setError('');try{const count=chat.transport.send(draft);setDraft('');setNotice(`Sent to ${count} connected participant${count===1?'':'s'}.`);}catch(problem){setError(problem.message);}};
 return <section className="rounded-2xl border bg-background p-4 sm:p-5 space-y-3 mt-5" aria-labelledby="call-chat-heading">
  <h3 id="call-chat-heading" className="font-semibold flex items-center gap-2"><MessageSquare size={18} aria-hidden="true"/>Comments and chat</h3>
  <p className="text-sm text-muted-foreground">Prefer typing? Post a message to connected participants. Works with your microphone and camera off.</p>
  <div ref={list} role="log" aria-label="Call messages" aria-live="polite" aria-relevant="additions" className="max-h-72 overflow-y-auto space-y-3 rounded-xl bg-muted/30 p-3">
   {!chat.messages.length&&<p className="text-sm text-muted-foreground">No messages yet.</p>}
   {chat.messages.map(message=><article key={message.id} className="rounded-lg border bg-background p-3 text-sm"><p className="text-xs text-muted-foreground mb-1">{message.senderId===userId?'You':participants.find(person=>person.user_id===message.senderId)?.full_name||'Participant'} · <time dateTime={new Date(message.at).toISOString()}>{new Date(message.at).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</time></p><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.text}</p></article>)}
  </div>
  <form onSubmit={post} className="space-y-2">
   <label htmlFor="call-message" className="text-sm font-medium">Your message</label>
   <textarea id="call-message" rows={3} maxLength={1000} value={draft} onChange={event=>setDraft(event.target.value)} className="w-full rounded-xl border bg-background p-3 text-sm" placeholder="Type your question or comment…"/>
   <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{draft.length}/1,000</span><Button type="submit" disabled={!draft.trim()||!chat.peers} className="gap-2"><Send size={16} aria-hidden="true"/>Post message</Button></div>
  </form>
  <p role="status" className="text-xs text-muted-foreground">{chat.peers?notice||`${chat.peers} participant${chat.peers===1?' is':'s are'} connected to chat.`:'Waiting for another participant to connect to chat.'}</p>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  <p className="text-xs text-muted-foreground">Visible to connected people in this call. Messages are not saved, are not sent to people who join later, and clear when you leave. Keep comments respectful and avoid sharing private information.</p>
 </section>;
}
