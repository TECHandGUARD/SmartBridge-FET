import {fetchDocument, MAX_DOCUMENTS, MAX_ZIP_BYTES} from '../../shared/document-fetch.ts';
import { serverConnection } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'user');
    const { subject, grade, document_type } = await req.json();

    // Build filter
    let query = supabase
      .from("caps_documents")
      .select("*")
      .eq("is_active", true).limit(MAX_DOCUMENTS + 1);

    if (subject && subject !== "all") {
      query = query.eq("subject", subject);
    }
    if (grade && grade !== "all") {
      query = query.eq("grade", grade);
    }
    if (document_type && document_type !== "all") {
      query = query.eq("document_type", document_type);
    }

    const { data: docs, error: docsError } = await query;

    if (docsError) {
      return new Response(
        JSON.stringify({ error: docsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({ error: "No documents found for the selected filters." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (docs.length > MAX_DOCUMENTS) return new Response(JSON.stringify({error:'Select fewer documents (maximum 20).'}), {status:413,headers:{'Content-Type':'application/json'}});
    const zip = new JSZip(); let total = 0; const deadline = Date.now() + 35000;
    // Sequential bounded downloads avoid unbounded memory/concurrency and partial success.
    for (const doc of docs) {
      let buffer;
      try { const remaining = deadline - Date.now(); if (remaining <= 0) throw new Error('Archive timeout'); buffer = await fetchDocument(doc.file_url, connection.url, fetch, Math.min(12000,remaining)); }
      catch { return new Response(JSON.stringify({error:'A document is unavailable or its destination is not approved. Contact support.'}),{status:422,headers:{'Content-Type':'application/json'}}); }
      total += buffer.byteLength;
      if (total > MAX_ZIP_BYTES) return new Response(JSON.stringify({error:'Download exceeds the archive size limit. Select fewer documents.'}),{status:413,headers:{'Content-Type':'application/json'}});
      const safeName = String(doc.title || 'document').replace(/[^a-z0-9]/gi, '_').substring(0,60);
      zip.file(`${safeName}_${doc.id}.pdf`, buffer);
    }

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const {error: countError} = await supabase.rpc('increment_caps_downloads',{document_ids:docs.map(doc=>doc.id)});
    if(countError) return new Response(JSON.stringify({error:'Download could not be recorded. Please retry.'}),{status:503,headers:{'Content-Type':'application/json'}});
    return new Response(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="CAPS_Documents.zip"`,
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'download-caps-zip'));
