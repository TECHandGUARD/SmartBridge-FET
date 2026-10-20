import test from 'node:test';
import assert from 'node:assert/strict';
import {validRelayServers,getCallIceConfig,applyCallQuality,selectedCallRoute} from '../src/lib/call-network.js';
test('relay endpoints require scoped credentials and TURN URLs',()=>{
 const good={urls:['turn:relay.example.test:443?transport=udp','turns:relay.example.test:443?transport=tcp'],username:'temporary-user',credential:'temporary-password'};
 assert.equal(validRelayServers([good]).length,1);
 for(const urls of [['https://evil.test'],['turn:relay.example.test:443#bad'],[],['turns:user:password@evil.test:443']])assert.equal(validRelayServers([{...good,urls}]).length,0);
 assert.deepEqual(validRelayServers([{...good,credential:null}]),[]);
});
test('missing or failed relay configuration preserves an explicit direct-call fallback',async()=>{
 const client={auth:{getSession:async()=>({error:new Error('expired')})}};
 assert.equal((await getCallIceConfig(client,'meeting','room',{endpoint:undefined})).relayAvailable,false);
 const result=await getCallIceConfig(client,'meeting','room',{endpoint:'https://relay.example.test'});assert.equal(result.relayAvailable,false);assert.match(result.warning,/temporarily unavailable/);
});
test('data saver bounds audio/video and selected-route diagnostics omit addresses',async()=>{
 const sent=[];const pc={getSenders:()=>['audio','video'].map(kind=>({track:{kind},getParameters:()=>({encodings:[{}]}),setParameters:async value=>sent.push({kind,...value.encodings[0]})})),getStats:async()=>new Map([['transport',{type:'transport',selectedCandidatePairId:'pair'}],['pair',{type:'candidate-pair',localCandidateId:'local',remoteCandidateId:'remote'}],['local',{candidateType:'relay',address:'private-address'}],['remote',{candidateType:'host'}]])};
 await applyCallQuality(pc,'saver');assert.equal(sent.find(s=>s.kind==='video').maxBitrate,180000);assert.equal(sent.find(s=>s.kind==='audio').maxBitrate,24000);assert.equal(await selectedCallRoute(pc),'relay');
});
