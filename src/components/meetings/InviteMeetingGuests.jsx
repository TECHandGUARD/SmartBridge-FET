import {useRef,useState} from 'react';
import {supabase} from '@/lib/supabaseClient';
import {dispatchMeetingNotifications} from '@/lib/action-notifications';
export default function InviteMeetingGuests({meeting,onRefresh}){
 const [emails,setEmails]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const request=useRef(null),lock=useRef(false);
 const invite=async event=>{
  event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');
  try{
   const addresses=emails.split(/[,;\n]/).map(value=>value.trim()).filter(Boolean),fingerprint=JSON.stringify(addresses);
   if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:crypto.randomUUID()};
   const {error:problem}=await supabase.rpc('invite_virtual_meeting_guests',{meeting_key:meeting.id,invite_emails:addresses,client_request_id:request.current.id});
   if(problem)throw problem;request.current=null;setEmails('');await onRefresh();
   const delivery=await dispatchMeetingNotifications(meeting.id);setNotice(delivery.status==='accepted'?'Guest invitation emails accepted for sending. Each new guest has five minutes to join.':'Guest invitations are saved and queued for email delivery. Each new guest has five minutes to join.');
  }catch(e){setError(e.message);}finally{lock.current=false;setBusy(false);}
 };
 return <form onSubmit={invite} className="studio-form space-y-3" aria-label="Invite guests during meeting"><h3 className="font-semibold">Bring someone into the conversation</h3><label className="block text-sm">Guest account emails<textarea aria-label="Guest account emails" required className="mt-1 block w-full rounded border bg-background p-2" value={emails} onChange={event=>setEmails(event.target.value)} placeholder="parent@example.com"/></label><p className="text-xs text-muted-foreground">Use registered parent, administrator or verified tutor emails. This room supports six people including you. Guests added during the call get a fresh five-minute joining window.</p>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="text-sm">{notice}</p>}<button disabled={busy} className="studio-button studio-button--primary">{busy?'Sending…':'Send guest invitations'}</button></form>;
}
