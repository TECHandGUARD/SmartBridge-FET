import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend Email API configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@yourdomain.com";
const APP_URL = Deno.env.get("APP_URL") || "https://smartbridgefet.com";

const DASHBOARD_PATHS: Record<string, string> = {
  student: "/student-dashboard",
  parent: "/parent-dashboard",
  sace_tutor: "/tutor-dashboard",
  student_tutor: "/tutor-dashboard",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  parent: "Parent / Guardian",
  sace_tutor: "SACE Tutor",
  student_tutor: "Student Tutor",
};

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("DB_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, full_name, role } = await req.json();

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: "email and role are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const dashboardPath = DASHBOARD_PATHS[role];
    const roleLabel = ROLE_LABELS[role] || role;

    if (!dashboardPath) {
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: `No approval email for role: ${role}` 
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const loginUrl = `${APP_URL}${dashboardPath}`;
    const name = full_name || "there";
    const isTutor = role === "sace_tutor" || role === "student_tutor";

    const subject = isTutor
      ? `🎉 Your SmartBridge FET Tutor Profile Has Been Verified!`
      : `✅ Your SmartBridge FET ${roleLabel} Account Is Ready!`;

    const bodyText = isTutor
      ? `Hi ${name},\n\nGreat news! Your tutor profile on SmartBridge FET has been verified by our admin team.\n\nYou can now log in and access your full Tutor Dashboard to:\n  • Set your availability\n  • Accept student bookings\n  • Upload study resources\n  • Track your earnings\n\nLog in now: ${loginUrl}\n\nWelcome to the team! 🎓\n\n— SmartBridge FET\n   Tech & GUARD Pty Ltd`
      : `Hi ${name},\n\nYour SmartBridge FET account has been approved and is ready to use!\n\nYou've been registered as a ${roleLabel}. You can now log in and access your dashboard:\n\n👉 Log in here: ${loginUrl}\n\n${role === "student" ? "From your Student Dashboard you can:\n  • Browse study resources & past papers\n  • Book sessions with verified tutors\n  • Track your academic progress\n  • Take practice quizzes" : "From your Parent Dashboard you can:\n  • Monitor your child's academic progress\n  • View tutor session history\n  • Access weekly progress reports"}\n\nWelcome aboard! 🎉\n\n— SmartBridge FET\n   Tech & GUARD Pty Ltd`;

    const bodyHtml = isTutor
      ? `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">🎉 Tutor Profile Verified!</h2>
  <p style="color: #4a5568; font-size: 16px;">Hi ${name},</p>
  <p style="color: #4a5568; font-size: 16px;">Great news! Your tutor profile on SmartBridge FET has been <strong style="color: #38a169;">verified</strong> by our admin team.</p>
  <p style="color: #4a5568; font-size: 16px;">You can now log in and access your full Tutor Dashboard to:</p>
  <ul style="color: #4a5568; font-size: 16px; padding-left: 20px;">
    <li>Set your availability</li>
    <li>Accept student bookings</li>
    <li>Upload study resources</li>
    <li>Track your earnings</li>
  </ul>
  <p style="color: #4a5568; font-size: 16px;">
    <a href="${loginUrl}" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
      Log in Now
    </a>
  </p>
  <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Welcome to the team! 🎓</p>
  <p style="color: #4a5568; font-size: 14px;">— SmartBridge FET<br>Tech & GUARD Pty Ltd</p>
</div>`
      : `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">✅ Account Approved!</h2>
  <p style="color: #4a5568; font-size: 16px;">Hi ${name},</p>
  <p style="color: #4a5568; font-size: 16px;">Your SmartBridge FET account has been <strong style="color: #38a169;">approved</strong> and is ready to use!</p>
  <p style="color: #4a5568; font-size: 16px;">You've been registered as a <strong>${roleLabel}</strong>. You can now log in and access your dashboard:</p>
  <p style="color: #4a5568; font-size: 16px;">
    <a href="${loginUrl}" style="display: inline-block; background-color: #4a5568; color: #ffffff; padding: 10px 20px; border-radius: 5px; text-decoration: none; margin: 10px 0;">
      Log in Now
    </a>
  </p>
  ${role === "student" ? `
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="color: #4a5568; font-size: 14px;"><strong>From your Student Dashboard you can:</strong></p>
    <ul style="color: #4a5568; font-size: 14px; padding-left: 20px;">
      <li>Browse study resources & past papers</li>
      <li>Book sessions with verified tutors</li>
      <li>Track your academic progress</li>
      <li>Take practice quizzes</li>
    </ul>
  </div>` : `
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <p style="color: #4a5568; font-size: 14px;"><strong>From your Parent Dashboard you can:</strong></p>
    <ul style="color: #4a5568; font-size: 14px; padding-left: 20px;">
      <li>Monitor your child's academic progress</li>
      <li>View tutor session history</li>
      <li>Access weekly progress reports</li>
    </ul>
  </div>`}
  <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Welcome aboard! 🎉</p>
  <p style="color: #4a5568; font-size: 14px;">— SmartBridge FET<br>Tech & GUARD Pty Ltd</p>
</div>`;

    // Send email using Resend API
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY not configured",
          sent_to: email 
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [email],
        subject: subject,
        html: bodyHtml,
        text: bodyText,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailResult = await resendResponse.json();

    // Log the notification in audit log
    await supabase
      .from("activity_log")
      .insert({
        event_type: "notification_sent",
        user_email: email,
        description: `User approval notification sent for ${role}`,
        metadata: JSON.stringify({ 
          role,
          email_id: emailResult.id 
        })
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_to: email, 
        role,
        email_id: emailResult.id
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending user approval notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});