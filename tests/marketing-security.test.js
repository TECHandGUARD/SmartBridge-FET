import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {captureAttribution,readAttribution,safePublicUrl} from '../src/lib/marketing.js';
const code=ts.transpileModule(fs.readFileSync('supabase/shared/document-fetch.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};vm.runInNewContext(code,{exports:mod.exports,URL,TextDecoder,Uint8Array,AbortSignal,fetch});
const {documentUrl,fetchDocument,MAX_DOCUMENT_BYTES}=mod.exports;
const project='https://example.supabase.co';
test('document fetch rejects internal addresses, credentials, lookalike hosts and unapproved storage paths',()=>{
 for(const url of ['http://www.education.gov.za/x.pdf','https://127.0.0.1/x','https://169.254.169.254/latest/meta-data','https://[::1]/x','https://www.education.gov.za.evil.test/x','https://name:secret@www.education.gov.za/x','https://example.supabase.co/functions/v1/x','https://www.education.gov.za:8443/x'])assert.throws(()=>documentUrl(url,project));
 assert.equal(documentUrl('https://www.education.gov.za/book.pdf',project).hostname,'www.education.gov.za');
});
test('document fetch forbids redirects and rejects oversized or non-PDF bodies',async()=>{
 let options;const data=await fetchDocument('https://www.education.gov.za/book.pdf',project,async(_,o)=>{options=o;return new Response('%PDF-1.7\nsmall test');});assert.equal(options.redirect,'error');assert.ok(options.signal);assert.equal(new TextDecoder().decode(data).slice(0,5),'%PDF-');
 await assert.rejects(fetchDocument('https://www.education.gov.za/book.pdf',project,async()=>new Response('x',{headers:{'content-length':String(MAX_DOCUMENT_BYTES+1)}})));
 await assert.rejects(fetchDocument('https://www.education.gov.za/book.pdf',project,async()=>new Response('<html>not a pdf')));
 await assert.rejects(fetchDocument('https://www.education.gov.za/book.pdf',project,async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_DOCUMENT_BYTES+1));c.close();}}))));
});
test('referral capture is bounded, first touch and optional',()=>{const m=new Map(),s={getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v)};captureAttribution('?ref='+ 'a'.repeat(32)+'&campaign=exam-help',s,10);captureAttribution('?campaign=later-campaign',s,20);assert.equal(readAttribution(s,30).campaign,'exam-help');assert.equal(readAttribution(s,8*86400000),null);assert.equal(safePublicUrl('javascript:alert(1)'),null);});
