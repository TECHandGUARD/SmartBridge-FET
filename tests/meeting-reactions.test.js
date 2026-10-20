import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeetingReactions} from '../src/lib/meeting-reactions.js';
import {createSlideTransport} from '../src/lib/slide-transport.js';

test('separate encrypted channels share hands, expire emoji, reject invalid payloads and clear on disconnect',t=>{
  t.mock.timers.enable({apis:['setTimeout','Date'],now:10000});
  const received=[];
  const a=createMeetingReactions({userId:'a',onChange(){}}), b=createMeetingReactions({userId:'b',onChange:(id,state)=>received.push({id,state})});
  const remote=new EventTarget();const pairs=[];
  const pc={createDataChannel(label){const sender={label,readyState:'connecting',bufferedAmount:0,send(data){receiver.onmessage?.({data});},close(){this.readyState='closed';}};const receiver={label,readyState:'open',bufferedAmount:0,send(data){sender.onmessage?.({data});},close(){this.readyState='closed';}};pairs.push({sender,receiver});return sender;}};
  const slides=createSlideTransport({onSlide(){}});slides.attach(remote,'a',false);b.attach(remote,'a',false);
  a.attach(pc,'b',true);const {sender,receiver}=pairs[0];const event=new Event('datachannel');Object.defineProperty(event,'channel',{value:receiver});remote.dispatchEvent(event);sender.readyState='open';sender.onopen();
  assert.equal(receiver.readyState,'open');
  a.toggleHand();assert.deepEqual(received.at(-1),{id:'a',state:{handRaised:true,emoji:''}});
  t.mock.timers.tick(1000);a.react('👏');assert.deepEqual(received.at(-1).state,{handRaised:true,emoji:'👏'});
  t.mock.timers.tick(4001);assert.deepEqual(received.at(-1).state,{handRaised:true,emoji:''});
  const count=received.length;
  for(const payload of [null,{}, {hand:true,emoji:'<script>'}, {hand:'yes',emoji:'👍'}, {hand:true,emoji:'A'.repeat(200)}])receiver.onmessage({data:JSON.stringify(payload)});
  assert.equal(received.length,count);
  // Peer identity comes from the authenticated connection, never a payload field.
  receiver.onmessage({data:JSON.stringify({userId:'spoofed',hand:false,emoji:'👍'})});assert.equal(received.at(-1).id,'a');
  b.detach('a');assert.deepEqual(received.at(-1),{id:'a',state:null});
  const before=received.length;t.mock.timers.tick(5000);assert.equal(received.length,before);
  a.reset();b.reset();slides.reset();
});
