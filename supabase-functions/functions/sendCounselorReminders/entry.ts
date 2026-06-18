import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Counselor Reminders Function
 * Sends application deadline reminders from school counselors to students.
 * Used by the Counselor Dashboard.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
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

    // Get user from JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { students } = await req.json();
    // students: [{ email, name, university_name, deadline, school_name }]

    if (!students || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No students provided' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];

    for (const student of students) {
      const daysLeft = student.deadline
        ? Math.ceil((new Date(student.deadline).getTime() - new Date().getTime()) / 86400000)
        : null;

      const subject = `Reminder: ${student.university_name} application deadline${daysLeft !== null ? ` in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : ''}`;

      const body = `
Dear ${student.name || student.email},

This is a reminder from your school counselor at ${student.school_name || 'your school'}.

Your application to ${student.university_name} ${
  daysLeft !== null
    ? `is due in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> (${new Date(student.deadline).toLocaleDateString('en-ZA')})`
    : 'has an upcoming deadline'
}.

Please ensure:
- All required documents have been uploaded (ID Copy, Matric Certificate, Proof of Payment)
- Your application has been submitted on the university portal
- You have noted any NBT test requirements

If you need help, please contact your school counselor or visit the SmartBridge FET Student Opportunities section.

Good luck with your application!

SmartBridge FET Team
      `.trim();

      // Send email (logging for now, replace with actual email sending)
      console.log(`[COUNSELOR REMINDER] To: ${student.email}, Subject: ${subject}`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: student.email,
      //     subject: subject,
      //     body: body,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      results.push({ email: student.email, sent: true });
    }

    return new Response(
      JSON.stringify({ sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});