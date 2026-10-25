import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { serverConnection } from '../../shared/config.ts';

const headers = {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
const page = (title:string, message:string, form='') => new Response(
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+title+
  '</title><main style="font:16px system-ui;max-width:520px;margin:70px auto;padding:24px"><h1>'+title+
  '</h1><p>'+message+'</p>'+form+'</main></html>',{headers});
serve(async (request)=>{
 try {
  if(!['GET','POST'].includes(request.method))return new Response('Method not allowed',{status:405});
  const input=new URL(request.url).searchParams.get('token')||'';
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input))
    return page('Invalid link','This opt-out link is invalid. You can also change your preferences in your SmartBridge FET tutor dashboard.');
  if(request.method==='GET')return page('Stop profile reminders','This only stops optional tutor profile reminder emails. Account security messages may still be delivered.',
    '<form method="POST" action="?token='+encodeURIComponent(input)+'"><button style="padding:12px;border:0;border-radius:8px;background:#161616;color:white">Stop reminders</button></form>');
  const {url,key}=serverConnection();
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.rpc('coo_redeem_unsubscribe_token',{p_token:input});
  if(error)return page('Service unavailable','Please try again later or disable reminders in your tutor dashboard.');
  return data===true?page('Reminders stopped','You will no longer receive optional tutor profile completion reminders.')
    :page('Link expired','This link has already been used or is no longer valid.');
 }catch{return page('Service unavailable','Please try again later or change your preference in the tutor dashboard.');}
});
