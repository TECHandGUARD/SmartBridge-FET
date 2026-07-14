import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

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
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});