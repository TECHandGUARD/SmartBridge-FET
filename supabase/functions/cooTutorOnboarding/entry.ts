import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection, requiredEnv, appUrl } from '../../shared/config.ts';
import { authorize, withHttp } from '../../shared/http.ts';
import { json, apiError } from '../../shared/api.ts';

const COO_EMAIL_FROM = 'SmartBridge FET <noreply@auth.techandguard.co.za>';
// Job-only endpoint. COO has standing authority for this tightly bounded operational campaign.
// dry-run defaults to true. Live sends require COO_EMAIL_ENABLED=true in secrets.
const nonempty = (v: unknown) => Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim().length > 0 : typeof v === 'number' ? v > 0 : false;
const missingFields = (p: any): string[] => {
  const missing: string[] = [];
  if (!nonempty(p.bio)) missing.push('Biography');
  if (!nonempty(p.subjects) && !nonempty(p.subjects_taught)) missing.push('Subjects');
  if (!nonempty(p.grades) && !nonempty(p.grade_levels_taught)) missing.push('Grades');
  if (!nonempty(p.qualifications) && !nonempty(p.highest_qualification)) missing.push('Qualifications');
  if (!nonempty(p.teaching_languages) && !nonempty(p.languages_spoken)) missing.push('Teaching languages');
  if (!nonempty(p.session_price_per_hour) && !nonempty(p.hourly_rate)) missing.push('Hourly rate');
  return missing;
};
serve(withHttp(async (request) => {
 try {
  const { url,key }=serverConnection();
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const cronToken = request.headers.get('x-coo-job-secret');
  if (cronToken) {
    const {data: expected, error: keyError} = await client.rpc('coo_scheduler_secret');
    if (keyError || typeof expected !== 'string') throw new Error('Scheduled job verification unavailable');
    const hash = async (v:string) => new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
    const [a,b] = await Promise.all([hash(cronToken),hash(expected)]);
    let mismatch = a.length ^ b.length;
    for(let i=0;i<Math.min(a.length,b.length);i++)mismatch |= a[i]^b[i];
    if(mismatch !== 0) return json({error:'Unauthorized scheduled request'},401);
  } else {
    await authorize(request,client,'job');
  }
  const payload=await request.json().catch(()=>({}));
  const {data: config,error:configError} = await client.from('coo_automation_settings')
    .select('enabled,daily_limit,autonomy').eq('key','tutor-onboarding').single();
  if(configError)throw new Error('COO sending configuration unavailable');
  const dryRun=payload?.dry_run !== false || config?.enabled !== true;
  let providerReady=false,linkReady=false,providerSenderDomain:string|null=null;
  try {
    requiredEnv('RESEND_API_KEY');
    providerReady=true;
    providerSenderDomain='auth.techandguard.co.za';
  } catch { /* Configuration is checked again before sending. */ }
  try { appUrl('/tutor-dashboard'); linkReady=true; } catch { /* Block live sending if app origin is unconfigured. */ }
  const deliverySettings=dryRun?null:{apiKey:requiredEnv('RESEND_API_KEY'),from:COO_EMAIL_FROM};
  const now=Date.now();
  const {data:users,error:userError}=await client.from('users').select('id,email,full_name,role,created_at,is_active,communication_preferences').eq('role','student_tutor').eq('is_active',true).limit(500);
  if(userError)throw userError;
  const {data:profiles,error:profileError}=await client.from('tutor_profiles').select('user_id,bio,subjects,subjects_taught,grades,grade_levels_taught,qualifications,highest_qualification,teaching_languages,languages_spoken,session_price_per_hour,hourly_rate').limit(500);
  if(profileError)throw profileError;
  const byUser=new Map((profiles||[]).map((p:any)=>[p.user_id,p]));
  let eligible=0,attempted=0,accepted=0,failed=0,skipped=0;
  const attempts:any[]=[];
  for(const user of users||[]) {
   const hours=(now-Date.parse(user.created_at))/3600000;
   if(!Number.isFinite(hours)||hours<48) {skipped++;continue;}
   if(!user.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {skipped++;continue;}
   // Fail closed on unsupported communication-preference values.
   if(typeof user.communication_preferences !== 'string' || !/^(all|email|email_only|email_enabled)$/i.test(user.communication_preferences.trim())) {skipped++;continue;}
   const profile=byUser.get(user.id);
   const missing=profile?missingFields(profile):['Tutor profile'];
   if(!missing.length) {skipped++;continue;}
   const campaign=hours>=72?'profile_72h':'profile_48h';
   eligible++;
   if(dryRun){attempts.push({campaign,fields:missing,status:'preview'});continue;}
   const {data:reservation,error:reserveError}=await client.rpc('coo_reserve_email',{p_tutor_id:user.id,p_campaign:campaign,p_recipient_email:user.email,p_missing_fields:missing});
   if(reserveError)throw reserveError;
   if(!reservation){skipped++;continue;}
   attempted++;
   const {apiKey,from}=deliverySettings!;
   const name=(typeof user.full_name==='string'&&user.full_name.trim()?user.full_name.trim().split(' ')[0]:'Tutor').slice(0,80);
   const subject='Complete your SmartBridge FET tutor profile';
   const profileUrl=appUrl('/tutor-dashboard');
   const body='Hi '+name+',\n\nWelcome to SmartBridge FET. Your tutor profile needs a few details: '+missing.join(', ')+'.\n\nA complete profile helps learners and parents understand your subjects, qualifications, teaching approach and availability. It also helps you prepare for bookings when your account is eligible. Completing your profile does not guarantee bookings or earnings.\n\nUpdate your profile: '+profileUrl+'\n\nSmartBridge FET Tutor Success (automated COO assistant)';
   try {
    const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':reservation},body:JSON.stringify({from,to:[user.email],subject,text:body,headers:{'X-SmartBridge-COO-Log':reservation}}),signal:AbortSignal.timeout(15000)});
    const response=await resp.json().catch(()=>({}));
    const state=resp.ok&&typeof response.id==='string'?'accepted':'failed';
    await client.from('coo_tutor_email_log').update({state,provider_id:state==='accepted'?response.id:null,updated_at:new Date().toISOString()}).eq('id',reservation);
    if(state==='accepted')accepted++;else failed++;
   } catch {
    failed++;
    await client.from('coo_tutor_email_log').update({state:'failed',updated_at:new Date().toISOString()}).eq('id',reservation);
   }
  }
  // Daily operational report is visible to admins through database aggregation; do not expose recipient PII in job response.
  return json({dry_run:dryRun,provider_ready:providerReady,provider_sender_domain:providerSenderDomain,link_ready:linkReady,eligible,attempted,accepted,failed,skipped,preview:dryRun?attempts.slice(0,25):undefined});
 } catch(error){return apiError(error);}
},'coo-tutor-onboarding'));
