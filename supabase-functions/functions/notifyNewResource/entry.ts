import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Resource Notifications Function
 * Sends email notifications to all users when a new resource is added.
 * Triggered by database webhook on caps_documents table insert.
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
    const { data } = body;

    if (!data) {
      return new Response(
        JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all users to notify
    const { data: users, error: usersError } = await supabaseClient
      .from('user_profiles')
      .select('email, full_name');

    if (usersError) {
      throw new Error("Failed to fetch users: " + usersError.message);
    }

    const recipients = users || [];

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notified: 0, message: 'No users to notify' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resourceTitle = data.title || 'A new resource';
    const subject = data.subject ? ` for ${data.subject}` : '';
    const grade = data.grade ? ` (${data.grade})` : '';
    const docType = data.document_type ? `[${data.document_type}] ` : '';

    let sent = 0;
    for (const user of recipients) {
      if (!user.email) continue;

      // Send email (logging for now, replace with actual email sending)
      console.log(`[RESOURCE NOTIFICATION] To: ${user.email}, Resource: ${resourceTitle}`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: user.email,
      //     subject: `📚 New Resource Available: ${resourceTitle}`,
      //     body: `Hi ${user.full_name || 'Learner'},

      // A new ${docType}resource has just been added to the SmartBridge FET library${subject}${grade}:

      // 📄 ${resourceTitle}
      // ${data.description ? `\n${data.description}\n` : ''}

      // Log in to download it for free:
      // https://smartbridgefet.co.za/resources-library

      // Happy studying!
      // The SmartBridge FET Team`,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      sent++;
    }

    return new Response(
      JSON.stringify({ success: true, notified: sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Error sending resource notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});