import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply(405,{error:'POST required'});
 try{
  const auth=req.headers.get('authorization')||'';
  if(!/^Bearer\\s+\\S+$/i.test(auth))return reply(401,{error:'Sign in required'});
  const url=Deno.env.get('SUPABASE_URL'),key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),groq=Deno.env.get('GROQ_API_KEY');
  if(!url||!key||!groq)return reply(503,{error:'AI service not configured'});
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(auth.replace(/^Bearer\\s+/i,''));
  if(error||!user)return reply(401,{error:'Invalid session'});
  const {data:profile,error:pe}=await db.from('users').select('is_active,role,is_super_admin').eq('id',user.id).maybeSingle();
  if(pe||!profile||profile.is_active===false)return reply(403,{error:'Account not permitted'});
  // Restricted to administrators until provider terms and minor protections are verified.
  if(profile.role!=='admin'&&profile.is_super_admin!==true)return reply(403,{error:'AI pilot is restricted to administrators'});
  const raw=await req.text();
  if(raw.length>16000)return reply(413,{error:'Request too large'});
  let body;try{body=JSON.parse(raw)}catch{return reply(400,{error:'Invalid JSON'})}
  if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>4000||body.task&&body.task!=='study-assistant')return reply(400,{error:'Valid study-assistant prompt required (max 4000 characters)'});
  const {data:allowed,error:qe}=await db.rpc('consume_api_quota',{actor_id:user.id,quota_scope:'ai'});
  if(qe)return reply(503,{error:'Usage controls unavailable'});
  if(allowed!==true)return reply(429,{error:'Daily AI limit reached'});
  const model=Deno.env.get('GROQ_MODEL')||'llama-3.1-8b-instant';
  const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Authorization':'Bearer '+groq,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0.3,max_tokens:500,messages:[{role:'system',content:'You are a careful study assistant for South African CAPS Grades 10-12. Give concise explanations, acknowledge uncertainty, avoid harmful content and personal-data requests, and encourage checking important facts with a teacher. Never claim your answers are verified.'},{role:'user',content:body.prompt}]}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)return reply(response.status===429?429:502,{error:response.status===429?'AI free-tier limit reached':'AI provider unavailable'});
  const result=await response.json();const answer=result?.choices?.[0]?.message?.content;
  if(typeof answer!=='string'||!answer.trim())return reply(502,{error:'Empty AI response'});
  return reply(200,{response:answer.slice(0,10000)});
 }catch{return reply(503,{error:'AI service temporarily unavailable'})}
});