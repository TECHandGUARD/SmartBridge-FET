// Ephemeral slides travel over the existing encrypted call; no public uploads.
const LABEL = 'smartbridge-slides-v1';
const MAX = 2_000_000;
const CHUNK = 12000;
export function createSlideTransport({onSlide,canReceive = (_id) => true}) {
  const connections = new Map();
  let current = null;
  const transmit = async (entry, value) => {
    const revision = ++entry.revision;
    const channel = entry.channel;
    const send = async message => {
      while (channel.readyState === 'open' && channel.bufferedAmount > 256000 && entry.revision === revision) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      if (channel.readyState !== 'open' || entry.revision !== revision) return false;
      channel.send(JSON.stringify(message));return true;
    };
    try {
      if (!value) { await send({type:'stop'});return; }
      const id = crypto.randomUUID();
      if (!await send({type:'start',id,title:value.title,page:value.page,total:value.total,size:value.image.length})) return;
      for (let offset=0;offset<value.image.length;offset+=CHUNK) {
        if (!await send({type:'chunk',id,data:value.image.slice(offset,offset+CHUNK)})) return;
      }
      await send({type:'end',id});
    } catch { /* Leaving or reconnecting closes the old data channel. */ }
  };
  const bind = (id, channel) => {
    if (channel.label !== LABEL || connections.has(id)) {channel.close();return;}
    const entry = {channel,revision:0,pending:null};connections.set(id,entry);
    channel.onopen = () => {transmit(entry,current);};
    channel.onmessage = event => {
      if (!canReceive(id) || typeof event.data !== 'string' || event.data.length > 20000) return;
      let message;try {message=JSON.parse(event.data);} catch {return;}
      if (message.type === 'stop') {entry.pending=null;onSlide(id,null);return;}
      if (message.type === 'start') {
        entry.pending=null;
        if (typeof message.id !== 'string' || message.id.length>64 || typeof message.title !== 'string' || message.title.length>120 || !Number.isInteger(message.page) || !Number.isInteger(message.total) || message.page<1 || message.page>message.total || message.total>150 || !Number.isInteger(message.size) || message.size<1 || message.size>MAX) return;
        entry.pending={...message,parts:[],length:0,expires:Date.now()+30000};return;
      }
      const pending=entry.pending;
      if (!pending || message.id!==pending.id || Date.now()>pending.expires) {entry.pending=null;return;}
      if (message.type==='chunk' && typeof message.data==='string' && message.data.length<=CHUNK) {
        pending.length+=message.data.length;
        if (pending.length>pending.size) {entry.pending=null;return;}
        pending.parts.push(message.data);
      } else if (message.type==='end') {
        entry.pending=null;
        if (pending.length!==pending.size) return;
        const image=pending.parts.join('');
        if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)) return;
        onSlide(id,{title:pending.title,page:pending.page,total:pending.total,image});
      }
    };
    channel.onclose=()=>{if(connections.get(id)===entry){connections.delete(id);onSlide(id,null);}};
    if (channel.readyState==='open') transmit(entry,current);
  };
  return {
    attach(pc,id,initiator) {
      if (initiator) bind(id,pc.createDataChannel(LABEL,{ordered:true}));
      else pc.ondatachannel=event=>bind(id,event.channel);
    },
    detach(id) {const entry=connections.get(id);if(entry){entry.revision++;connections.delete(id);entry.channel.close();}onSlide(id,null);},
    publish(value) {if(value?.image.length>MAX)throw new Error('This slide is too large. Try a smaller PDF.');current=value;for(const entry of connections.values())transmit(entry,value);},
    reset() {current=null;for(const id of [...connections.keys()])this.detach(id);}
  };
}
