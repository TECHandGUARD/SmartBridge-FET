import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Payout Notifications Function
 * Sends email notifications to tutors when their payout status changes.
 * Triggered by database webhook on tutor_payouts table updates.
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
    const { event, data, old_data } = await req.json();

    // Only process update events
    if (event.type !== 'update') {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if status changed
    const statusChanged = old_data?.status !== data?.status;
    if (!statusChanged) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { tutor_email, tutor_name, amount, status, booking_reference } = data;

    const statusMessages: Record<string, string> = {
      paid: `Your payout of R${amount} has been successfully processed.`,
      failed: `Your payout of R${amount} failed. Please contact support.`,
      cancelled: `Your payout of R${amount} has been cancelled.`
    };

    const message = statusMessages[status] || `Your payout status has been updated to: ${status}`;

    // Send email (logging for now, replace with actual email sending)
    console.log(`[PAYOUT NOTIFICATION] To: ${tutor_email}, Status: ${status}`);

    // If you have a send-email function, uncomment this:
    // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    //   body: {
    //     to: tutor_email,
    //     subject: `Payout ${status === 'paid' ? 'Received' : 'Updated'} - Booking ${booking_reference}`,
    //     body: `
    // Hello ${tutor_name},

    // ${message}

    // Booking Reference: ${booking_reference}
    // Amount: R${amount}
    // Status: ${status.toUpperCase()}

    // If you have any questions, please contact our support team.

    // Best regards,
    // SmartBridge FET Team
    //     `,
    //     from_name: 'SmartBridge FET'
    //   }
    // });
    // if (emailError) console.error('Failed to send email:', emailError);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error sending payout notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});