import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get current day and time (UTC+2 for SAST)
    const now = new Date();
    const sast = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const todayName = DAYS[sast.getUTCDay()];
    const currentHour = sast.getUTCHours().toString().padStart(2, '0');
    const currentMinute = sast.getUTCMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;

    // Fetch all active reminders for today
    const reminders = await base44.asServiceRole.entities.StudyReminder.filter({
      day_of_week: todayName,
      is_active: true,
    });

    if (!reminders.length) {
      return Response.json({ status: 'ok', sent: 0, message: 'No reminders for today' });
    }

    // Filter reminders whose time matches current hour:minute (within same minute)
    const dueReminders = reminders.filter(r => r.time === currentTime);

    if (!dueReminders.length) {
      return Response.json({ status: 'ok', sent: 0, message: `No reminders due at ${currentTime}` });
    }

    let sent = 0;
    for (const reminder of dueReminders) {
      if (!reminder.student_email) continue;

      const subjectLine = `📚 Study Reminder: ${reminder.subject}`;
      const body = `
Hi there,

This is your study reminder for <strong>${reminder.subject}</strong> scheduled for <strong>${reminder.day_of_week} at ${reminder.time}</strong>.

Time to open your books and make progress! Head to EduConnect FET to access your resources, videos, and practice quizzes for ${reminder.subject}.

${reminder.note ? `<p><em>Your note: ${reminder.note}</em></p>` : ''}

Keep up the great work! 🎓

— The EduConnect FET Team
      `.trim();

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: reminder.student_email,
        subject: subjectLine,
        body,
      });

      sent++;
    }

    return Response.json({ status: 'ok', sent, day: todayName, time: currentTime });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});