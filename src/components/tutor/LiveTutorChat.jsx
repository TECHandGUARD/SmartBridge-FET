import MessagingInbox from '@/components/messaging/MessagingInbox';
import {Button} from '@/components/ui/button';
export default function LiveTutorChat({user,tutorId,tutorName,onClose}){
 return <div role="dialog" aria-modal="true" aria-label={`Message ${tutorName||'tutor'}`} className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center p-2 sm:p-6"><div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl bg-background p-3"><div className="flex justify-end mb-2"><Button type="button" variant="outline" onClick={onClose}>Close chat</Button></div><MessagingInbox user={user} initialRecipientId={tutorId}/></div></div>;
}
