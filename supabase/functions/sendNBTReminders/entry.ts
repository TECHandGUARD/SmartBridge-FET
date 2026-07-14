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

    // Fetch all NBT registrations with status 'registered'
    const { data: registrations, error: regError } = await supabase
      .from("nbt_registrations")
      .select("*")
      .eq("status", "registered");

    if (regError) {
      return new Response(
        JSON.stringify({ error: regError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ok",
          reminders_sent: 0,
          message: "No active NBT registrations found"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const toRemind = registrations.filter((r: any) => {
      if (r.reminder_sent) return false;
      const testDate = new Date(r.test_date);
      const daysUntil = Math.ceil((testDate.getTime() - now.getTime()) / 86400000);
      return daysUntil >= 0 && daysUntil <= 7;
    });

    if (toRemind.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ok",
          reminders_sent: 0,
          message: "No reminders to send at this time"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Send reminders
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Emails not sent.");
      return new Response(
        JSON.stringify({
          status: "ok",
          reminders_sent: 0,
          error: "RESEND_API_KEY not configured",
          total_due: toRemind.length
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const reg of toRemind) {
      try {
        const testDate = new Date(reg.test_date);
        const daysUntil = Math.ceil((testDate.getTime() - now.getTime()) / 86400000);
        const formattedDate = testDate.toLocaleDateString("en-ZA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        });

        const subject = `📝 NBT Reminder: Your test is ${daysUntil === 0 ? "TODAY" : `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}!`;

        const bodyText = `Dear ${reg.student_name || reg.student_email},

This is a reminder about your upcoming National Benchmark Test (NBT).

📅 Date: ${formattedDate}
📍 Venue: ${reg.venue}, ${reg.city}
📋 Tests: ${(reg.tests_registered || []).join(", ") || "As registered"}

What to bring on the day:
• Your South African ID or Passport
• Your NBT registration confirmation
• Pens and pencils (no calculators allowed)
• Arrive at least 30 minutes early

Quick Preparation Tips:
• Review the NBT sample questions on the official website
• Get a good night's sleep before the test
• Eat a nutritious breakfast on the day

Once you have your results, log in to SmartBridge FET and upload them to your profile under Student Opportunities → NBT Schedule.

Good luck — you've got this! 💪

SmartBridge FET Team`;

        const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <div style="background: linear-gradient(135deg, #2d3748, #1a202c); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
    <h2 style="color: #fff; margin: 0;">📝 NBT Reminder</h2>
    <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">${daysUntil === 0 ? "Your test is TODAY!" : `Your test is in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}</p>
  </div>
  <div style="padding: 20px; background: #fff; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
    <p style="color: #4a5568; font-size: 16px;">Dear ${reg.student_name || reg.student_email},</p>
    <p style="color: #4a5568; font-size: 16px;">This is a reminder about your upcoming <strong>National Benchmark Test (NBT)</strong>.</p>
    <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #4a5568;">
      <p style="margin: 5px 0; color: #2d3748;"><strong>📅 Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #2d3748;"><strong>📍 Venue:</strong> ${reg.venue}, ${reg.city}</p>
      <p style="margin: 5px 0; color: #2d3748;"><strong>📋 Tests:</strong> ${(reg.tests_registered || []).join(", ") || "As registered"}</p>
    </div>
    <p style="color: #4a5568; font-size: 16px;"><strong>What to bring on the day:</strong></p>
    <ul style="color: #4a5568; font-size: 16px; padding-left: 20px;">
      <li>Your South African ID or Passport</li>
      <li>Your NBT registration confirmation</li>
      <li>Pens and pencils (no calculators allowed)</li>
      <li>Arrive at least 30 minutes early</li>
    </ul>
    <p style="color: #4a5568; font-size: 16px;"><strong>Quick Preparation Tips:</strong></p>
    <ul style="color: #4a5568; font-size: 16px; padding-left: 20px;">
      <li>Review the NBT sample questions on the official website</li>
      <li>Get a good night's sleep before the test</li>
      <li>Eat a nutritious breakfast on the day</li>
    </ul>
    <p style="color: #4a5568; font-size: 16px;">Once you have your results, log in to SmartBridge FET and upload them to your profile under Student Opportunities → NBT Schedule.</p>
    <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Good luck — you've got this! 💪</p>
    <p style="color: #4a5568; font-size: 14px;">SmartBridge FET Team</p>
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
            to: [reg.student_email],
            subject: subject,
            html: bodyHtml,
            text: bodyText,
          }),
        });

        if (resendResponse.ok) {
          const emailResult = await resendResponse.json();

          // Update reminder_sent flag
          await supabase
            .from("nbt_registrations")
            .update({ 
              reminder_sent: true,
              reminder_sent_at: new Date().toISOString()
            })
            .eq("id", reg.id);

          results.push({ 
            email: reg.student_email, 
            test_date: reg.test_date,
            email_id: emailResult.id 
          });

          // Log in audit log
          await supabase
            .from("activity_log")
            .insert({
              event_type: "notification_sent",
              user_email: reg.student_email,
              description: `NBT reminder sent for test on ${reg.test_date}`,
              metadata: JSON.stringify({
                test_date: reg.test_date,
                registration_id: reg.id,
                days_until: daysUntil,
                email_id: emailResult.id
              })
            });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${reg.student_email}:`, errorText);
          results.push({ 
            email: reg.student_email, 
            test_date: reg.test_date,
            error: errorText 
          });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${reg.student_email}:`, emailError.message);
        results.push({ 
          email: reg.student_email, 
          test_date: reg.test_date,
          error: emailError.message 
        });
      }
    }

    return new Response(
      JSON.stringify({
        reminders_sent: results.filter((r: any) => r.email_id).length,
        total_due: toRemind.length,
        results
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending NBT reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});