import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import {serverConnection} from './config.ts';
import {authorize,withHttp,failure} from './http.ts';
import {readJson,text,json,apiError} from './api.ts';
const actions=new Set(['posts','replies','reports']);
const reasons=new Set(['spam','harassment','hate_speech','inappropriate','false_info','privacy','other']);
function uuid(value:unknown,name:string):string {
 const result=text(value,name,36);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))failure(400,`Invalid ${name}`);
 return result;
}
export function studyRoomHandler(action:'posts'|'replies'|'reports'|'quota',slug:string) {
 return withHttp(async request=>{
  try {
   const {url,key}=serverConnection();
   const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const actor=await authorize(request,client);
   const body=await readJson(request);
   if(action==='quota') {
    const selected=text(body.action,'action',10);if(!actions.has(selected))failure(400,'Invalid study action');
    const {data,error}=await client.rpc('study_room_quota_status',{actor_id:actor.id,action_name:selected});
    if(error)failure(503,'Study limits unavailable');return json(data);
   }
   const payload:Record<string,unknown>={};
   if(action==='posts') {
    payload.room_id=text(body.room_id,'room_id',30);payload.type=text(body.type,'type',8);
    if(!['Note','Question'].includes(String(payload.type)))failure(400,'Invalid post type');
    payload.title=body.title?text(body.title,'title',200):null;
    payload.body=text(body.body,'body',10000);payload.request_id=uuid(body.request_id,'request_id');
   }else {
    payload.post_id=uuid(body.post_id,'post_id');
    if(action==='replies'){payload.body=text(body.body,'body',5000);payload.request_id=uuid(body.request_id,'request_id');}
    else {payload.reason=text(body.reason,'reason',20);if(!reasons.has(String(payload.reason)))failure(400,'Invalid report reason');payload.comment=body.comment?text(body.comment,'comment',1000):null;}
   }
   const {data,error}=await client.rpc('submit_study_content',{actor_id:actor.id,action_name:action,payload});
   if(error){if(error.message==='Study action limit reached')failure(429,'Study action limit reached');failure(403,'Study action unavailable; check room membership and post status');}
   return json(data);
  }catch(error){return apiError(error);}
 },slug);
}
