import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Booking Confirmation Function
 * Sends email notification to student when a booking is confirmed.
 * Triggered by database webhook on tutor_bookings table update.
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

    // Parse webhook payload
    const body = await req.json();
    const { data, old_data } = body;

    // Only fire when status changes TO "confirmed"
    if (!data || data.status !== 'confirmed' || old_data?.status === 'confirmed') {
      return new Response(
        JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const studentEmail = data.student_email;
    if (!studentEmail) {
      return new Response(
        JSON.stringify({ skipped: 'no student email' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email (logging for now, replace with actual email sending)
    console.log(`[BOOKING CONFIRMATION] To: ${studentEmail}, Subject: ✅ Booking Confirmed`);

    // If you have a send-email function, uncomment this:
    // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    //   body: {
    //     to: studentEmail,
    //     subject: `✅ Booking Confirmed — ${data.subject} with ${data.tutor_name || 'your tutor'}`,
    //     body: `Hi there,

    // Great news! Your tutoring session has been confirmed.

    // 📚 Subject: ${data.subject}
    // 👨‍🏫 Tutor: ${data.tutor_name || 'Your tutor'}
    // 📅 Date: ${data.date}
    // ⏰ Time: ${data.time}
    // ⏱ Duration: ${data.duration_hours || 1} hour(s)
    // ${data.session_link ? `\n🔗 Join link: ${data.session_link}\n` : ''}
    // ${data.message ? `\nNote from tutor: "${data.message}"\n` : ''}

    // Log in to manage your bookings:
    // https://smartbridgefet.co.za/bookings

    // Good luck with your studies!
    // The SmartBridge FET Team`,
    //     from_name: 'SmartBridge FET'
    //   }
    // });
    // if (emailError) console.error('Failed to send email:', emailError);

    return new Response(
      JSON.stringify({ success: true, notified: studentEmail }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Booking confirmation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});