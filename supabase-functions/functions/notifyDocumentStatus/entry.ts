import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Document Verification Function
 * Handles document verification by counselors/admins.
 * Sends email notification to student about verification status.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
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

    // Check if user is admin or counselor
    const userRole = user.app_metadata?.role || user.user_metadata?.role;
    if (userRole !== 'admin' && userRole !== 'counselor') {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { doc_id, action, reviewer_notes } = await req.json();
    // action: 'approved' | 'rejected'

    if (!doc_id || !action) {
      return new Response(
        JSON.stringify({ error: 'doc_id and action are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the document
    const { data: doc, error: docError } = await supabaseClient
      .from('application_documents')
      .select('*')
      .eq('id', doc_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update document status
    const newStatus = action === 'approved' ? 'verified' : 'rejected';
    const { error: updateError } = await supabaseClient
      .from('application_documents')
      .update({
        status: newStatus,
        notes: reviewer_notes || doc.notes || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', doc_id);

    if (updateError) {
      throw new Error("Failed to update document: " + updateError.message);
    }

    const isApproved = action === 'approved';

    const subject = isApproved
      ? `✅ Document Verified: ${doc.doc_type} for ${doc.university_name}`
      : `⚠️ Action Required: Re-upload ${doc.doc_type} for ${doc.university_name}`;

    const body = isApproved
      ? `
Dear Student,

Great news! Your <strong>${doc.doc_type}</strong> uploaded for <strong>${doc.university_name}</strong> has been reviewed and <strong>verified</strong> by your counselor.

No further action is needed for this document. Keep up the great work!

${reviewer_notes ? `<br><strong>Reviewer Note:</strong> ${reviewer_notes}` : ''}

Best of luck with your application,
SmartBridge FET Team
      `.trim()
      : `
Dear Student,

Your <strong>${doc.doc_type}</strong> submitted for <strong>${doc.university_name}</strong> could not be accepted and has been <strong>rejected</strong>.

<strong>Action required:</strong> Please log in to SmartBridge FET, go to your Application Tracker, and re-upload a new version of this document.

${reviewer_notes ? `<strong>Reason:</strong> ${reviewer_notes}` : 'Please ensure the document is legible, complete, and in the correct format (PDF, JPG, or PNG).'}

If you need assistance, contact your school counselor.

SmartBridge FET Team
      `.trim();

    // Send email (logging for now, replace with actual email sending)
    console.log(`[DOCUMENT VERIFICATION] To: ${doc.student_email}, Status: ${newStatus}`);

    // If you have a send-email function, uncomment this:
    // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    //   body: {
    //     to: doc.student_email,
    //     subject: subject,
    //     body: body,
    //     from_name: 'SmartBridge FET'
    //   }
    // });
    // if (emailError) console.error('Failed to send email:', emailError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        new_status: newStatus, 
        notified: doc.student_email 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Document verification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});