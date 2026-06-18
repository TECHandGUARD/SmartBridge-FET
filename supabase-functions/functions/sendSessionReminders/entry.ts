import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Sends session reminder emails to students for upcoming confirmed bookings.
 * Called by two scheduled automations:
 *   1. Every day at 08:00 SAST  → 24-hour advance reminder
 *   2. Every hour               → 1-hour advance reminder
 *
 * Payload (optional): { window: "24h" | "1h" }  — if not provided, both windows are checked.
 */
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

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const { window: reminderWindow } = body;

    // Current time in SAST (UTC+2)
    const now = new Date();
    const sastNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const todayStr = sastNow.toISOString().split('T')[0];

    // Tomorrow's date string for 24h window
    const tomorrow = new Date(sastNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Fetch all confirmed bookings
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('tutor_bookings')
      .select('*')
      .eq('status', 'confirmed');

    if (bookingsError) {
      throw new Error("Failed to fetch bookings: " + bookingsError.message);
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ status: 'ok', sent: 0, message: 'No confirmed bookings found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentHour = sastNow.getUTCHours();
    let sent = 0;
    const results: any[] = [];

    for (const booking of bookings) {
      if (!booking.student_email || !booking.date) continue;

      const bookingDate = booking.date; // expected YYYY-MM-DD
      const bookingTime = booking.time || '00:00'; // expected HH:MM

      // Parse booking datetime in SAST
      const [bHour, bMinute] = bookingTime.split(':').map(Number);
      const bookingDatetime = new Date(`${bookingDate}T${bookingTime}:00+02:00`);
      const diffMs = bookingDatetime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const want24h = !reminderWindow || reminderWindow === '24h';
      const want1h  = !reminderWindow || reminderWindow === '1h';

      // 24h reminder: session is between 23h and 25h away
      const is24hWindow = diffHours >= 23 && diffHours <= 25;
      // 1h reminder: session is between 55min and 65min away
      const is1hWindow  = diffHours >= 0.9 && diffHours <= 1.1;

      const shouldSend24h = want24h && is24hWindow && !booking.reminder_24h_sent;
      const shouldSend1h  = want1h  && is1hWindow  && !booking.reminder_1h_sent;

      if (!shouldSend24h && !shouldSend1h) continue;

      const subjectLine = shouldSend1h
        ? `⏰ Session in 1 hour — ${booking.subject} with ${booking.tutor_name || 'your tutor'}`
        : `📅 Session reminder — ${booking.subject} tomorrow at ${bookingTime}`;

      const emailBody = `Hi ${booking.student_name || 'there'},

${shouldSend1h
  ? `Your tutoring session starts in about 1 hour!`
  : `You have a tutoring session tomorrow.`
}

📚 Subject: ${booking.subject}
👨‍🏫 Tutor: ${booking.tutor_name || 'Your tutor'}
📅 Date: ${bookingDate}
⏰ Time: ${bookingTime}
${booking.session_link ? `\n🔗 Join: ${booking.session_link}` : ''}

Make sure you're prepared — have your notes and questions ready.

Log in to view your session details:
https://smartbridgefet.co.za/bookings

Good luck! 🎓
— The SmartBridge FET Team`.trim();

      // Send email (logging for now, replace with actual email sending)
      console.log(`[SESSION REMINDER] To: ${booking.student_email}, Subject: ${subjectLine}`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: booking.student_email,
      //     subject: subjectLine,
      //     body: emailBody,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      // Mark reminder as sent so we don't double-send
      const updateData: any = {};
      if (shouldSend24h) updateData.reminder_24h_sent = true;
      if (shouldSend1h)  updateData.reminder_1h_sent  = true;
      updateData.updated_at = new Date().toISOString();

      await supabaseClient
        .from('tutor_bookings')
        .update(updateData)
        .eq('id', booking.id);

      sent++;
      results.push({ 
        student: booking.student_email, 
        type: shouldSend1h ? '1h' : '24h' 
      });
    }

    return new Response(
      JSON.stringify({ status: 'ok', sent, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});