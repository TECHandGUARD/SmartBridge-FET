import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import JSZip from "npm:jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Download CAPS Documents as ZIP
 * Fetches filtered CAPS documents and packages them into a ZIP file.
 * Used by the Resources Library "Download All as ZIP" feature.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { subject, grade, document_type } = await req.json();

    // Build filter
    let query = supabaseClient
      .from('caps_documents')
      .select('*');

    if (subject && subject !== 'all') {
      query = query.eq('subject', subject);
    }
    if (grade && grade !== 'all') {
      query = query.eq('grade', grade);
    }
    if (document_type && document_type !== 'all') {
      query = query.eq('document_type', document_type);
    }

    const { data: docs, error: docsError } = await query;

    if (docsError) {
      throw new Error("Failed to fetch documents: " + docsError.message);
    }

    if (!docs || docs.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No documents found for the selected filters.' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const zip = new JSZip();

    // Fetch each PDF and add to zip
    await Promise.all(docs.map(async (doc: any) => {
      try {
        const res = await fetch(doc.file_url);
        if (!res.ok) return;
        const buffer = await res.arrayBuffer();
        const safeName = doc.title.replace(/[^a-z0-9]/gi, '_').substring(0, 60);
        zip.file(`${safeName}.pdf`, buffer);

        // Increment download count
        await supabaseClient
          .from('caps_documents')
          .update({ 
            download_count: (doc.download_count || 0) + 1 
          })
          .eq('id', doc.id)
          .catch(() => {});
      } catch (_e) {
        // skip failed files
      }
    }));

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    return new Response(zipBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="CAPS_Documents.zip"`,
      },
    });

  } catch (error: any) {
    console.error('Download CAPS ZIP error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});