import { emailFetch } from "../../shared/email.ts";
import { serverConnection, emailSettings } from "../../shared/config.ts";
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
    const body = await req.json();
    const { event, data, old_data } = webhookPayload(body);

    // Skip if not an update event
    if (event?.type !== "update") {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if status changed
    const statusChanged = old_data?.status !== data?.status;
    if (!statusChanged) {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const { tutor_email, tutor_name, amount, status, booking_reference } = data;

    if (!tutor_email) {
      return new Response(
        JSON.stringify({ success: false, error: "tutor_email is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const statusMessages: Record<string, string> = {
      paid: `Your payout of R${amount} has been successfully processed.`,
      failed: `Your payout of R${amount} failed. Please contact support.`,
      cancelled: `Your payout of R${amount} has been cancelled.`
    };

    const message = statusMessages[status] || `Your payout status has been updated to: ${status}`;

    const subject = `Payout ${status === "paid" ? "Received" : "Updated"} - Booking ${booking_reference || "N/A"}`;

    const bodyText = `
Hello ${tutor_name || "Tutor"},

${message}

Booking Reference: ${booking_reference || "N/A"}
Amount: R${amount || "0.00"}
Status: ${status?.toUpperCase() || "UNKNOWN"}

If you have any questions, please contact our support team.

Best regards,
SmartBridge FET Team
    `;

    const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">
    💰 Payout ${status === "paid" ? "Received" : "Updated"}
  </h2>
  <p style="color: #4a5568; font-size: 16px;">Hello ${tutor_name || "Tutor"},</p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="color: #4a5568; font-size: 16px;">${message}</p>
    <hr style="border: 1px solid #e2e8f0; margin: 15px 0;" />
    <p style="color: #4a5568; font-size: 16px;"><strong>Booking Reference:</strong> ${booking_reference || "N/A"}</p>
    <p style="color: #4a5568; font-size: 16px;"><strong>Amount:</strong> R${amount || "0.00"}</p>
    <p style="color: #4a5568; font-size: 16px;"><strong>Status:</strong> <span style="font-weight: bold; ${
      status === "paid" ? "color: #38a169;" :
      status === "failed" ? "color: #e53e3e;" :
      "color: #d69e2e;"
    }">${status?.toUpperCase() || "UNKNOWN"}</span></p>
  </div>
  <p style="color: #4a5568; font-size: 16px;">If you have any questions, please contact our support team.</p>
  <p style="color: #4a5568; font-size: 16px; margin-top: 20px;">Best regards,</p>
  <p style="color: #4a5568; font-size: 16px;">SmartBridge FET Team</p>
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
          notified: tutor_email
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
        to: [tutor_email],
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
        user_email: tutor_email,
        description: `Payout status change notification sent for booking ${booking_reference}`,
        metadata: {
          booking_reference,
          status,
          amount,
          email_id: emailResult.id
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        notified: tutor_email,
        email_id: emailResult.id
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending payout notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'notify-payout-status-change'));
