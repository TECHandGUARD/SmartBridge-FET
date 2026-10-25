import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp } from '../../shared/http.ts';
import { json, apiError, failure } from '../../shared/api.ts';
serve(withHttp(async (request) => {
 try {
  const {url,key}=serverConnection();
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  await authorize(request,client,'admin');
  const body=await request.json().catch(()=>({}));
  let preview=null;
  if(body?.preview === true){
    const {data: users,error: uError}=await client.from('users')
      .select('id,role,is_active,created_at,communication_preferences,email')
      .in('role',['student_tutor','sace_tutor','tutor']).eq('is_active',true).limit(500);
    if(uError)failure(503,'Preview could not read tutor accounts');
    const {data:profiles,error:pError}=await client.from('tutor_profiles')
      .select('user_id,bio,subjects,subjects_taught,grades,grade_levels_taught,qualifications,highest_qualification,teaching_languages,languages_spoken,session_price_per_hour,hourly_rate').limit(500);
    if(pError)failure(503,'Preview could not read tutor profiles');
    const profileMap=new Map((profiles||[]).map((p:any)=>[p.user_id,p]));
    const present=(v:any)=>Array.isArray(v)?v.length>0:typeof v==='string'?v.trim().length>0:typeof v==='number'?v>0:false;
    const stats={checked:0,too_new:0,no_consent:0,invalid_email:0,complete:0,eligible:0,send_count:0};
    for(const user of users||[]){
      stats.checked++;
      if((Date.now()-Date.parse(user.created_at))/3600000<48){stats.too_new++;continue;}
      if(!user.email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(user.email)){stats.invalid_email++;continue;}
      if(typeof user.communication_preferences!=='string'|| !/^(all|email|email_only|email_enabled)$/i.test(user.communication_preferences.trim())){stats.no_consent++;continue;}
      const p=profileMap.get(user.id) as any;
      const missing=!p || !present(p.bio) || !(present(p.subjects)||present(p.subjects_taught))
        || !(present(p.grades)||present(p.grade_levels_taught))
        || !(present(p.qualifications)||present(p.highest_qualification))
        || !(present(p.teaching_languages)||present(p.languages_spoken))
        || !(present(p.session_price_per_hour)||present(p.hourly_rate));
      if(!missing){stats.complete++;continue;}
      stats.eligible++;
    }
    preview={...stats,mode:'simulation',note:'No emails sent; no recipient addresses revealed'};
  }
  const {data, error}=await client.from('coo_tutor_email_log')
    .select('campaign,state,created_at').gte('created_at',new Date(Date.now()-7*86400000).toISOString()).limit(1000);
  if(error)failure(503,'COO reporting not configured');
  const {data: daily,error: dailyError}=await client.from('coo_daily_reports')
    .select('report_date,attempted,accepted,delivered,bounced,failed,suppressed')
    .order('report_date',{ascending:false}).limit(7);
  if(dailyError)failure(503,'Daily executive report unavailable');
  const statuses:Record<string,number>={};
  for(const item of data||[])statuses[item.state]=(statuses[item.state]||0)+1;
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const today=(data||[]).filter((x:any)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x.created_at))===localDate);
  return json({preview,daily_reports:daily||[],executive:'COO',email_enabled:(await client.from('coo_automation_settings').select('enabled').eq('key','tutor-onboarding').single()).data?.enabled===true,daily_limit:25,used_today:today.length,last_7_days:statuses,report_date:localDate,reporting_window:'last 7 days',autonomy:'routine'});
 }catch(error){return apiError(error);}
},'coo-board-report'));