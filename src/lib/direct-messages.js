// Merge polling results without dropping older history or a just-acknowledged send.
export function mergeDirectMessages(previous,incoming){
 const messages=new Map(previous.map(message=>[message.id,message]));
 for(const message of incoming)messages.set(message.id,message);
 return [...messages.values()].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()||a.id.localeCompare(b.id));
}
