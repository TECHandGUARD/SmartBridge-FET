import test from 'node:test';
import assert from 'node:assert/strict';
import {createCallChat} from '../src/lib/call-chat.js';
function connect(a,b){
 const remote=new EventTarget();b.attach(remote,'a',false);let sender,receiver;
 a.attach({createDataChannel(label){
  sender={label,readyState:'connecting',bufferedAmount:0,send(data){receiver.onmessage?.({data});},close(){this.readyState='closed';this.onclose?.();}};
  receiver={label,readyState:'open',bufferedAmount:0,send(data){sender.onmessage?.({data});},close(){this.readyState='closed';this.onclose?.();}};
  return sender;
 }},'b',true);
 const event=new Event('datachannel');Object.defineProperty(event,'channel',{value:receiver});remote.dispatchEvent(event);sender.readyState='open';sender.onopen();return {sender,receiver,remote};
}
test('call chat exchanges text without tracks, binds sender to peer identity and rejects malformed or repeated messages',t=>{
 t.mock.timers.enable({apis:['Date'],now:10000});
 const incoming=[],outgoing=[],counts=[];
 const a=createCallChat({userId:'a',onMessage:m=>outgoing.push(m),onPeers:n=>counts.push(n)}),b=createCallChat({userId:'b',onMessage:m=>incoming.push(m)});
 const {receiver}=connect(a,b);assert.equal(counts.at(-1),1);
 assert.equal(a.send('  Could you explain step two?  '),1);assert.equal(incoming[0].text,'Could you explain step two?');assert.equal(outgoing[0].recipients,1);
 assert.throws(()=>a.send('Again'),/wait/);
 t.mock.timers.tick(1000);
 receiver.onmessage({data:JSON.stringify({id:'safe-1',text:'<img src=x onerror=alert(1)>',senderId:'pretend-host',at:0})});
 assert.equal(incoming.at(-1).senderId,'a');assert.equal(incoming.at(-1).at,11000);assert.equal(incoming.at(-1).text,'<img src=x onerror=alert(1)>');
 const before=incoming.length;
 for(const value of [null,{}, {id:'safe-1',text:'duplicate'},{id:'bad',text:'x'.repeat(1001)},{id:'bad',text:' '},{id:4,text:'No'},{id:'x'.repeat(81),text:'No'}]){t.mock.timers.tick(1000);receiver.onmessage({data:JSON.stringify(value)});}
 receiver.onmessage({data:'not json'});receiver.onmessage({data:'x'.repeat(5001)});assert.equal(incoming.length,before);
 const stale=receiver.onmessage;b.detach('a');t.mock.timers.tick(1000);stale({data:JSON.stringify({id:'late',text:'Old session'})});assert.equal(incoming.length,before);
 a.reset();b.reset();assert.equal(counts.at(-1),0);assert.throws(()=>a.send('Disconnected'),/has not been sent/);
});
test('call chat does not claim success for closed or congested peers and clears on leave',()=>{
 const events=[];let resets=0;
 const a=createCallChat({userId:'a',onMessage:m=>events.push(m),onReset:()=>resets++}),b=createCallChat({userId:'b',onMessage(){}});
 const {sender}=connect(a,b);sender.bufferedAmount=64000;assert.throws(()=>a.send('Not delivered'),/has not been sent/);assert.equal(events.length,0);
 sender.bufferedAmount=0;sender.readyState='closed';assert.throws(()=>a.send('Still not delivered'),/has not been sent/);
 assert.throws(()=>a.send('x'.repeat(1001)),/1,000/);a.reset();assert.equal(resets,1);
});
