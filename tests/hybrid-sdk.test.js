import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { generateText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
test('real AI SDK accepts server-executed Groq search and sends required browser_search on the wire',async()=>{
 // Run the production research module with its actual pinned SDKs and a mocked provider HTTP boundary.
 const source=fs.readFileSync('supabase/shared/research.ts','utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 let sent;
 const factory=new Function('generateText','createGroq','Deno','fetch',`${js};return researchLearningQuestion;`);
 const research=factory(generateText,createGroq,{env:{get:()=> 'test-key'}},async(_url,options)=>{
  sent=JSON.parse(options.body);
  return Response.json({id:'test',created:1,model:'openai/gpt-oss-20b',choices:[{index:0,message:{role:'assistant',content:'The ovaries produce ova.'},finish_reason:'stop'}],usage:{prompt_tokens:1,completion_tokens:1,total_tokens:2},sources:[{title:'Education source',url:'https://education.gov.za/biology'}]});
 });
 const result=await research('Explain ovaries','Life Sciences','Grade 12');
 assert.equal(sent.tool_choice,'required');assert.equal(sent.tools[0].type,'browser_search');assert.equal(sent.response_format,undefined);assert.equal(result.status,'completed');assert.match(result.evidence,/ova/);assert.equal(result.sources[0].url,'https://education.gov.za/biology');
});
