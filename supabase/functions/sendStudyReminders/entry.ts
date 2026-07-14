import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend Email API configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@yourdomain.com";
const APP_URL = Deno.env.get("APP_URL") || "https://smartbridgefet.com";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header (optional - cron job can call without auth)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && authUser) {
        user = authUser;
      }
    }

    // Get current day and time (UTC+2 for SAST)
    const now = new Date();
    const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayName = DAYS[sast.getUTCDay()];
    const currentHour = sast.getUTCHours().toString().padStart(2, "0");
    const currentMinute = sast.getUTCMinutes().toString().padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch all active reminders for today
    const { data: reminders, error: remindersError } = await supabase
      .from("study_reminders")
      .select("*")
      .eq("day_of_week", todayName)
      .eq("is_active", true);

    if (remindersError) {
      return new Response(
        JSON.stringify({ error: remindersError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ok",
          sent: 0,
          message: "No reminders for today",
          day: todayName,
          time: currentTime
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Filter reminders whose time matches current hour:minute (within same minute)
    const dueReminders = reminders.filter((r: any) => r.time === currentTime);

    if (!dueReminders || dueReminders.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ok",
          sent: 0,
          message: `No reminders due at ${currentTime}`,
          day: todayName,
          time: currentTime,
          total_reminders: reminders.length
        }),
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
          total_due: dueReminders.length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const results = [];

    for (const reminder of dueReminders) {
      if (!reminder.student_email) continue;

      try {
        const subjectLine = `📚 Study Reminder: ${reminder.subject}`;

        const bodyText = `Hi there,

This is your study reminder for ${reminder.subject} scheduled for ${reminder.day_of_week} at ${reminder.time}.

Time to open your books and make progress! Head to SmartBridge FET to access your resources, videos, and practice quizzes for ${reminder.subject}.

${reminder.note ? `Your note: ${reminder.note}` : ""}

Keep up the great work! 🎓

— The SmartBridge FET Team`;

        const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <div style="background: linear-gradient(135deg, #2d3748, #1a202c); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
    <h2 style="color: #fff; margin: 0;">📚 Study Reminder</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">${reminder.subject}</p>
  </div>
  <div style="padding: 20px; background: #fff; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="color: #4a5568; font-size: 16px;">Hi there,</p>
    <p style="color: #4a5568; font-size: 16px;">
      This is your study reminder for <strong>${reminder.subject}</strong> scheduled for <strong>${reminder.day_of_week} at ${reminder.time}</strong>.
    </p>
    <p style="color: #4a5568; font-size: 16px;">
      Time to open your books and make progress! Head to SmartBridge FET to access your resources, videos, and practice quizzes for ${reminder.subject}.
    </p>
    ${reminder.note ? `<div style="background-color: #f7fafc; padding: 10px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #d69e2e;"><p style="color: #4a5568; font-size: 14px; margin: 0;"><em>Your note: ${reminder.note}</em></p></div>` : ""}
    <p style="color: #4a5568; font-size: 16px;">
      <a href="${APP_URL}/dashboard" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
        Go to Dashboard
      </a>
    </p>
    <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Keep up the great work! 🎓</p>
    <p style="color: #4a5568; font-size: 14px;">— The SmartBridge FET Team</p>
  </div>
</div>`;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [reminder.student_email],
            subject: subjectLine,
            html: bodyHtml,
            text: bodyText,
          }),
        });

        if (resendResponse.ok) {
          const emailResult = await resendResponse.json();
          sent++;
          results.push({
            student: reminder.student_email,
            subject: reminder.subject,
            email_id: emailResult.id
          });

          // Log in audit log
          await supabase
            .from("activity_log")
            .insert({
              event_type: "notification_sent",
              user_email: reminder.student_email,
              description: `Study reminder sent for ${reminder.subject}`,
              metadata: JSON.stringify({
                reminder_id: reminder.id,
                subject: reminder.subject,
                day_of_week: reminder.day_of_week,
                time: reminder.time,
                email_id: emailResult.id
              })
            });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${reminder.student_email}:`, errorText);
          results.push({
            student: reminder.student_email,
            subject: reminder.subject,
            error: errorText
          });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${reminder.student_email}:`, emailError.message);
        results.push({
          student: reminder.student_email,
          subject: reminder.subject,
          error: emailError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        sent,
        day: todayName,
        time: currentTime,
        total_due: dueReminders.length,
        results
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending study reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});