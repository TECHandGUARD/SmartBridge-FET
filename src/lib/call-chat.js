// Text follows the authenticated, encrypted call connection, never a public room.
const LABEL='smartbridge-chat-v1';
export function createCallChat({userId,onMessage,onPeers=(_count)=>{},onReset=()=>{}}){
 const peers=new Map(),listeners=new Map();let lastSent=-Infinity;
 const publishPeers=()=>onPeers([...peers.values()].filter(p=>p.channel.readyState==='open').length);
 const bind=(id,channel)=>{
  if(channel.label!==LABEL)return;
  if(peers.has(id)){channel.close();return;}
  const entry={channel,lastReceived:-Infinity,seen:new Set()};peers.set(id,entry);
  channel.onopen=publishPeers;
  channel.onclose=()=>{if(peers.get(id)===entry){peers.delete(id);publishPeers();}};
  channel.onmessage=event=>{
   if(peers.get(id)!==entry||typeof event.data!=='string'||event.data.length>5000)return;
   let item;try{item=JSON.parse(event.data);}catch{return;}
   if(!item||typeof item.id!=='string'||!/^[-a-zA-Z0-9]{1,80}$/.test(item.id)||typeof item.text!=='string'||!item.text.trim()||item.text.length>1000||entry.seen.has(item.id)||Date.now()-entry.lastReceived<500)return;
   entry.lastReceived=Date.now();entry.seen.add(item.id);if(entry.seen.size>200)entry.seen.delete(entry.seen.values().next().value);
   // Never trust a claimed sender name or timestamp from a payload.
   onMessage({id:id+':'+item.id,senderId:id,text:item.text.trim(),at:Date.now()});
  };
  publishPeers();
 };
 return {
  attach(pc,id,initiator){if(initiator)bind(id,pc.createDataChannel(LABEL,{ordered:true}));else{const listener=e=>bind(id,e.channel);listeners.set(id,{pc,listener});pc.addEventListener('datachannel',listener);}},
  detach(id){const listener=listeners.get(id);if(listener){listener.pc.removeEventListener('datachannel',listener.listener);listeners.delete(id);}const entry=peers.get(id);peers.delete(id);entry?.channel.close();publishPeers();},
  send(text){
   text=text.trim();if(!text||text.length>1000)throw new Error('Write a message of 1–1,000 characters.');
   if(Date.now()-lastSent<800)throw new Error('Please wait a moment before posting again.');
   const item={id:crypto.randomUUID(),text};let recipients=0;
   for(const {channel} of peers.values())if(channel.readyState==='open'&&channel.bufferedAmount<64000){try{channel.send(JSON.stringify(item));recipients++;}catch{/* Report no success unless a connection accepted the message. */}}
   if(!recipients)throw new Error('No participant is connected to chat yet. Your message has not been sent.');
   lastSent=Date.now();onMessage({...item,id:userId+':'+item.id,senderId:userId,at:Date.now(),recipients});return recipients;
  },
  reset(){for(const id of new Set([...peers.keys(),...listeners.keys()]))this.detach(id);lastSent=-Infinity;onReset();},
 };
}
