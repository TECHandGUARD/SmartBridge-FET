import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Resend Email API configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@yourdomain.com";
const APP_URL = Deno.env.get("APP_URL") || "https://smartbridgefet.com";

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

    // Check if user is admin or counselor
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || (userData.role !== "admin" && userData.role !== "counselor")) {
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin or Counselor access required" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const { students } = await req.json();
    // students: [{ email, name, university_name, deadline, school_name }]

    if (!students || !Array.isArray(students) || students.length === 0) {
      return new Response(
        JSON.stringify({ error: "No students provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Email not sent.");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "RESEND_API_KEY not configured",
          results: students.map((s: any) => ({ email: s.email, sent: false, error: "RESEND_API_KEY not configured" }))
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const results = [];

    for (const student of students) {
      try {
        const daysLeft = student.deadline
          ? Math.ceil((new Date(student.deadline).getTime() - new Date().getTime()) / 86400000)
          : null;

        const subject = `Reminder: ${student.university_name} application deadline${daysLeft !== null ? ` in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}` : ""}`;

        const bodyText = `Dear ${student.name || student.email},

This is a reminder from your school counselor at ${student.school_name || "your school"}.

Your application to ${student.university_name} ${
          daysLeft !== null
            ? `is due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""} (${new Date(student.deadline).toLocaleDateString("en-ZA")})`
            : "has an upcoming deadline"
        }.

Please ensure:
- All required documents have been uploaded (ID Copy, Matric Certificate, Proof of Payment)
- Your application has been submitted on the university portal
- You have noted any NBT test requirements

If you need help, please contact your school counselor or visit the SmartBridge FET Student Opportunities section.

Good luck with your application!

SmartBridge FET Team`;

        const bodyHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px;">
  <h2 style="color: #2d3748; border-bottom: 3px solid #4a5568; padding-bottom: 10px;">📅 Application Deadline Reminder</h2>
  <p style="color: #4a5568; font-size: 16px;">Dear ${student.name || student.email},</p>
  <p style="color: #4a5568; font-size: 16px;">This is a reminder from your school counselor at ${student.school_name || "your school"}.</p>
  <div style="background-color: #ffffff; padding: 15px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #d69e2e;">
    <p style="color: #4a5568; font-size: 16px; margin: 0;">
      Your application to <strong>${student.university_name}</strong> ${
          daysLeft !== null
            ? `is due in <strong style="color: #e53e3e;">${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong> (${new Date(student.deadline).toLocaleDateString("en-ZA")})`
            : "has an upcoming deadline"
        }.
    </p>
  </div>
  <p style="color: #4a5568; font-size: 16px;"><strong>Please ensure:</strong></p>
  <ul style="color: #4a5568; font-size: 16px; padding-left: 20px;">
    <li>All required documents have been uploaded (ID Copy, Matric Certificate, Proof of Payment)</li>
    <li>Your application has been submitted on the university portal</li>
    <li>You have noted any NBT test requirements</li>
  </ul>
  <p style="color: #4a5568; font-size: 16px;">If you need help, please contact your school counselor or visit the SmartBridge FET Student Opportunities section.</p>
  <p style="color: #4a5568; font-size: 14px; margin-top: 20px;">Good luck with your application!</p>
  <p style="color: #4a5568; font-size: 14px;">SmartBridge FET Team</p>
  <hr style="border: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="color: #a0aec0; font-size: 12px; text-align: center;">
    This is an automated notification. Please do not reply to this email.
  </p>
</div>`;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [student.email],
            subject: subject,
            html: bodyHtml,
            text: bodyText,
          }),
        });

        if (resendResponse.ok) {
          const emailResult = await resendResponse.json();
          results.push({ 
            email: student.email, 
            sent: true,
            email_id: emailResult.id 
          });

          // Log in audit log
          await supabase
            .from("activity_log")
            .insert({
              event_type: "notification_sent",
              user_email: student.email,
              description: `Counselor reminder sent for ${student.university_name}`,
              metadata: JSON.stringify({ 
                university: student.university_name,
                deadline: student.deadline,
                email_id: emailResult.id 
              })
            });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${student.email}:`, errorText);
          results.push({ 
            email: student.email, 
            sent: false, 
            error: errorText 
          });
        }
      } catch (emailError) {
        console.error(`Error sending email to ${student.email}:`, emailError.message);
        results.push({ 
          email: student.email, 
          sent: false, 
          error: emailError.message 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        sent: results.filter((r: any) => r.sent).length, 
        total: results.length,
        results 
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending counselor reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});