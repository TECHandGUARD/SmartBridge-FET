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
      .eq("is_active", true);

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

    const zip = new JSZip();

    // Fetch each PDF and add to zip
    await Promise.all(docs.map(async (doc) => {
      try {
        // Fetch the file from the URL
        const res = await fetch(doc.file_url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const safeName = doc.title.replace(/[^a-z0-9]/gi, "_").substring(0, 60);
        zip.file(`${safeName}.pdf`, buffer);

        // Increment download count
        await supabase
          .from("caps_documents")
          .update({
            download_count: (doc.download_count || 0) + 1
          })
          .eq("id", doc.id);
      } catch (_e) {
        // skip failed files
      }
    }));

    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

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
