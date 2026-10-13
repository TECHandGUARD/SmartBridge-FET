import { emailFetch } from "../../shared/email.ts";
import { serverConnection, emailSettings, appUrl } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Resend Email API configuration

/**
 * Sends session reminder emails to students for upcoming confirmed bookings.
 * Called by two scheduled automations:
 *   1. Every day at 08:00 SAST  → 24-hour advance reminder
 *   2. Every hour               → 1-hour advance reminder
 *
 * Payload (optional): { window: "24h" | "1h" }  — if not provided, both windows are checked.
 */
serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'job');
    const { apiKey: RESEND_API_KEY, from: FROM_EMAIL } = emailSettings();
    const APP_URL = appUrl().replace(/\/$/, '');
    let body: { window?: string } = {};
    try { body = await req.json(); } catch (_) {}
    const { window: reminderWindow } = body;

    // Current time in SAST (UTC+2)
    const now = new Date();
    const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // Fetch all confirmed bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from("tutor_bookings")
      .select("*")
      .eq("status", "confirmed");

    if (bookingsError) {
      return new Response(
        JSON.stringify({ error: bookingsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ status: "ok", sent: 0, message: "No confirmed bookings found" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Emails not sent.");
      return new Response(
        JSON.stringify({
          status: "ok",
          sent: 0,
          error: "RESEND_API_KEY not configured",
          total_bookings: bookings.length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const currentHour = sastNow.getUTCHours();
    let sent = 0;
    const results = [];

    for (const booking of bookings) {
      if (!booking.student_email || !booking.date) continue;

      const bookingDate = booking.date; // expected YYYY-MM-DD
      const bookingTime = booking.time || "00:00"; // expected HH:MM

      // Parse booking datetime in SAST
      const [bHour, bMinute] = bookingTime.split(":").map(Number);
      const bookingDatetime = new Date(`${bookingDate}T${bookingTime}:00+02:00`);
      const diffMs = bookingDatetime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const want24h = !reminderWindow || reminderWindow === "24h";
      const want1h = !reminderWindow || reminderWindow === "1h";

      // 24h reminder: session is between 23h and 25h away
      const is24hWindow = diffHours >= 23 && diffHours <= 25;
      // 1h reminder: session is between 55min and 65min away
      const is1hWindow = diffHours >= 0.9 && diffHours <= 1.1;

      const shouldSend24h = want24h && is24hWindow && !booking.reminder_24h_sent;
      const shouldSend1h = want1h && is1hWindow && !booking.reminder_1h_sent;

      if (!shouldSend24h && !shouldSend1h) continue;

      const subjectLine = shouldSend1h
        ? `⏰ Session in 1 hour — ${booking.subject} with ${booking.tutor_name || "your tutor"}`
        : `📅 Session reminder — ${booking.subject} tomorrow at ${bookingTime}`;

      const bodyText = `Hi ${booking.student_name || "there"},

${shouldSend1h
  ? `Your tutoring session starts in about 1 hour!`
  : `You have a tutoring session tomorrow.`
}

📚 Subject: ${booking.subject}
👨‍🏫 Tutor: ${booking.tutor_name || "Your tutor"}
📅 Date: ${bookingDate}
⏰ Time: ${bookingTime}
${booking.session_link ? `\n🔗 Join: ${booking.session_link}` : ""}

Make sure you're prepared — have your notes and questions ready.

Log in to view your session details:
${APP_URL}/bookings

Good luck! 🎓
— The SmartBridge FET Team`;

      const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <div style="background: linear-gradient(135deg, #2d3748, #1a202c); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
    <h2 style="color: #fff; margin: 0;">${shouldSend1h ? "⏰ Session in 1 Hour!" : "📅 Session Reminder"}</h2>
  </div>
  <div style="padding: 20px; background: #fff; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="color: #4a5568; font-size: 16px;">Hi ${booking.student_name || "there"},</p>
    <p style="color: #4a5568; font-size: 16px;">
      ${shouldSend1h
        ? `Your tutoring session starts in about <strong style="color: #e53e3e;">1 hour</strong>!`
        : `You have a tutoring session <strong>tomorrow</strong>.`
      }
    </p>
    <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4a5568;">
      <p style="margin: 5px 0; color: #2d3748;"><strong>📚 Subject:</strong> ${booking.subject}</p>
      <p style="margin: 5px 0; color: #2d3748;"><strong>👨‍🏫 Tutor:</strong> ${booking.tutor_name || "Your tutor"}</p>
      <p style="margin: 5px 0; color: #2d3748;"><strong>📅 Date:</strong> ${bookingDate}</p>
      <p style="margin: 5px 0; color: #2d3748;"><strong>⏰ Time:</strong> ${bookingTime}</p>
      ${booking.session_link ? `<p style="margin: 5px 0; color: #2d3748;"><strong>🔗 Join:</strong> <a href="${booking.session_link}" style="color: #3182ce;">${booking.session_link}</a></p>` : ""}
    </div>
    <p style="color: #4a5568; font-size: 16px;">Make sure you're prepared — have your notes and questions ready.</p>
    <p style="color: #4a5568; font-size: 16px;">
      <a href="${APP_URL}/bookings" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
        View Session Details
      </a>
    </p>
    <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Good luck! 🎓</p>
    <p style="color: #4a5568; font-size: 14px;">— The SmartBridge FET Team</p>
  </div>
</div>`;

      try {
        const resendResponse = await emailFetch({
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [booking.student_email],
            subject: subjectLine,
            html: bodyHtml,
            text: bodyText,
          }),
        }, supabase);

        if (resendResponse.ok) {
          const emailResult = await resendResponse.json();

          // Mark reminder as sent so we don't double-send
          const update: any = {};
          if (shouldSend24h) update.reminder_24h_sent = true;
          if (shouldSend1h) update.reminder_1h_sent = true;
          update.updated_at = new Date().toISOString();

          const {error: trackingError} = await supabase
            .from("tutor_bookings")
            .update(update)
            .eq("id", booking.id);
          if (trackingError) throw trackingError;

          sent++;
          results.push({
            student: booking.student_email,
            type: shouldSend1h ? "1h" : "24h",
            email_id: emailResult.id
          });

          // Log in audit log
          await supabase
            .from("activity_log")
            .insert({
              event_type: "notification_sent",
              user_email: booking.student_email,
              description: `${shouldSend1h ? "1-hour" : "24-hour"} session reminder sent for booking ${booking.id}`,
              metadata: {
                booking_id: booking.id,
                reminder_type: shouldSend1h ? "1h" : "24h",
                email_id: emailResult.id
              }
            });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${booking.student_email}:`, errorText);
          results.push({
            student: booking.student_email,
            type: shouldSend1h ? "1h" : "24h",
            error: errorText
          });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${booking.student_email}:`, emailError.message);
        results.push({
          student: booking.student_email,
          type: shouldSend1h ? "1h" : "24h",
          error: emailError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        sent,
        results
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending session reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'send-session-reminders'));
