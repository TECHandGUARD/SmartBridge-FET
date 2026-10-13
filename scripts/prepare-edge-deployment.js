import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const destination=process.argv[2];
if(!destination)throw new Error('Pass an output directory for reviewable deployment bundles.');
const root=process.cwd();const manifest=JSON.parse(fs.readFileSync('supabase/deployment-map.json','utf8'));
fs.mkdirSync(destination,{recursive:true});
for(const entry of manifest.functions){
 const paths=[entry.entrypoint,...entry.dependencies];
 const files=paths.map(name=>{
  const resolved=path.resolve(root,name);if(!resolved.startsWith(path.join(root,'supabase')+path.sep)||!name.endsWith('.ts'))throw new Error('Unexpected deployment dependency');
  const content=fs.readFileSync(resolved,'utf8');
  const expected=name===entry.entrypoint?entry.reconciled_entrypoint_sha256:entry.dependency_sha256[name];
  if(createHash('sha256').update(content).digest('hex')!==expected)throw new Error(`Source changed after review: ${name}`);
  return {name,content};
 });
 fs.writeFileSync(path.join(destination,`${entry.slug}.json`),JSON.stringify({name:entry.slug,entrypoint_path:entry.entrypoint,verify_jwt:entry.verify_jwt,files},null,2)+'\n');
}
console.log(`Prepared ${manifest.functions.length} source bundles. No deployment or secret configuration was performed.`);
