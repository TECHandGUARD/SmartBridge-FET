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
    const { email, full_name, reason } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const name = full_name || "there";

    const reasonSection = reason
      ? `Reason:\n${reason}`
      : "Our team was unable to verify the information provided during registration.";

    const subject = "❌ SmartBridge FET — Account Application Update";

    const bodyText = `Hi ${name},

Thank you for registering on SmartBridge FET.

After reviewing your application, we were unfortunately unable to approve your account at this time.

${reasonSection}

What you can do next:
  • Review the reason above and correct any issues
  • Re-register with accurate information: ${APP_URL}
  • Contact us if you believe this was a mistake

We apologise for any inconvenience and hope to welcome you to SmartBridge FET soon.

— SmartBridge FET
   Tech & GUARD Pty Ltd`;

    const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #e53e3e; border-bottom: 3px solid #e53e3e; padding-bottom: 10px;">❌ Account Application Update</h2>
  <p style="color: #4a5568; font-size: 16px;">Hi ${name},</p>
  <p style="color: #4a5568; font-size: 16px;">Thank you for registering on SmartBridge FET.</p>
  <p style="color: #4a5568; font-size: 16px;">After reviewing your application, we were unfortunately <strong style="color: #e53e3e;">unable to approve</strong> your account at this time.</p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #e53e3e;">
    <p style="color: #4a5568; font-size: 16px; margin: 0;"><strong>Reason:</strong></p>
    <p style="color: #4a5568; font-size: 16px; margin: 5px 0 0 0;">${reasonSection.replace(/\n/g, "<br>")}</p>
  </div>
  <p style="color: #4a5568; font-size: 16px;"><strong>What you can do next:</strong></p>
  <ul style="color: #4a5568; font-size: 16px; padding-left: 20px;">
    <li>Review the reason above and correct any issues</li>
    <li>Re-register with accurate information: <a href="${APP_URL}" style="color: #3182ce;">${APP_URL}</a></li>
    <li>Contact us if you believe this was a mistake</li>
  </ul>
  <p style="color: #4a5568; font-size: 16px;">We apologise for any inconvenience and hope to welcome you to SmartBridge FET soon.</p>
  <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">— SmartBridge FET<br>Tech & GUARD Pty Ltd</p>
  <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="color: #a0aec0; font-size: 12px; text-align: center;">
    This is an automated notification. Please do not reply to this email.
  </p>
</div>`;

    // Send email using Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "RESEND_API_KEY not configured",
          sent_to: email
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
        to: [email],
        subject: subject,
        html: bodyHtml,
        text: bodyText,
      }),
    }, supabase);

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResult = await resendResponse.json();

    // Log the notification in audit log
    await supabase
      .from("activity_log")
      .insert({
        event_type: "notification_sent",
        user_email: email,
        description: `User rejection notification sent`,
        metadata: {
          email_id: emailResult.id
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        sent_to: email,
        email_id: emailResult.id
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending user rejection notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'notify-user-rejected'));
