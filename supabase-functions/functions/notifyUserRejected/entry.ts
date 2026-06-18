import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Reject Account Function
 * Sends rejection email to users whose account verification failed.
 * Used by Admin Dashboard when rejecting tutor applications.
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

    // Parse request body
    const { email, full_name, reason } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = full_name || 'there';
    const origin = req.headers.get('origin') || 
                  req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                  'https://smartbridgefet.co.za';

    const reasonSection = reason
      ? `Reason:\n${reason}`
      : 'Our team was unable to verify the information provided during registration.';

    const body = [
      `Hi ${name},`,
      ``,
      `Thank you for registering on SmartBridge FET.`,
      ``,
      `After reviewing your application, we were unfortunately unable to approve your account at this time.`,
      ``,
      reasonSection,
      ``,
      `What you can do next:`,
      `  • Review the reason above and correct any issues`,
      `  • Re-register with accurate information: ${origin}`,
      `  • Contact us if you believe this was a mistake`,
      ``,
      `We apologise for any inconvenience and hope to welcome you to SmartBridge FET soon.`,
      ``,
      `— SmartBridge FET`,
      `   Tech & GUARD Pty Ltd`,
    ].join('\n');

    // Send email (logging for now, replace with actual email sending)
    console.log(`[REJECT ACCOUNT] To: ${email}, Subject: ❌ Account Application Update`);

    // If you have a send-email function, uncomment this:
    // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    //   body: {
    //     to: email,
    //     subject: '❌ SmartBridge FET — Account Application Update',
    //     body: body,
    //     from_name: 'SmartBridge FET'
    //   }
    // });
    // if (emailError) console.error('Failed to send email:', emailError);

    return new Response(
      JSON.stringify({ success: true, sent_to: email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});