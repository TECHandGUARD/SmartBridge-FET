import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve('supabase');
const files=fs.readdirSync(path.join(root,'functions')).map(name=>path.join(root,`functions/${name}/entry.ts`)).concat(fs.readdirSync(path.join(root,'shared')).filter(name=>name.endsWith('.ts')).map(name=>path.join(root,'shared',name)));
// Check local TypeScript and imports. Remote SDKs require a separate Deno/runtime check on staging.
const declarations=path.resolve('scripts/edge-check-globals.d.ts');
const options={noEmit:true,strict:false,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,allowImportingTsExtensions:true,skipLibCheck:true,types:[],lib:['lib.es2022.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts']};
const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
host.getSourceFile=(file,...args)=>file===declarations?ts.createSourceFile(file,`declare const Deno: {env: {get(name:string):string|undefined}}; declare module 'https://*' { export function serve(handler:any):void; export function createClient(...args:any[]):any; const value:any; export default value; }`,ts.ScriptTarget.ES2022,true):original(file,...args);
const program=ts.createProgram([...files,declarations],options,host);
const diagnostics=ts.getPreEmitDiagnostics(program);
if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:file=>file,getNewLine:()=> '\n'}));process.exitCode=1;}
else console.log(`Edge TypeScript/local import checks pass (${files.length} modules; remote SDKs stubbed).`);
