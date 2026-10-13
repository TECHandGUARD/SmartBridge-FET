import { emailFetch } from "../../shared/email.ts";
import { serverConnection, emailSettings, appUrl } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Resend Email API configuration

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'admin');
    const { apiKey: RESEND_API_KEY, from: FROM_EMAIL } = emailSettings();
    const APP_URL = appUrl().replace(/\/$/, '');
    const { doc_id, action, reviewer_notes } = await req.json();
    // action: 'approved' | 'rejected'

    if (!doc_id || !action) {
      return new Response(
        JSON.stringify({ error: "doc_id and action are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action !== "approved" && action !== "rejected") {
      return new Response(
        JSON.stringify({ error: "action must be 'approved' or 'rejected'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get the document
    const { data: doc, error: docError } = await supabase
      .from("application_documents")
      .select("*")
      .eq("id", doc_id)
      .single();

    if (docError || !doc) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const newStatus = action === "approved" ? "verified" : "rejected";

    // Update document status
    const { error: updateError } = await supabase
      .from("application_documents")
      .update({
        status: newStatus,
        notes: reviewer_notes || doc.notes || "",
        verified_at: action === "approved" ? new Date().toISOString() : null,
        rejected_at: action === "rejected" ? new Date().toISOString() : null,
        rejected_reason: action === "rejected" ? reviewer_notes || null : null,
        updated_at: new Date().toISOString()
      })
      .eq("id", doc_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const isApproved = action === "approved";

    const subject = isApproved
      ? `✅ Document Verified: ${doc.doc_type} for ${doc.university_name}`
      : `⚠️ Action Required: Re-upload ${doc.doc_type} for ${doc.university_name}`;

    const bodyText = isApproved
      ? `Dear Student,\n\nGreat news! Your ${doc.doc_type} uploaded for ${doc.university_name} has been reviewed and verified by your counselor.\n\nNo further action is needed for this document. Keep up the great work!\n\n${reviewer_notes ? `Reviewer Note: ${reviewer_notes}\n\n` : ""}Best of luck with your application,\nSmartBridge FET Team`
      : `Dear Student,\n\nYour ${doc.doc_type} submitted for ${doc.university_name} could not be accepted and has been rejected.\n\nAction required: Please log in to SmartBridge FET, go to your Application Tracker, and re-upload a new version of this document.\n\n${reviewer_notes ? `Reason: ${reviewer_notes}\n\n` : "Please ensure the document is legible, complete, and in the correct format (PDF, JPG, or PNG).\n\n"}If you need assistance, contact your school counselor.\n\nSmartBridge FET Team`;

    const bodyHtml = isApproved
      ? `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #2d3748;">✅ Document Verified!</h2>
  <p style="color: #4a5568; font-size: 16px;">Dear Student,</p>
  <p style="color: #4a5568; font-size: 16px;">Great news! Your <strong>${doc.doc_type}</strong> uploaded for <strong>${doc.university_name}</strong> has been reviewed and <strong style="color: #38a169;">verified</strong> by your counselor.</p>
  <p style="color: #4a5568; font-size: 16px;">No further action is needed for this document. Keep up the great work!</p>
  ${reviewer_notes ? `<p style="color: #4a5568; font-size: 16px;"><strong>Reviewer Note:</strong> ${reviewer_notes}</p>` : ""}
  <p style="color: #4a5568; font-size: 16px; margin-top: 20px;">Best of luck with your application,</p>
  <p style="color: #4a5568; font-size: 16px;">SmartBridge FET Team</p>
</div>`
      : `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #e53e3e;">⚠️ Document Rejected</h2>
  <p style="color: #4a5568; font-size: 16px;">Dear Student,</p>
  <p style="color: #4a5568; font-size: 16px;">Your <strong>${doc.doc_type}</strong> submitted for <strong>${doc.university_name}</strong> could not be accepted and has been <strong style="color: #e53e3e;">rejected</strong>.</p>
  <p style="color: #4a5568; font-size: 16px;"><strong>Action required:</strong> Please log in to SmartBridge FET, go to your Application Tracker, and re-upload a new version of this document.</p>
  ${reviewer_notes ? `<p style="color: #4a5568; font-size: 16px;"><strong>Reason:</strong> ${reviewer_notes}</p>` : "<p style='color: #4a5568; font-size: 16px;'>Please ensure the document is legible, complete, and in the correct format (PDF, JPG, or PNG).</p>"}
  <p style="color: #4a5568; font-size: 16px;">If you need assistance, contact your school counselor.</p>
  <p style="color: #4a5568; font-size: 16px; margin-top: 20px;">SmartBridge FET Team</p>
</div>`;

    // Send email using Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({
          success: true,
          new_status: newStatus,
          notified: doc.student_email,
          email_sent: false,
          warning: "RESEND_API_KEY not configured"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await emailFetch({
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [doc.student_email],
        subject: subject,
        html: bodyHtml,
        text: bodyText,
      }),
    }, supabase);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
    }

    const emailResult = await resendResponse.json();

    // Log the notification in audit log
    await supabase
      .from("activity_log")
      .insert({
        event_type: "notification_sent",
        user_email: doc.student_email,
        description: `Document status notification sent for document ${doc_id}`,
        metadata: {
          doc_id,
          action,
          new_status: newStatus,
          email_id: emailResult.id
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        new_status: newStatus,
        notified: doc.student_email,
        email_sent: true,
        email_id: emailResult.id
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'notify-document-status'));
