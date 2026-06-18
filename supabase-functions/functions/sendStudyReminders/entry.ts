import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get current day and time (UTC+2 for SAST)
    const now = new Date();
    const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayName = DAYS[sast.getUTCDay()];
    const currentHour = sast.getUTCHours().toString().padStart(2, '0');
    const currentMinute = sast.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch all active reminders for today
    const { data: reminders, error: remindersError } = await supabaseClient
      .from('study_reminders')
      .select('*')
      .eq('day_of_week', todayName)
      .eq('is_active', true);

    if (remindersError) {
      throw new Error("Failed to fetch reminders: " + remindersError.message);
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ status: 'ok', sent: 0, message: 'No reminders for today' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter reminders whose time matches current hour:minute
    const dueReminders = reminders.filter((r: any) => r.time === currentTime);

    if (!dueReminders.length) {
      return new Response(
        JSON.stringify({ status: 'ok', sent: 0, message: `No reminders due at ${currentTime}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    for (const reminder of dueReminders) {
      if (!reminder.student_email) continue;

      const subjectLine = `📚 Study Reminder: ${reminder.subject}`;
      const body = `
Hi there,

This is your study reminder for <strong>${reminder.subject}</strong> scheduled for <strong>${reminder.day_of_week} at ${reminder.time}</strong>.

Time to open your books and make progress! Head to SmartBridge FET to access your resources, videos, and practice quizzes for ${reminder.subject}.

${reminder.note ? `<p><em>Your note: ${reminder.note}</em></p>` : ''}

Keep up the great work! 🎓

— The SmartBridge FET Team
      `.trim();

      // Send email using Supabase Edge Function (you need a send-email function)
      // Option 1: Call a send-email Edge Function
      // Option 2: Use a third-party email service (Resend, SendGrid, etc.)
      
      // For now, we'll log the email and track it
      console.log(`[STUDY REMINDER] To: ${reminder.student_email}, Subject: ${subjectLine}`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: reminder.student_email,
      //     subject: subjectLine,
      //     body: body,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      sent++;
    }

    return new Response(
      JSON.stringify({ 
        status: 'ok', 
        sent, 
        day: todayName, 
        time: currentTime,
        total_due: dueReminders.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});