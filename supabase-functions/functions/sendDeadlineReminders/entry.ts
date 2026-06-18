import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Deadline Reminder Function
 * Sends 7-day advance reminders for application deadlines.
 * Runs daily to check for deadlines exactly 7 days away.
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

    // Calculate the target date: 7 days from now (SAST)
    const now = new Date();
    const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const target = new Date(sast);
    target.setUTCDate(target.getUTCDate() + 7);
    const targetDateStr = target.toISOString().split('T')[0]; // YYYY-MM-DD

    // 1. Fetch all live ApplicationDeadlines that fall exactly 7 days from now
    const { data: deadlines, error: deadlinesError } = await supabaseClient
      .from('application_deadlines')
      .select('*')
      .eq('date', targetDateStr);

    if (deadlinesError) {
      throw new Error("Failed to fetch deadlines: " + deadlinesError.message);
    }

    if (!deadlines || deadlines.length === 0) {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          sent: 0, 
          date_checked: targetDateStr, 
          message: 'No deadlines in 7 days' 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Find all students who have a tracked university application
    const { data: activeApplications, error: appsError } = await supabaseClient
      .from('university_applications')
      .select('*');

    if (appsError) {
      throw new Error("Failed to fetch applications: " + appsError.message);
    }

    const activeStages = ['Saved', 'Started', 'Pending NBT'];
    const relevantApps = (activeApplications || []).filter((a: any) => 
      activeStages.includes(a.stage)
    );

    // Build a set of university names from today's deadlines
    const deadlineUniversities = deadlines.map((d: any) => (d.university || '').toLowerCase().trim());

    // Map: student_email -> list of deadline events to notify about
    const emailMap: Record<string, any[]> = {};

    for (const app of relevantApps) {
      if (!app.student_email) continue;

      const matchedDeadlines = deadlines.filter((d: any) => {
        const duName = (d.university || '').toLowerCase().trim();
        const appUniName = (app.university_name || '').toLowerCase().trim();

        // Match if university names overlap OR it's a bursary/NBT (affects all students)
        const universityMatch = duName && appUniName && (
          duName.includes(appUniName) || appUniName.includes(duName)
        );
        const broadCategory = d.category === 'NBT' || d.category === 'Bursary';

        return universityMatch || broadCategory;
      });

      if (!matchedDeadlines.length) continue;

      if (!emailMap[app.student_email]) emailMap[app.student_email] = [];
      for (const dl of matchedDeadlines) {
        const alreadyAdded = emailMap[app.student_email].some((x: any) => x.deadline.id === dl.id);
        if (!alreadyAdded) {
          emailMap[app.student_email].push({ deadline: dl, app });
        }
      }
    }

    // 3. Also notify students who have set a custom deadline on their own UniversityApplication
    const appsWithCustomDeadline = (activeApplications || []).filter(
      (a: any) => a.deadline === targetDateStr && activeStages.includes(a.stage) && a.student_email
    );
    for (const app of appsWithCustomDeadline) {
      if (!emailMap[app.student_email]) emailMap[app.student_email] = [];
      const syntheticDeadline = {
        id: `custom_${app.id}`,
        event_name: `${app.university_name} Application Deadline`,
        university: app.university_name,
        date: app.deadline,
        description: app.course ? `Course: ${app.course}` : '',
        link: app.application_link || '',
        category: 'University Application',
      };
      const alreadyAdded = emailMap[app.student_email].some((x: any) => x.deadline.id === syntheticDeadline.id);
      if (!alreadyAdded) {
        emailMap[app.student_email].push({ deadline: syntheticDeadline, app });
      }
    }

    // 4. Send one consolidated email per student
    let sent = 0;
    for (const [studentEmail, entries] of Object.entries(emailMap)) {
      if (!entries.length) continue;

      const deadlineItems = entries.map(({ deadline }: any) => {
        const linkText = deadline.link 
          ? `<br><a href="${deadline.link}" style="color:#1a7a45;">Apply / More Info →</a>` 
          : '';
        return `
          <div style="margin-bottom:12px;padding:12px;background:#f4f9f6;border-left:4px solid #1a7a45;border-radius:6px;">
            <strong>${deadline.event_name}</strong><br>
            <span style="color:#555;">${deadline.university ? `${deadline.university} · ` : ''}${deadline.category}</span><br>
            <span style="color:#c0392b;font-weight:600;">📅 Due: ${new Date(deadline.date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            ${deadline.description ? `<br><span style="color:#666;font-size:13px;">${deadline.description}</span>` : ''}
            ${linkText}
          </div>`;
      }).join('');

      const body = `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;color:#222;">
          <div style="background:linear-gradient(135deg,#1a7a45,#0f4d2a);padding:28px 24px;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:22px;">⏰ Application Deadline Reminder</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">You have upcoming deadlines in 7 days</p>
          </div>
          <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p style="margin-top:0;">Hi there,</p>
            <p>This is a reminder that the following application deadline${entries.length > 1 ? 's are' : ' is'} <strong>7 days away</strong>. Don't miss out!</p>
            ${deadlineItems}
            <p style="margin-top:20px;">Log in to <a href="https://smartbridgefet.co.za/opportunities" style="color:#1a7a45;font-weight:600;">SmartBridge FET</a> to update your application status and access resources to help you prepare.</p>
            <p style="color:#888;font-size:13px;margin-bottom:0;">— The SmartBridge FET Team<br><em>Tech &amp; GUARD Pty Ltd</em></p>
          </div>
        </div>
      `.trim();

      // Send email (logging for now, replace with actual email sending)
      console.log(`[DEADLINE REMINDER] To: ${studentEmail}, Subject: ⏰ Deadline in 7 days`);

      // If you have a send-email function, uncomment this:
      // const { error: emailError } = await supabaseClient.functions.invoke('send-email', {
      //   body: {
      //     to: studentEmail,
      //     subject: `⏰ Deadline in 7 days: ${entries[0].deadline.event_name}${entries.length > 1 ? ` + ${entries.length - 1} more` : ''}`,
      //     body: body,
      //     from_name: 'SmartBridge FET'
      //   }
      // });
      // if (emailError) console.error('Failed to send email:', emailError);

      sent++;
    }

    return new Response(
      JSON.stringify({
        status: 'ok',
        sent,
        date_checked: targetDateStr,
        deadlines_found: deadlines.length,
        students_notified: sent,
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