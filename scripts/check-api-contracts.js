import fs from 'node:fs';import path from 'node:path';import ts from 'typescript';
const manifest=JSON.parse(fs.readFileSync('supabase/deployment-map.json','utf8'));
const names=new Set(manifest.functions.map(entry=>entry.slug));const failures=[];let count=0;
function scan(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const file=path.join(directory,entry.name);if(entry.isDirectory()){scan(file);continue;}if(!/\.[jt]sx?$/.test(file))continue;
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('x')?ts.ScriptKind.TSX:undefined);
 function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast).endsWith('.functions.invoke')&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])){
  count++;const name=node.arguments[0].text;if(!names.has(name))failures.push(`${file}: ${name}`);
 }ts.forEachChild(node,visit);}visit(ast);
}}
scan('src');
if(failures.length)throw new Error(`Missing endpoint mappings:\n${failures.join('\n')}`);
console.log(`${count} literal frontend function calls have deployment mappings (${names.size} functions). Dynamic calls require their existing handler tests.`);
