// Reactions stay inside the encrypted call and are never saved to the database.
export const MEETING_REACTIONS = Object.freeze({'👍':'Thumbs up','👏':'Applause','❤️':'Heart','🎉':'Celebrate'});
const LABEL='smartbridge-reactions-v1';
export function createMeetingReactions({userId,onChange}) {
  const peers=new Map(),listeners=new Map(),timers=new Map(),states=new Map();
  let raised=false,lastSent=-Infinity;
  const display=(id,hand,emoji='')=>{
    clearTimeout(timers.get(id));
    const state={handRaised:hand,emoji};states.set(id,state);onChange(id,state);
    if(emoji)timers.set(id,setTimeout(()=>{timers.delete(id);const value={handRaised:states.get(id)?.handRaised||false,emoji:''};states.set(id,value);onChange(id,value);},4000));
  };
  const send=(channel,message)=>{if(channel.readyState==='open'&&channel.bufferedAmount<16000)try{channel.send(JSON.stringify(message));}catch{/* A closed peer will reconnect. */}};
  const bind=(id,channel)=>{
    if(channel.label!==LABEL)return;
    if(peers.has(id)){channel.close();return;}
    const entry={channel,lastReceived:-Infinity};peers.set(id,entry);
    channel.onopen=()=>send(channel,{hand:raised,emoji:''});
    channel.onmessage=event=>{
      if(peers.get(id)!==entry||typeof event.data!=='string'||event.data.length>150)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(!message||typeof message.hand!=='boolean'||typeof message.emoji!=='string'||message.emoji!==''&&!Object.hasOwn(MEETING_REACTIONS,message.emoji) )return;
      const emoji=message.emoji&&Date.now()-entry.lastReceived>=300?message.emoji:'';if(message.emoji)entry.lastReceived=Date.now();display(id,message.hand,emoji);
    };
    channel.onclose=()=>{if(peers.get(id)===entry){peers.delete(id);clearTimeout(timers.get(id));timers.delete(id);states.delete(id);onChange(id,null);}};
    if(channel.readyState==='open')channel.onopen();
  };
  return {
    attach(pc,id,initiator){if(initiator)bind(id,pc.createDataChannel(LABEL,{ordered:true}));else{const listener=e=>bind(id,e.channel);listeners.set(id,{pc,listener});pc.addEventListener('datachannel',listener);}},
    detach(id){const listener=listeners.get(id);if(listener){listener.pc.removeEventListener('datachannel',listener.listener);listeners.delete(id);}const entry=peers.get(id);peers.delete(id);entry?.channel.close();clearTimeout(timers.get(id));timers.delete(id);states.delete(id);onChange(id,null);},
    react(emoji){if(!Object.hasOwn(MEETING_REACTIONS,emoji)||Date.now()-lastSent<800)return;lastSent=Date.now();display(userId,raised,emoji);for(const {channel} of peers.values())send(channel,{hand:raised,emoji});},
    toggleHand(){raised=!raised;display(userId,raised);for(const {channel} of peers.values())send(channel,{hand:raised,emoji:''});},
    reset(){for(const id of new Set([...peers.keys(),...listeners.keys()]))this.detach(id);for(const timer of timers.values())clearTimeout(timer);timers.clear();states.clear();raised=false;lastSent=-Infinity;onChange(userId,null);},
  };
}
