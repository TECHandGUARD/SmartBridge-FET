import test from 'node:test';import assert from 'node:assert/strict';
import {edgeRuntime,fakeClient} from './helpers/edge-runtime.js';
import {storageReference,parseStorageReference,uploadPrivate,resolveFile} from '../src/lib/private-storage.js';
import {createClientReporter} from '../src/lib/monitoring.js';
const request=(body={},headers={Authorization:'Bearer test'})=>new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
test('private storage persists owned references and resolves fresh signed links without public URLs',async()=>{
 const calls=[];const client={auth:{getUser:async()=>({data:{user:{id:'owner',email:'owner@example.test'}}})},storage:{from:bucket=>({upload:async(path)=>{calls.push({bucket,path});return {error:null};},createSignedUrl:async(path,seconds)=>({data:{signedUrl:`https://example.test/signed?expires=${seconds}`}})})}};
 const uploaded=await uploadPrivate(client,'application_documents',{name:'My ID.pdf',type:'application/pdf'});assert.match(uploaded.reference,/^storage:\/\/application_documents\/owner\//);assert.equal(calls[0].bucket,'application_documents');
 assert.equal(await resolveFile(client,uploaded.reference),'https://example.test/signed?expires=60');assert.throws(()=>parseStorageReference('storage://application_documents/owner/../other.pdf'),/Invalid/);assert.throws(()=>storageReference('public','file.pdf'),/Invalid/);await assert.rejects(()=>resolveFile(client,'javascript:alert(1)'),/Invalid/);
});
test('client error reporting drops message content and deduplicates authenticated reports',async()=>{
 const calls=[];const report=createClientReporter({auth:{getSession:async()=>({data:{session:{}}})},rpc:async(name,args)=>calls.push({name,args})});await report('render_error');await report('render_error');await report('a secret error message');assert.equal(calls.length,1);assert.deepEqual(calls[0],{name:'report_client_event',args:{event_code:'render_error'}});
});
test('scheduled jobs skip disabled leases and record downstream failures without exposing provider bodies',async()=>{
 const calls=[];const client=fakeClient();client.rpc=async(name,args)=>{calls.push({name,args});return {data:name==='claim_operational_job'?{function_slug:'send-study-reminders',body:{}}:true,error:null};};
 const runtime=edgeRuntime('runScheduledJob',{client,env:{JOB_AUTH_SECRET:'job-secret'},fetch:async()=>Response.json({error:'sensitive provider body'},{status:500})});
 const response=await runtime.handle(request({job_key:'study'},{'x-job-secret':'job-secret'}));assert.equal(response.status,503);assert.equal(calls[1].args.run_status,'failed');assert.ok(!(await response.text()).includes('sensitive'));
 const skipped=fakeClient();skipped.rpc=async()=>({data:null,error:null});assert.equal((await edgeRuntime('runScheduledJob',{client:skipped,env:{JOB_AUTH_SECRET:'job-secret'}}).handle(request({job_key:'study'},{'x-job-secret':'job-secret'}))).status,200);
});
test('operations controls require administrators and a configured scheduler',async()=>{
 const user=fakeClient({id:'user-id',role:'student',is_active:true});assert.equal((await edgeRuntime('operationsStatus',{client:user}).handle(request({}))).status,403);
 const admin=fakeClient({id:'user-id',role:'admin',is_active:true});assert.equal((await edgeRuntime('operationsStatus',{client:admin}).handle(request({action:'set-job',job_key:'study',enabled:true}))).status,409);
});
test('server error monitoring records only a function code and status',async()=>{
 const sends=[];const client=fakeClient();const runtime=edgeRuntime('invokeLLM',{client,env:{SERVER_MONITORING_ENABLED:'true'},fetch:async(url,options)=>{sends.push({url,body:JSON.parse(options.body)});return Response.json(true);}});
 client.rpc=async()=>({data:null,error:{message:'private database details'}});
 assert.equal((await runtime.handle(request({prompt:'Explain equations'}))).status,503);assert.equal(sends.length,1);assert.deepEqual(sends[0].body,{event_source:'edge',event_code:'invoke-llm',event_status:503});assert.ok(!JSON.stringify(sends).includes('equations'));
});
test('weekly report retries skip accepted receipts before reading learner data or sending',async()=>{
 const client=fakeClient(undefined,call=>({data:call.table==='parent_student_links'?[{parent_id:'parent',student_id:'student'}]:[],error:null}));client.rpc=async(name)=>({data:name==='pending_weekly_report_links'?[{parent_id:'parent',student_id:'student'}]:true,error:null});
 const response=await edgeRuntime('sendWeeklyParentReports',{client,env:{JOB_AUTH_SECRET:'job-secret'}}).handle(request({}, {'x-job-secret':'job-secret'}));assert.equal(response.status,200);assert.equal((await response.json()).sent,0);assert.ok(!client.calls.some(call=>call.table==='study_progress'));
});

test('network monitoring preserves responses and does not include URLs, tokens or request bodies',async()=>{
 const {monitoredFetch}=await import('../src/lib/monitoring.js');const codes=[];
 const fetcher=monitoredFetch(async()=>new Response('provider failure',{status:503}),code=>codes.push(code));
 assert.equal((await fetcher('https://example.test?token=secret',{body:'private message'})).status,503);assert.deepEqual(codes,['request_error']);
});
