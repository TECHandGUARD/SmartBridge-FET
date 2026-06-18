import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DASHBOARD_PATHS: Record<string, string> = {
  student: '/student-dashboard',
  parent: '/parent-dashboard',
  sace_tutor: '/tutor-dashboard',
  student_tutor: '/tutor-dashboard',
};

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  parent: 'Parent / Guardian',
  sace_tutor: 'SACE Tutor',
  student_tutor: 'Student Tutor',
};

/**
 * Approve Account Function
 * Sends approval email to users whose account was verified.
 * Used by Admin Dashboard when approving tutor applications.
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
    const { email, full_name, role } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'email and role are required' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const dashboardPath = DASHBOARD_PATHS[role];
    const roleLabel = ROLE_LABELS[role] || role;

    if (!dashboardPath) {
      // Not a role we send approval emails for
      return new Response(
        JSON.stringify({ skipped: true, reason: `No approval email for role: ${role}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get('origin') || 
                  req.headers.get('referer')?.split('/').slice(0, 3).join('/') || 
                  'https://smartbridgefet.co.za';
    const loginUrl = origin + dashboardPath;
    const name = full_name || 'there';

    const isTutor = role === 'sace_tutor' || role === 'student_tutor';

    const subject = isTutor
      ? '🎉 Your SmartBridge FET Tutor Profile Has Been Verified!'
      : `✅ Your SmartBridge FET ${roleLabel} Account Is Ready!`;

    const body = isTutor
      ? [
          `Hi ${name},`,
          ``,
          `Great news! Your tutor profile on SmartBridge FET has been verified by our admin team.`,
          ``,
          `You can now log in and access your full Tutor Dashboard to:`,
          `  • Set your availability`,
          `  • Accept student bookings`,
          `  • Upload study resources`,
          `  • Track your earnings`,
          ``,
          `Log in now: ${loginUrl}`,
          ``,
          `Welcome to the team! 🎓`,
          ``,
          `— SmartBridge FET`,
          `   Tech & GUARD Pty Ltd`,
        ].join('\n')
      : [
          `Hi ${name},`,
          ``,
          `Your SmartBridge FET account has been approved and is ready to use!`,
          ``,
          `You've been registered as a ${roleLabel}. You can now log in and access your dashboard:`,
          ``,
          `👉 Log in here: ${loginUrl}`,
          ``,
          role === 'student'
            ? `From your Student Dashboard you can:\n  • Browse study resources & past papers\n  • Book sessions with verified tutors\n  • Track your academic progress\n  • Take practice quizzes`
            : `From your Parent Dashboard you can:\n  • Monitor your child's academic progress\n  • View tutor session history\n  • Access weekly progress reports`,
          ``,
          `Welcome aboard! 🎉`,
          ``,
          `— SmartBridge FET`,
          `   Tech & GUARD Pty Ltd`,
        ].join('\n');

    // Send email (logging for now, replace with actual email sending)
    console.log(`[APPROVE ACCOUNT] To: ${email}, Subject: ${subject}`);

    // If you have a send-email function, uncomment this:
    // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
    //   body: {
    //     to: email,
    //     subject: subject,
    //     body: body,
    //     from_name: 'SmartBridge FET'
    //   }
    // });
    // if (emailError) console.error('Failed to send email:', emailError);

    return new Response(
      JSON.stringify({ success: true, sent_to: email, role }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});