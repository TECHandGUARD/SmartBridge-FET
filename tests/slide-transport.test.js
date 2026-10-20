import test from 'node:test';
import assert from 'node:assert/strict';
import {createSlideTransport} from '../src/lib/slide-transport.js';
const slide={title:'Lesson.pdf',page:1,total:2,image:'data:image/jpeg;base64,'+'A'.repeat(40000)};
function pair(allowed=true){
  const received=[];
  const a=createSlideTransport({onSlide(){}}),b=createSlideTransport({onSlide:(id,value)=>received.push({id,value}),canReceive:()=>allowed});
  let sender,receiver;
  const pcA={createDataChannel(label){sender={label,readyState:'connecting',bufferedAmount:0,close(){this.readyState='closed';},send(data){receiver.onmessage({data});}};return sender;}};
  const pcB={ondatachannel:null,addEventListener(_event,listener){this.ondatachannel=listener;},removeEventListener(){}};
  a.attach(pcA,'b',true);b.attach(pcB,'a',false);
  receiver={label:sender.label,readyState:'open',bufferedAmount:0,close(){this.readyState='closed';},send(data){sender.onmessage({data});}};
  pcB.ondatachannel({channel:receiver});sender.readyState='open';
  return {a,b,received,sender,receiver};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('multi-chunk slide, page change, stop and current-page sync for late peer',async()=>{
  const p=pair();p.a.publish(slide);await tick();assert.deepEqual(p.received.at(-1),{id:'a',value:slide});
  const next={...slide,page:2};p.a.publish(next);await tick();assert.equal(p.received.at(-1).value.page,2);
  p.sender.onopen();await tick();assert.equal(p.received.at(-1).value.page,2);
  p.a.publish(null);await tick();assert.equal(p.received.at(-1).value,null);
  p.a.reset();assert.equal(p.sender.readyState,'closed');
});
test('unauthorized presenter and invalid/oversized transfer cannot display slides',async()=>{
  const denied=pair(false);denied.a.publish(slide);await tick();assert.equal(denied.received.length,0);
  const p=pair();const send=m=>p.receiver.onmessage({data:JSON.stringify(m)});
  send({type:'start',id:'bad',title:'Bad',page:1,total:1,size:2000001});send({type:'chunk',id:'bad',data:'abc'});send({type:'end',id:'bad'});assert.equal(p.received.length,0);
  send({type:'start',id:'bad',title:'Bad',page:1,total:1,size:3});send({type:'chunk',id:'bad',data:'abc'});send({type:'end',id:'bad'});assert.equal(p.received.length,0);
  assert.throws(()=>p.a.publish({...slide,image:'A'.repeat(2000001)}),/too large/);
});
