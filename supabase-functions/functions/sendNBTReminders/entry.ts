import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * NBT Reminder Function
 * Sends reminders to students about upcoming NBT tests.
 * Runs daily to check for tests within 7 days.
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

    // Fetch all NBT registrations with status 'registered'
    const { data: registrations, error: registrationsError } = await supabaseClient
      .from('nbt_registrations')
      .select('*')
      .eq('status', 'registered');

    if (registrationsError) {
      throw new Error("Failed to fetch NBT registrations: " + registrationsError.message);
    }

    if (!registrations || registrations.length === 0) {
      return new Response(
        JSON.stringify({ status: 'ok', reminders_sent: 0, message: 'No NBT registrations found' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const toRemind = registrations.filter((r: any) => {
      if (r.reminder_sent) return false;
      const testDate = new Date(r.test_date);
      const daysUntil = Math.ceil((testDate.getTime() - now.getTime()) / 86400000);
      return daysUntil >= 0 && daysUntil <= 7;
    });

    const results: any[] = [];

    for (const reg of toRemind) {
      const testDate = new Date(reg.test_date);
      const daysUntil = Math.ceil((testDate.getTime() - now.getTime()) / 86400000);
      const formattedDate = testDate.toLocaleDateString('en-ZA', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const subject = `📝 NBT Reminder: Your test is ${daysUntil === 0 ? 'TODAY' : `in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`}!`;

      const body = `
Dear ${reg.student_name || reg.student_email},

This is a reminder about your upcoming <strong>National Benchmark Test (NBT)</strong>.

<strong>📅 Date:</strong> ${formattedDate}
<strong>⏰ Venue:</strong> ${reg.venue}, ${reg.city}
<strong>📋 Tests:</strong> ${(reg.tests_registered || []).join(', ') || 'As registered'}

<strong>What to bring on the day:</strong>
<ul>
  <li>Your South African ID or Passport</li>
  <li>Your NBT registration confirmation</li>
  <li>Pens and pencils (no calculators allowed)</li>
  <li>Arrive at least 30 minutes early</li>
</ul>

<strong>Quick Preparation Tips:</strong>
<ul>
  <li>Review the NBT sample questions on the official website</li>
  <li>Get a good night's sleep before the test</li>
  <li>Eat a nutritious breakfast on the day</li>
</ul>

Once you have your results, log in to SmartBridge FET and upload them to your profile under Student Opportunities → NBT Schedule.

Good luck — you've got this! 💪

SmartBridge FET Team
      `.trim();

      // Send email (logging for now, replace with actual email sending)
      console.log(`[NBT REMINDER] To: ${reg.student_email}, Subject: ${subject}`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: reg.student_email,
      //     subject: subject,
      //     body: body,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      // Mark reminder as sent
      await supabaseClient
        .from('nbt_registrations')
        .update({ 
          reminder_sent: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', reg.id);

      results.push({ 
        email: reg.student_email, 
        test_date: reg.test_date 
      });
    }

    return new Response(
      JSON.stringify({ 
        reminders_sent: results.length, 
        results,
        status: 'ok'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});