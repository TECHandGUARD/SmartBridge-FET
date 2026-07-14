import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend Email API configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@yourdomain.com";
const APP_URL = Deno.env.get("APP_URL") || "https://smartbridgefet.com";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header (optional - webhook can be called without auth)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && authUser) {
        user = authUser;
      }
    }

    const body = await req.json();
    const { data, old_data } = body;

    // Only fire when status changes TO "confirmed"
    if (!data || data.status !== "confirmed" || old_data?.status === "confirmed") {
      return new Response(
        JSON.stringify({ skipped: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const studentEmail = data.student_email;
    if (!studentEmail) {
      return new Response(
        JSON.stringify({ skipped: "no student email" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Send email using Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY not configured",
          notified: studentEmail 
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
        <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">✅ Booking Confirmed!</h2>
        <p style="color: #4a5568; font-size: 16px;">Hi there,</p>
        <p style="color: #4a5568; font-size: 16px;">Great news! Your tutoring session has been confirmed.</p>
        <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p><strong>📚 Subject:</strong> ${data.subject}</p>
          <p><strong>👨‍🏫 Tutor:</strong> ${data.tutor_name || "Your tutor"}</p>
          <p><strong>📅 Date:</strong> ${data.date}</p>
          <p><strong>⏰ Time:</strong> ${data.time}</p>
          <p><strong>⏱ Duration:</strong> ${data.duration_hours || 1} hour(s)</p>
          ${data.session_link ? `<p><strong>🔗 Join link:</strong> <a href="${data.session_link}" style="color: #3182ce;">${data.session_link}</a></p>` : ""}
          ${data.message ? `<p><strong>📝 Note from tutor:</strong> "${data.message}"</p>` : ""}
        </div>
        <p style="color: #4a5568; font-size: 16px;">
          <a href="${APP_URL}/bookings" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
            Manage Your Bookings
          </a>
        </p>
        <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Good luck with your studies!</p>
        <p style="color: #4a5568; font-size: 14px;">The SmartBridge FET Team</p>
        <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 12px; text-align: center;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [studentEmail],
        subject: `✅ Booking Confirmed — ${data.subject} with ${data.tutor_name || "your tutor"}`,
        html: emailHtml,
        text: `Hi there,\n\nGreat news! Your tutoring session has been confirmed.\n\n📚 Subject: ${data.subject}\n👨‍🏫 Tutor: ${data.tutor_name || "Your tutor"}\n📅 Date: ${data.date}\n⏰ Time: ${data.time}\n⏱ Duration: ${data.duration_hours || 1} hour(s)\n${data.session_link ? `\n🔗 Join link: ${data.session_link}\n` : ""}\n${data.message ? `\nNote from tutor: "${data.message}"\n` : ""}\nLog in to manage your bookings:\n${APP_URL}/bookings\n\nGood luck with your studies!\nThe SmartBridge FET Team`,
      }),
    });

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
        user_email: studentEmail,
        description: `Booking confirmed notification sent for booking ${data.id}`,
        metadata: JSON.stringify({ booking_id: data.id, email_id: emailResult.id })
      });

    return new Response(
      JSON.stringify({ success: true, notified: studentEmail, email_id: emailResult.id }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});