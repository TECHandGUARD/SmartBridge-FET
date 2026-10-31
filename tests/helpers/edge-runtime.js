import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
export function edgeRuntime(name, {client, env={}, fetch, research, Date: Clock=Date}={}) {
  let handler;const cache=new Map();
  const values={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'server-test-key',APP_BASE_URL:'https://staging.example.test',RESEND_API_KEY:'email-test-key',EMAIL_FROM:'SmartBridge <noreply@example.test>',GROQ_API_KEY:'model-test-key',GROQ_MODEL:'llama-3.1-8b-instant',...env};
  function load(file) {
    if(cache.has(file))return cache.get(file);
    const exports={};cache.set(file,exports);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
    const context={exports,module:{exports},Request,Response,Headers,URL,Date:Clock,TextEncoder,TextDecoder,Uint8Array,AbortSignal,atob,btoa,crypto:webcrypto,Deno:{env:{get:key=>values[key]}},console:{log(){},warn(){},error(){}},setTimeout:(fn)=>{fn();return 1;},fetch:fetch || (()=>{throw new Error('Unexpected network request');}),require(specifier){
      if(specifier.startsWith('npm:ai@'))return {generateText:research || (async()=>{throw new Error('Search unavailable in this test');})};
      if(specifier.startsWith('npm:@ai-sdk/groq@'))return {createGroq:()=>Object.assign((model)=>({model}),{tools:{browserSearch:()=>({})}})};
      if(specifier.includes('/http/server.ts'))return {serve:fn=>{handler=fn;}};
      if(specifier.includes('@supabase/supabase-js'))return {createClient:()=>client};
      if(specifier.includes('jszip'))return {default:class {}};
      if(specifier.startsWith('npm:unpdf'))return {getDocumentProxy:async()=>{throw new Error('PDF extraction not used in auth preflight tests');}};
      if(specifier.startsWith('.'))return load(path.resolve(path.dirname(file),specifier));
      throw new Error(`Unsupported test dependency: ${specifier}`);
    }};
    vm.runInNewContext(code,context,{filename:file});return exports;
  }
  const root=path.resolve('supabase');
  const helpers={http:load(path.join(root,'shared/http.ts')),config:load(path.join(root,'shared/config.ts')),email:load(path.join(root,'shared/email.ts'))};
  if(name){const folder=path.join(root,`functions/${name}`);const entry=fs.existsSync(path.join(folder,'entry.ts'))?'entry.ts':'index.ts';load(path.join(folder,entry));}
  return {handle:request=>handler(request),...helpers};
}
export function fakeClient(profile={id:'user-id',role:'student',is_active:true,is_super_admin:false}, resolve=()=>({data:[],error:null})) {
  const calls=[];
  const client={calls,rpc:async(name,args)=>{const call={table:name,operation:'rpc',data:args};calls.push(call);return name==='search_learning_knowledge'?{data:[{title:'Approved Mathematics Textbook',page_number:12,source_type:'educational_resources',source_id:'00000000-0000-4000-8000-000000000001',content:'Algebra involves manipulating variables and solving equations. Quadratic equations are equations of degree two.'}],error:null}:['consume_api_quota','email_recipients_allowed','record_email_acceptance'].includes(name)?{data:true,error:null}:resolve(call);},auth:{getUser:async()=>({data:{user:{id:'user-id',email:'user@example.test',user_metadata:{role:'admin'}}},error:null})},from(table){
    const call={table,operation:'select',data:null,filters:[],single:false};
    const query={select(){return query;},eq(...args){call.filters.push(args);return query;},not(){return query;},order(){return query;},gte(){return query;},lte(){return query;},limit(){return query;},in(){return query;},maybeSingle(){call.single=true;return query;},single(){call.single=true;return query;},insert(data){call.operation='insert';call.data=data;return query;},update(data){call.operation='update';call.data=data;return query;},upsert(data){call.operation='upsert';call.data=data;return query;},then(ok,no){calls.push(call);return Promise.resolve(table==='users'?{data:typeof profile==='function'?profile(call):profile,error:null}:resolve(call)).then(ok,no);}};
    return query;
  }};return client;
}
