import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { getDocumentProxy } from 'npm:unpdf@1.8.1';
import { serverConnection } from '../../shared/config.ts';
import { authorize, withHttp, failure } from '../../shared/http.ts';
import { readJson, uuid, json, apiError } from '../../shared/api.ts';
// Administrator-initiated indexing of approved educational PDFs only; never index personal uploads.
serve(withHttp(async (request) => {
 try {
  const {url,key}=serverConnection();
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  await authorize(request,db,'admin');
  const body=await readJson(request);
  const sourceId=uuid(body.source_id,'source_id');
  const sourceType=body.source_type || 'educational_resources';
  if(!['educational_resources','caps_documents'].includes(sourceType)) failure(400,'Only approved learning materials can be indexed');
  const start=Number(body.start_page ?? 1);
  if(!Number.isInteger(start)||start<1||start>800)failure(400,'Invalid start page');
  const {data:doc,error:docError}=await db.from(sourceType).select('*').eq('id',sourceId).eq('is_active',true).maybeSingle();
  if(docError||!doc)failure(404,'Active educational document not found');
  const ref=sourceType==='caps_documents'?doc.file_url:doc.resource_url;
  if(typeof ref!=='string'||!ref.startsWith('storage://'))failure(422,'Upload this PDF to SmartBridge Storage before indexing');
  const match=ref.match(/^storage:\/\/([a-z_]+)\/(.+\.pdf)$/i);
  if(!match||!['educational_resources','caps_documents'].includes(match[1])||match[2].includes('..'))failure(422,'Only managed PDF uploads are supported');
  const {data:blob,error:storageError}=await db.storage.from(match[1]).download(match[2]);
  if(storageError||!blob)failure(422,'Could not read the uploaded PDF');
  if(blob.size>12*1024*1024)failure(413,'PDF exceeds the 12 MB indexing limit');
  const pdf=await getDocumentProxy(new Uint8Array(await blob.arrayBuffer()),{maxImageSize:16_777_216});
  if(pdf.numPages>800)failure(413,'PDF has too many pages for this indexer');
  if(start>pdf.numPages)failure(400,'Start page exceeds PDF length');
  const end=Math.min(start+24,pdf.numPages);
  const rows:any[]=[];
  for(let page=start;page<=end;page++){
   const pageObj=await pdf.getPage(page);
   const items=await pageObj.getTextContent();
   const raw=(items.items as any[]).map(i=>typeof i.str==='string'?i.str:'').join(' ').replace(/\s+/g,' ').trim();
   if(raw.length<20)continue; // Image-only pages need OCR and are not silently indexed.
   for(let pos=0,n=0;pos<raw.length;pos+=1500,n++){
    const chunk=raw.slice(pos,pos+1700).trim();
    if(chunk.length>=20)rows.push({source_type:sourceType,source_id:sourceId,title:String(doc.title||'Learning document').slice(0,300),subject:doc.subject||null,grade:doc.grade||null,page_number:page,chunk_number:n,content:chunk});
   }
  }
  // A first-page reindex clears stale text; subsequent calls continue at the returned next_page.
  if(start===1){
   const {error:deleteError}=await db.from('learning_knowledge_chunks').delete().eq('source_type',sourceType).eq('source_id',sourceId);
   if(deleteError)failure(503,'Could not reset document index');
  }
  for(let i=0;i<rows.length;i+=80){
   const {error:insertError}=await db.from('learning_knowledge_chunks').upsert(rows.slice(i,i+80),{onConflict:'source_type,source_id,page_number,chunk_number'});
   if(insertError)failure(503,'Document indexing failed');
  }
  return json({title:doc.title,pages_indexed:end-start+1,chunks_indexed:rows.length,total_pages:pdf.numPages,next_page:end<pdf.numPages?end+1:null,complete:end>=pdf.numPages});
 }catch(error){return apiError(error);}
},'index-learning-documents'));
