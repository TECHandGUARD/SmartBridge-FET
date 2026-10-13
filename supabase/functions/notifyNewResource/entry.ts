import { emailFetch } from "../../shared/email.ts";
import { serverConnection, emailSettings, appUrl } from "../../shared/config.ts";
import { withHttp, authorize, webhookPayload } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Resend Email API configuration

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'job');
    const { apiKey: RESEND_API_KEY, from: FROM_EMAIL } = emailSettings();
    const APP_URL = appUrl().replace(/\/$/, '');
    const body = await req.json();
    const { data } = webhookPayload(body);

    if (!data) {
      return new Response(
        JSON.stringify({ skipped: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch all users to notify (only those with email)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("email, full_name")
      .not("email", "is", null)
      .eq("is_active", true);

    if (usersError) {
      return new Response(
        JSON.stringify({ error: usersError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: "No users to notify" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const resourceTitle = data.title || "A new resource";
    const subject = data.subject ? ` for ${data.subject}` : "";
    const grade = data.grade ? ` (${data.grade})` : "";
    const docType = data.document_type ? `[${data.document_type}] ` : "";

    // Send email using Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY not configured",
          notified: 0,
          total_recipients: users.length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    for (const user of users) {
      try {
        const bodyText = `Hi ${user.full_name || "Learner"},

A new ${docType}resource has just been added to the SmartBridge FET library${subject}${grade}:

📄 ${resourceTitle}
${data.description ? `\n${data.description}\n` : ""}
Log in to download it for free:
${APP_URL}/resources-library

Happy studying!
The SmartBridge FET Team`;

        const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">📚 New Resource Available!</h2>
  <p style="color: #4a5568; font-size: 16px;">Hi ${user.full_name || "Learner"},</p>
  <p style="color: #4a5568; font-size: 16px;">A new ${docType}resource has just been added to the SmartBridge FET library${subject}${grade}:</p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h3 style="color: #2d3748; margin: 0;">📄 ${resourceTitle}</h3>
    ${data.description ? `<p style="color: #4a5568; font-size: 14px; margin: 10px 0;">${data.description}</p>` : ""}
  </div>
  <p style="color: #4a5568; font-size: 16px;">
    <a href="${APP_URL}/resources-library" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
      View Resources Library
    </a>
  </p>
  <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Happy studying!</p>
  <p style="color: #4a5568; font-size: 14px;">The SmartBridge FET Team</p>
  <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="color: #a0aec0; font-size: 12px; text-align: center;">
    This is an automated notification. Please do not reply to this email.
  </p>
</div>`;

        const resendResponse = await emailFetch({
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [user.email],
            subject: `📚 New Resource Available: ${resourceTitle}`,
            html: bodyHtml,
            text: bodyText,
          }),
        }, supabase);

        if (resendResponse.ok) {
          sent++;
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${user.email}:`, errorText);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${user.email}:`, emailError.message);
      }
    }

    // Log the notification in audit log
    await supabase
      .from("activity_log")
      .insert({
        event_type: "notification_sent",
        user_email: "system",
        description: `New resource notification sent to ${sent} users`,
        metadata: {
          resource_id: data.id,
          resource_title: resourceTitle,
          recipients: sent
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        notified: sent,
        total_recipients: users.length
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'notify-new-resource'));
