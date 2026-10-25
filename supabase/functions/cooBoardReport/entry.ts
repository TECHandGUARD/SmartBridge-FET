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
  const {data, error}=await client.from('coo_tutor_email_log')
    .select('campaign,state,created_at').gte('created_at',new Date(Date.now()-7*86400000).toISOString()).limit(1000);
  if(error)failure(503,'COO reporting not configured');
  const statuses:Record<string,number>={};
  for(const item of data||[])statuses[item.state]=(statuses[item.state]||0)+1;
  const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const today=(data||[]).filter((x:any)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(x.created_at))===localDate);
  return json({executive:'COO',email_enabled:Deno.env.get('COO_EMAIL_ENABLED')==='true',daily_limit:25,used_today:today.length,last_7_days:statuses,report_date:localDate,reporting_window:'last 7 days',autonomy:'routine'});
 }catch(error){return apiError(error);}
},'coo-board-report'));