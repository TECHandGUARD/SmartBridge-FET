import { emailFetch } from "../../shared/email.ts";
import { serverConnection, emailSettings, appUrl } from "../../shared/config.ts";
import { withHttp, authorize } from "../../shared/http.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Resend Email API configuration

serve(withHttp(async (req) => {
  try {
    const connection = serverConnection();
    const supabase = createClient(connection.url, connection.key, {auth:{persistSession:false, autoRefreshToken:false}});
    const user = await authorize(req, supabase, 'job');
    const { apiKey: RESEND_API_KEY, from: FROM_EMAIL } = emailSettings();
    const APP_URL = appUrl().replace(/\/$/, '');
    const now = new Date();
    const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const target = new Date(sast);
    target.setUTCDate(target.getUTCDate() + 7);
    const targetDateStr = target.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Fetch all live ApplicationDeadlines that fall exactly 7 days from now
    const { data: deadlines, error: deadlinesError } = await supabase
      .from("application_deadlines")
      .select("*")
      .eq("date", targetDateStr)
      .eq("is_active", true);

    if (deadlinesError) {
      return new Response(
        JSON.stringify({ error: deadlinesError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!deadlines || deadlines.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ok",
          sent: 0,
          date_checked: targetDateStr,
          message: "No deadlines in 7 days"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Find all students who have a tracked university application
    const { data: allApplications, error: appsError } = await supabase
      .from("university_applications")
      .select("*")
      .in("stage", ["Saved", "Started", "Pending NBT"]);

    if (appsError) {
      return new Response(
        JSON.stringify({ error: appsError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const relevantApps = allApplications || [];

    // Build a set of university names from today's deadlines (lowercase for fuzzy match)
    const deadlineUniversities = deadlines.map((d: any) => (d.university || "").toLowerCase().trim());
    const deadlineCategories = deadlines.map((d: any) => d.category);

    // Map: student_email -> list of deadline events to notify about
    const emailMap: Record<string, any[]> = {};

    for (const app of relevantApps) {
      if (!app.student_email) continue;

      const matchedDeadlines = deadlines.filter((d: any) => {
        const duName = (d.university || "").toLowerCase().trim();
        const appUniName = (app.university_name || "").toLowerCase().trim();

        // Match if university names overlap OR it's a bursary/NBT (affects all students)
        const universityMatch = duName && appUniName && (
          duName.includes(appUniName) || appUniName.includes(duName)
        );
        const broadCategory = d.category === "NBT" || d.category === "Bursary";

        return universityMatch || broadCategory;
      });

      if (!matchedDeadlines.length) continue;

      if (!emailMap[app.student_email]) emailMap[app.student_email] = [];
      for (const dl of matchedDeadlines) {
        const alreadyAdded = emailMap[app.student_email].some((x: any) => x.deadline.id === dl.id);
        if (!alreadyAdded) emailMap[app.student_email].push({ deadline: dl, app });
      }
    }

    // 3. Also notify students who have set a custom deadline on their own UniversityApplication
    const appsWithCustomDeadline = allApplications?.filter(
      (a: any) => a.deadline === targetDateStr && a.student_email
    ) || [];

    for (const app of appsWithCustomDeadline) {
      if (!emailMap[app.student_email]) emailMap[app.student_email] = [];
      const syntheticDeadline = {
        id: `custom_${app.id}`,
        event_name: `${app.university_name} Application Deadline`,
        university: app.university_name,
        date: app.deadline,
        description: app.course ? `Course: ${app.course}` : "",
        link: app.application_link || "",
        category: "University Application",
      };
      const alreadyAdded = emailMap[app.student_email].some((x: any) => x.deadline.id === syntheticDeadline.id);
      if (!alreadyAdded) emailMap[app.student_email].push({ deadline: syntheticDeadline, app });
    }

    // 4. Send one consolidated email per student
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not configured. Emails not sent.");
      return new Response(
        JSON.stringify({
          status: "ok",
          sent: 0,
          date_checked: targetDateStr,
          deadlines_found: deadlines.length,
          error: "RESEND_API_KEY not configured"
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    for (const [studentEmail, entries] of Object.entries(emailMap)) {
      if (!entries.length) continue;

      const deadlineItems = entries.map(({ deadline }: any) => {
        const linkText = deadline.link ? `<br><a href="${deadline.link}" style="color:#1a7a45;">Apply / More Info →</a>` : "";
        return `
          <div style="margin-bottom:12px;padding:12px;background:#f4f9f6;border-left:4px solid #1a7a45;border-radius:6px;">
            <strong>${deadline.event_name}</strong><br>
            <span style="color:#555;">${deadline.university ? `${deadline.university} · ` : ""}${deadline.category}</span><br>
            <span style="color:#c0392b;font-weight:600;">📅 Due: ${new Date(deadline.date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
            ${deadline.description ? `<br><span style="color:#666;font-size:13px;">${deadline.description}</span>` : ""}
            ${linkText}
          </div>`;
      }).join("");

      const bodyText = `⏰ Application Deadline Reminder

Hi there,

This is a reminder that the following application deadline${entries.length > 1 ? "s are" : " is"} 7 days away. Don't miss out!

${entries.map(({ deadline }: any) =>
  `- ${deadline.event_name}\n  ${deadline.university ? `${deadline.university} · ` : ""}${deadline.category}\n  📅 Due: ${new Date(deadline.date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}\n  ${deadline.description || ""}`
).join("\n\n")}

Log in to ${APP_URL} to update your application status and access resources to help you prepare.

— The SmartBridge FET Team
Tech & GUARD Pty Ltd`;

      const bodyHtml = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#222;">
          <div style="background:linear-gradient(135deg,#1a7a45,#0f4d2a);padding:28px 24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">⏰ Application Deadline Reminder</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">You have upcoming deadlines in 7 days</p>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin-top:0;">Hi there,</p>
            <p>This is a reminder that the following application deadline${entries.length > 1 ? "s are" : " is"} <strong>7 days away</strong>. Don't miss out!</p>
            ${deadlineItems}
            <p style="margin-top:20px;">Log in to <a href="${APP_URL}/opportunities" style="color:#1a7a45;font-weight:600;">SmartBridge FET</a> to update your application status and access resources to help you prepare.</p>
            <p style="color:#888;font-size:13px;margin-bottom:0;">— The SmartBridge FET Team<br><em>Tech &amp; GUARD Pty Ltd</em></p>
          </div>
        </div>
      `;

      try {
        const resendResponse = await emailFetch({
          method: "POST",
          headers: {
            "Authorization": `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [studentEmail],
            subject: `⏰ Deadline in 7 days: ${entries[0].deadline.event_name}${entries.length > 1 ? ` + ${entries.length - 1} more` : ""}`,
            html: bodyHtml,
            text: bodyText,
          }),
        }, supabase);

        if (resendResponse.ok) {
          const emailResult = await resendResponse.json();
          sent++;

          // Log in audit log
          await supabase
            .from("activity_log")
            .insert({
              event_type: "notification_sent",
              user_email: studentEmail,
              description: `Deadline reminder sent for ${entries.length} deadlines`,
              metadata: {
                deadline_count: entries.length,
                date_checked: targetDateStr,
                email_id: emailResult.id
              }
            });
        } else {
          const errorText = await resendResponse.text();
          console.error(`Failed to send email to ${studentEmail}:`, errorText);
        }
      } catch (emailError) {
        console.error(`Error sending email to ${studentEmail}:`, emailError.message);
      }
    }

    return new Response(
      JSON.stringify({
        status: "ok",
        sent,
        date_checked: targetDateStr,
        deadlines_found: deadlines.length,
        students_notified: sent,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error sending deadline reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { "Content-Type": "application/json" } }
    );
  }
}, 'send-deadline-reminders'));
