// Real, disposable Auth/PostgREST/Storage/Edge services on the CI runner only.
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {execFile,spawn}=require('node:child_process');const {promisify}=require('node:util');
const {randomUUID}=require('node:crypto');const assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const execute=promisify(execFile);const root=fs.mkdtempSync(path.join(os.tmpdir(),'smartbridge-services-'));
const cli=process.env.SUPABASE_TEST_CLI||'supabase';let worker;
const clean=text=>String(text).replace(/[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/g,'[redacted]').split('\n').filter(line=>!/key|secret|token|password/i.test(line)).slice(-25).join('\n');
async function command(args){try{return await execute(cli,[...args,'--workdir',root],{maxBuffer:20*1024*1024,timeout:600000});}catch(error){throw new Error('Local Supabase command failed: '+clean(error.stderr));}}
function localOnly(url){const parsed=new URL(url);assert.ok(['localhost','127.0.0.1','[::1]'].includes(parsed.hostname),'Refuse any hosted test target');return parsed.origin;}
function ok(result){if(result.error)throw new Error('Local API request failed: '+result.error.message);return result.data;}
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
(async()=>{try{
 fs.cpSync(path.resolve('supabase'),path.join(root,'supabase'),{recursive:true});
 const config=path.join(root,'supabase/config.toml');
 fs.appendFileSync(config,'\n[db]\nmajor_version = 17\n[auth]\nsite_url = "http://127.0.0.1:5173"\n[auth.email]\nenable_confirmations = false\n[analytics]\nenabled = false\n[studio]\nenabled = false\n');
 await command(['start','--exclude','studio,imgproxy,postgres-meta,logflare,vector,supavisor']);
 const status=JSON.parse((await command(['status','-o','json'])).stdout);
 const url=localOnly(status.API_URL);assert.ok(status.ANON_KEY&&status.SERVICE_ROLE_KEY,'Local legacy test keys required');
 const admin=createClient(url,status.SERVICE_ROLE_KEY,options);
 async function account(role){const client=createClient(url,status.ANON_KEY,options);const email=randomUUID()+'@example.invalid';const password='Local-'+randomUUID()+'-9!';
  const signup=ok(await client.auth.signUp({email,password,options:{data:{role:'admin',full_name:'Disposable '+role}}}));
  assert.ok(signup.session,'Local signup must create a session');
  const profile=ok(await client.from('users').select('role,is_super_admin').eq('id',signup.user.id).single());
  assert.equal(profile.role,'user');assert.equal(profile.is_super_admin,false);
  ok(await client.rpc('complete_onboarding',{requested_role:role,sace_number:role==='sace_tutor'?'TEST-SACE':'',policy_accepted:true,tutor_agreement_accepted:role==='sace_tutor'}));
  return {client,id:signup.user.id,email,token:signup.session.access_token};}
 const student=await account('student'),other=await account('student'),parent=await account('parent'),tutor=await account('sace_tutor');
 assert.deepEqual(ok(await other.client.from('users').select('id').eq('id',student.id)),[]);
 console.log('PASS: real Auth signup, protected metadata, onboarding and REST account isolation');
 ok(await admin.from('users').update({role:'sace_tutor',is_verified:true}).eq('id',tutor.id));
 const profile=ok(await admin.from('tutor_profiles').update({is_verified:true,is_active:true,subjects:['Mathematics'],hourly_rate:100}).eq('user_id',tutor.id).select('id').single());
 const bookingArgs={profile_id:profile.id,chosen_subject:'Mathematics',chosen_date:'2099-12-01',chosen_time:'10:00',hours:1,booking_message:'Local fixture',request_id:randomUUID()};
 const booking=ok(await student.client.rpc('create_booking',bookingArgs));
 assert.equal(ok(await student.client.rpc('create_booking',bookingArgs)).id,booking.id);assert.equal(Number(booking.amount),100);
 assert.deepEqual(ok(await other.client.from('tutor_bookings').select('id').eq('id',booking.id)),[]);
 ok(await tutor.client.from('tutor_bookings').update({status:'confirmed',session_link:'https://example.invalid/session'}).eq('id',booking.id));
 assert.equal(ok(await student.client.from('tutor_bookings').select('status').eq('id',booking.id).single()).status,'confirmed');
 console.log('PASS: real booking retries, server price, ownership and tutor confirmation');
 ok(await admin.from('users').update({is_active:false}).eq('id',tutor.id));
 assert.deepEqual(ok(await student.client.from('tutor_directory').select('id').eq('user_id',tutor.id)),[]);
 assert.equal(ok(await tutor.client.rpc('is_tutor',{user_id:tutor.id})),false);
 assert.ok((await student.client.rpc('create_booking',{...bookingArgs,chosen_time:'12:00',request_id:randomUUID()})).error);
 console.log('PASS: inactive tutors lose eligibility/discovery immediately and cannot receive new bookings');
 ok(await parent.client.rpc('request_parent_link',{learner_email:student.email}));
 const links=ok(await student.client.rpc('get_parent_links'));const link=links.find(row=>row.parent_id===parent.id);assert.ok(link);
 ok(await student.client.rpc('respond_parent_link',{link_id:link.id,decision:'approved'}));
 ok(await student.client.rpc('log_study_session',{chosen_subject:'Mathematics',chosen_grade:'Grade 12',request_id:randomUUID()}));
 assert.ok(ok(await parent.client.from('study_progress').select('*').eq('student_id',student.id)).length>0);
 ok(await student.client.rpc('respond_parent_link',{link_id:link.id,decision:'revoked'}));
 assert.deepEqual(ok(await parent.client.from('study_progress').select('*').eq('student_id',student.id)),[]);
 console.log('PASS: real learner-approved parent consent, progress read and revocation');
 const topic={student_id:student.id,student_email:student.email,subject:'Mathematics',topic_id:'math_algebra'};
 ok(await student.client.from('syllabus_progress').upsert(topic,{onConflict:'student_id,subject,topic_id'}));
 ok(await student.client.from('syllabus_progress').upsert(topic,{onConflict:'student_id,subject,topic_id'}));
 assert.equal(ok(await student.client.from('syllabus_progress').select('*')).length,1);
 assert.deepEqual(ok(await other.client.from('syllabus_progress').select('*')),[]);
 ok(await student.client.from('nbt_planner_progress').upsert({student_id:student.id,student_email:student.email,completed_sessions:{'4_Monday':true}},{onConflict:'student_id'}));
 assert.equal(ok(await student.client.from('nbt_planner_progress').select('*').single()).completed_sessions['4_Monday'],true);
 console.log('PASS: real syllabus/NBT API persistence, uniqueness and privacy');
 const file=student.id+'/'+randomUUID()+'.pdf';const bytes=new Uint8Array([37,80,68,70,45,49,46,52]);
 ok(await student.client.storage.from('application_documents').upload(file,bytes,{contentType:'application/pdf'}));
 assert.ok((await other.client.storage.from('application_documents').download(file)).error);
 assert.deepEqual(new Uint8Array(await ok(await student.client.storage.from('application_documents').download(file)).arrayBuffer()),bytes);
 const signed=ok(await student.client.storage.from('application_documents').createSignedUrl(file,60));localOnly(signed.signedUrl);
 const downloaded=await fetch(signed.signedUrl);assert.equal(downloaded.status,200);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),bytes);
 assert.ok((await other.client.storage.from('application_documents').createSignedUrl(file,60)).error);
 ok(await student.client.storage.from('application_documents').upload(file,bytes,{contentType:'application/pdf',upsert:true}));
 ok(await student.client.storage.from('application_documents').remove([file]));
 assert.ok((await student.client.storage.from('application_documents').download(file)).error);
 console.log('PASS: real private binary upload/download/replacement/deletion and cross-account denial');
 const envFile=path.join(root,'edge.env');fs.writeFileSync(envFile,'SMARTBRIDGE_LOCAL_TEST=true\nAPP_BASE_URL=http://127.0.0.1:5173\n');
 worker=spawn(cli,['functions','serve','--env-file',envFile,'--workdir',root],{stdio:'ignore'});
 const endpoint=url+'/functions/v1/check-rate-limit';let response;
 for(let attempt=0;attempt<60;attempt++){
  try{response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+student.token,apikey:status.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'posts'})});if(response.status===200)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert.equal(response?.status,200,'Local Edge runtime must serve its checked sources');
 ok(await student.client.rpc('join_study_room',{chosen_room:'math'}));
 const intent={room_id:'math',type:'Note',title:'Local runtime note',body:'Disposable fixture',request_id:randomUUID()};
 async function post(){const result=await fetch(url+'/functions/v1/moderate-post',{method:'POST',headers:{Authorization:'Bearer '+student.token,apikey:status.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(intent)});assert.equal(result.status,200);return result.json();}
 const submitted=await post();assert.equal(submitted.status,'pending');assert.equal((await post()).id,submitted.id);
 assert.deepEqual(ok(await other.client.from('study_room_posts').select('id').eq('id',submitted.id)),[]);
 console.log('PASS: real Edge authorization/runtime, queued study content and idempotent retry');
}finally{worker?.kill('SIGTERM');try{await command(['stop']);}catch{}fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(clean(error.message));process.exitCode=1;});
