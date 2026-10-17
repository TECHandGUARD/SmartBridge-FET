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

 // Verify legal-file controls against the actual Storage HTTP service.
 const legalId=randomUUID(), legalPath=randomUUID()+'.pdf';
 const pdf=Buffer.from('%PDF-1.7\nDisposable legal test fixture');
 ok(await admin.storage.from('legal-documents').upload(legalPath,pdf,{contentType:'application/pdf'}));
 ok(await admin.from('legal_documents').insert({id:legalId,doc_key:'legal-http-'+legalId,title:'Private signed form',content:'Fixture',version:'1.0',is_published:true,audience:'owner',owner_user_id:student.id,contains_personal_information:true,file_path:legalPath,file_sha256:require('node:crypto').createHash('sha256').update(pdf).digest('hex')}));
 assert.deepEqual(ok(await other.client.from('legal_documents').select('id').eq('id',legalId)),[]);
 assert.ok((await other.client.storage.from('legal-documents').download(legalPath)).error,'Cross-user download must fail');
 const ownPdf=ok(await student.client.storage.from('legal-documents').download(legalPath));
 assert.equal(Buffer.from(await ownPdf.arrayBuffer()).toString(),pdf.toString());
 assert.ok((await student.client.storage.from('legal-documents').createSignedUrl(legalPath,3600)).error,'User signed URL creation must fail');
 assert.ok((await other.client.storage.from('legal-documents').upload(randomUUID()+'.pdf',pdf,{contentType:'application/pdf'})).error,'Non-admin upload must fail');
 assert.ok((await admin.from('legal_documents').update({audience:'public'}).eq('id',legalId)).error,'Confidential document cannot become public');
 ok(await admin.from('legal_documents').update({is_published:false}).eq('id',legalId));
 assert.ok((await student.client.storage.from('legal-documents').download(legalPath)).error,'Unpublishing must revoke future downloads');
 const tutorId=randomUUID(),tutorPath=randomUUID()+'.pdf';
 ok(await admin.storage.from('legal-documents').upload(tutorPath,pdf,{contentType:'application/pdf'}));
 ok(await admin.from('legal_documents').insert({id:tutorId,doc_key:'legal-tutor-'+tutorId,title:'Tutor timetable',content:'Fixture',version:'1.0',is_published:true,audience:'tutor',file_path:tutorPath,file_sha256:require('node:crypto').createHash('sha256').update(pdf).digest('hex')}));
 ok(await tutor.client.storage.from('legal-documents').download(tutorPath));
 assert.ok((await student.client.storage.from('legal-documents').download(tutorPath)).error,'Learner cannot read tutor-only file');
 ok(await admin.from('legal_documents').delete().in('id',[legalId,tutorId]));
 assert.ok((await tutor.client.storage.from('legal-documents').download(tutorPath)).error,'Deleted metadata must block remaining bytes');
 ok(await admin.storage.from('legal-documents').remove([legalPath,tutorPath]));
 console.log('PASS: real legal metadata/file privacy, owner and SACE tutor downloads, forbidden signed URLs/uploads, confidential publication guard and unpublish/delete revocation');

 const bookingArgs={profile_id:profile.id,chosen_subject:'Mathematics',chosen_date:'2099-12-01',chosen_time:'10:00',hours:1,booking_message:'Local fixture',request_id:randomUUID()};
 const booking=ok(await student.client.rpc('create_booking',bookingArgs));
 assert.equal(ok(await student.client.rpc('create_booking',bookingArgs)).id,booking.id);assert.equal(Number(booking.amount),100);
 assert.deepEqual(ok(await other.client.from('tutor_bookings').select('id').eq('id',booking.id)),[]);
 ok(await tutor.client.from('tutor_bookings').update({status:'confirmed',session_link:'https://example.invalid/session'}).eq('id',booking.id));
 assert.equal(ok(await student.client.from('tutor_bookings').select('status').eq('id',booking.id).single()).status,'confirmed');
 console.log('PASS: real booking retries, server price, ownership and tutor confirmation');

 // Exercise flexible tutor prices through real PostgREST, not a mocked save response.
 const edited=ok(await tutor.client.from('tutor_profiles').update({hourly_rate:1250.50,subject_rates:{Mathematics:20,History:0},subjects:['Mathematics','History'],offers_free_intro:true})
  .eq('id',profile.id).eq('user_id',tutor.id).select('hourly_rate,session_price_per_hour,subject_rates,offers_free_intro').single());
 assert.equal(Number(edited.hourly_rate),1250.5);assert.equal(Number(edited.session_price_per_hour),1250.5);
 const learnerDirectory=ok(await student.client.from('tutor_directory').select('*').eq('id',profile.id).single());
 assert.equal(learnerDirectory.subject_rates.Mathematics,20);assert.equal(learnerDirectory.offers_free_intro,true);
 assert.equal('metadata' in learnerDirectory,false,'Directory must not expose private profile metadata');
 const subjectBooking=ok(await student.client.rpc('create_booking',{...bookingArgs,chosen_date:'2099-12-02',hours:1.5,request_id:randomUUID()}));
 assert.equal(Number(subjectBooking.amount),30);
 const freeRegular=ok(await student.client.rpc('create_booking',{...bookingArgs,chosen_subject:'History',chosen_date:'2099-12-03',request_id:randomUUID()}));
 assert.equal(Number(freeRegular.amount),0);assert.equal(freeRegular.is_intro,false);
 const introArgs={...bookingArgs,chosen_date:'2099-12-04',hours:0.5,free_intro:true,request_id:randomUUID()};
 const introduction=ok(await student.client.rpc('create_booking',introArgs));
 assert.equal(Number(introduction.amount),0);assert.equal(introduction.is_intro,true);
 assert.equal(ok(await student.client.rpc('create_booking',introArgs)).id,introduction.id);
 assert.ok((await student.client.rpc('create_booking',{...introArgs,chosen_date:'2099-12-05',request_id:randomUUID()})).error,'A second introduction must fail');
 assert.ok((await other.client.from('tutor_profiles').update({hourly_rate:1}).eq('id',profile.id).select('id').single()).error,'A different learner cannot save a tutor profile');
 assert.ok((await tutor.client.from('tutor_profiles').update({subject_rates:{Mathematics:-1}}).eq('id',profile.id)).error,'Negative subject price must fail');
 ok(await tutor.client.from('tutor_profiles').update({hourly_rate:100,subject_rates:{},subjects:['Mathematics'],offers_free_intro:false}).eq('id',profile.id));
 console.log('PASS: real tutor save/reload, directory privacy, subject/free prices and one-time introduction RPC contracts');
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
 // This approval exercises the actual administrator RPC, not a service-role impersonation.
 const moderator=await account('student'),newTutor=await account('student');
 ok(await admin.from('users').update({role:'admin'}).eq('id',moderator.id));
 const approval=ok(await moderator.client.rpc('approve_account',{target_id:newTutor.id,approved_role:'student_tutor'}));
 assert.equal(ok(await moderator.client.rpc('approve_account',{target_id:newTutor.id,approved_role:'student_tutor'})).notification_id,approval.notification_id);
 assert.equal(ok(await newTutor.client.from('tutor_profiles').select('user_id,is_verified').eq('user_id',newTutor.id).single()).is_verified,true);
 assert.deepEqual(ok(await other.client.from('action_notifications').select('id').eq('id',approval.notification_id)),[]);
 const professionalFile=newTutor.id+'/'+randomUUID()+'.png';
 const picture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9AAAAABJRU5ErkJggg==','base64');
 ok(await newTutor.client.storage.from('tutor-profile-media').upload(professionalFile,picture,{contentType:'image/png'}));
 assert.ok((await other.client.storage.from('tutor-profile-media').upload(newTutor.id+'/'+randomUUID()+'.png',picture,{contentType:'image/png'})).error);
 const professionalUrl=newTutor.client.storage.from('tutor-profile-media').getPublicUrl(professionalFile).data.publicUrl;localOnly(professionalUrl);
 ok(await newTutor.client.from('tutor_profiles').update({bio:'Verified local profile edit',avatar_url:professionalUrl}).eq('user_id',newTutor.id));
 assert.equal(ok(await student.client.from('tutor_directory').select('bio').eq('user_id',newTutor.id).single()).bio,'Verified local profile edit');
 ok(await newTutor.client.storage.from('tutor-profile-media').remove([professionalFile]));
 const cancelled=ok(await student.client.rpc('cancel_booking',{booking_id:booking.id,cancellation_message:'I am cancelling; please rearrange your day.'}));
 assert.equal(cancelled.refund_eligibility,'no_payment');assert.equal(Number(cancelled.refundable_amount),0);
 assert.equal(cancelled.notification_ids.length,2);
 assert.equal(ok(await student.client.rpc('cancel_booking',{booking_id:booking.id,cancellation_message:'Retry the same cancellation safely.'})).id,booking.id);
 console.log('PASS: real atomic tutor approval/profile edit, media ownership, cancellation and notification isolation');
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
 const notificationResponse=await fetch(url+'/functions/v1/dispatch-notifications',{method:'POST',headers:{Authorization:'Bearer '+student.token,apikey:status.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({event_ids:cancelled.notification_ids})});
 assert.equal(notificationResponse.status,200);const queued=await notificationResponse.json();assert.equal(queued.failed,2);assert.equal(queued.delivered,false);
 assert.equal(ok(await admin.from('action_notifications').select('email_status').eq('id',cancelled.notification_ids[0]).single()).email_status,'failed');
 console.log('PASS: real notification Edge retains failed email for retry without claiming delivery');
 const staff=await account('student');
 const assigned=ok(await moderator.client.rpc('assign_counselor',{counselor_email:staff.email,learner_email:student.email,school_name:'Disposable School'}));
 assert.equal(ok(await staff.client.rpc('get_counselor_dashboard')).students.length,0);
 assert.ok((await other.client.rpc('assign_counselor',{counselor_email:staff.email,learner_email:other.email,school_name:'Forged School'})).error);
 ok(await student.client.rpc('respond_counselor_link',{link_id:assigned,decision:'approved'}));
 const application=ok(await student.client.from('university_applications').insert({student_id:student.id,student_email:student.email,university_name:'Disposable University',stage:'Saved',created_by:student.id}).select('id').single());
 const staffReport=ok(await staff.client.rpc('get_counselor_dashboard'));
 assert.equal(staffReport.students.length,1);assert.equal(staffReport.students[0].id,student.id);assert.equal(staffReport.applications.length,1);
 assert.ok(!('metadata' in staffReport.students[0]));assert.ok((await other.client.rpc('get_counselor_dashboard')).error);
 const reminder=ok(await staff.client.rpc('queue_counselor_reminder',{learner_id:student.id}));
 assert.equal(ok(await staff.client.rpc('queue_counselor_reminder',{learner_id:student.id})),reminder);
 assert.ok((await staff.client.rpc('queue_counselor_reminder',{learner_id:other.id})).error);
 await staff.client.realtime.setAuth(staff.token);
 const beforeRevision=ok(await staff.client.from('counselor_dashboard_signals').select('revision').eq('counselor_id',staff.id).single()).revision;
 let signalResolve;const signal=new Promise(resolve=>{signalResolve=resolve;});
 // WebSocket join acknowledgement can precede the actual replication listener.
 let readyResolve,readyReject;const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
 const readyTimer=setTimeout(()=>readyReject(new Error('Staff Realtime replication readiness unavailable')),20000);
 const staffChannel=staff.client.channel('staff-signal-acceptance')
  .on('system',{},payload=>{if(payload.extension==='postgres_changes' && payload.status==='ok'){clearTimeout(readyTimer);readyResolve();}})
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'counselor_dashboard_signals',filter:'counselor_id=eq.'+staff.id},payload=>signalResolve(payload));
 staffChannel.subscribe(status=>{if(status==='CHANNEL_ERROR'){clearTimeout(readyTimer);readyReject(new Error('Staff Realtime subscription failed'));}});
 await ready;
 ok(await student.client.from('university_applications').update({stage:'Started'}).eq('id',application.id));
 const afterRevision=ok(await staff.client.from('counselor_dashboard_signals').select('revision').eq('counselor_id',staff.id).single()).revision;assert.ok(afterRevision>beforeRevision,'Staff signal trigger must advance');
 let eventTimer;const signalEvent=await Promise.race([signal,new Promise((_,reject)=>{eventTimer=setTimeout(()=>reject(new Error('Staff Realtime signal missing')),20000);})]);clearTimeout(eventTimer);
 assert.equal(signalEvent.new.counselor_id,staff.id);await staff.client.removeChannel(staffChannel);
 ok(await student.client.rpc('respond_counselor_link',{link_id:assigned,decision:'revoked'}));
 assert.equal(ok(await staff.client.rpc('get_counselor_dashboard')).students.length,0);
 assert.ok((await staff.client.rpc('queue_counselor_reminder',{learner_id:student.id})).error);
 console.log('PASS: real staff assignment, learner consent/revocation, scoped roster, daily reminder deduplication and Realtime delivery');


}finally{worker?.kill('SIGTERM');try{await command(['stop']);}catch{}fs.rmSync(root,{recursive:true,force:true});}})().catch(error=>{console.error(clean(error.message));process.exitCode=1;});
