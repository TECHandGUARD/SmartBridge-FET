import test from 'node:test';
import assert from 'node:assert/strict';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
const post='00000000-0000-4000-8000-000000000711';
const key='00000000-0000-4000-8000-000000000712';
const request=(body={},headers={Authorization:'Bearer test'})=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('study posting derives actor identity and queues content through one atomic RPC',async()=>{
 const calls=[],client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{id:post,status:'pending',approved:false,reason:'queued'},error:null};};
 const response=await edgeRuntime('moderatePost',{client}).handle(request({room_id:'math',type:'Note',title:'  Calculus  ',body:' Explain derivatives ',request_id:key,author_id:'someone-else',author_email:'private@example.test',is_visible:true,moderation_status:'approved'}));
 assert.equal(response.status,200);assert.equal((await response.json()).approved,false);
 assert.equal(calls.length,1);assert.equal(calls[0].name,'submit_study_content');
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{actor_id:'user-id',action_name:'posts',payload:{room_id:'math',type:'Note',title:'Calculus',body:'Explain derivatives',request_id:key}});
});
test('study preflight ignores client identities and limits; write RPC remains authoritative',async()=>{
 const calls=[],client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{allowed:false,remaining:0},error:null};};
 const response=await edgeRuntime('checkRateLimit',{client}).handle(request({action:'posts',user_id:'foreign',limits:{max:100000}}));
 assert.equal(response.status,200);assert.equal((await response.json()).allowed,false);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)),{actor_id:'user-id',action_name:'posts'});
 assert.equal((await edgeRuntime('checkRateLimit',{client}).handle(request({action:'arbitrary'}))).status,400);
});
test('missing authentication, inactive accounts and oversized posts cannot reach submission RPC',async()=>{
 const client=fakeClient();
 assert.equal((await edgeRuntime('moderatePost',{client}).handle(request({},{}))).status,401);
 const inactive=fakeClient({id:'user-id',is_active:false,role:'student'});
 assert.equal((await edgeRuntime('moderatePost',{client:inactive}).handle(request({}))).status,403);
 assert.equal((await edgeRuntime('moderatePost',{client}).handle(request({room_id:'math',type:'Note',body:'x'.repeat(10001),request_id:key}))).status,400);
 assert.ok(!client.calls.some(call=>call.operation==='rpc'));
});
test('replies are persisted server-side and never auto-published by the edge handler',async()=>{
 const calls=[],client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{id:post,status:'pending',approved:false},error:null};};
 const response=await edgeRuntime('moderateReply',{client}).handle(request({post_id:post,body:'A reply',request_id:key,author_id:'foreign'}));
 assert.equal(response.status,200);assert.equal((await response.json()).status,'pending');assert.equal(calls[0].args.actor_id,'user-id');assert.equal(calls[0].args.action_name,'replies');
 assert.equal((await edgeRuntime('moderateReply',{client}).handle(request({post_id:'bad',body:'A reply',request_id:key}))).status,400);
});
test('reports restrict reasons and explanation length and cannot forge the reporter',async()=>{
 const calls=[],client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:{id:post,approved:true,status:'received'},error:null};};
 const response=await edgeRuntime('reportContent',{client}).handle(request({post_id:post,reason:'privacy',comment:'Contact details included',reported_by:'foreign'}));
 assert.equal(response.status,200);assert.equal(calls[0].args.actor_id,'user-id');assert.equal(calls[0].args.payload.reason,'privacy');
 assert.equal((await edgeRuntime('reportContent',{client}).handle(request({post_id:post,reason:'invented'}))).status,400);
 assert.equal((await edgeRuntime('reportContent',{client}).handle(request({post_id:post,reason:'other',comment:'x'.repeat(1001)}))).status,400);
});
test('study quota, membership and database errors fail clearly without leaking details',async()=>{
 const client=fakeClient();client.rpc=async()=>({data:null,error:{message:'Study action limit reached'}});
 const body={room_id:'math',type:'Note',body:'Test',request_id:key};
 assert.equal((await edgeRuntime('moderatePost',{client}).handle(request(body))).status,429);
 client.rpc=async()=>({data:null,error:{message:'private table and learner details'}});
 const denied=await edgeRuntime('moderatePost',{client}).handle(request(body));assert.equal(denied.status,403);assert.ok(!(await denied.text()).includes('private table'));
 assert.equal((await edgeRuntime('checkRateLimit',{client}).handle(request({action:'posts'}))).status,503);
});
