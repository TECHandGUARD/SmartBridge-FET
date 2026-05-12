import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data, old_data } = body;

    // Only fire when status changes TO "confirmed"
    if (!data || data.status !== 'confirmed' || old_data?.status === 'confirmed') {
      return Response.json({ skipped: true });
    }

    const studentEmail = data.student_email;
    if (!studentEmail) return Response.json({ skipped: 'no student email' });

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: studentEmail,
      subject: `✅ Booking Confirmed — ${data.subject} with ${data.tutor_name || 'your tutor'}`,
      body: `Hi there,\n\nGreat news! Your tutoring session has been confirmed.\n\n📚 Subject: ${data.subject}\n👨‍🏫 Tutor: ${data.tutor_name || 'Your tutor'}\n📅 Date: ${data.date}\n⏰ Time: ${data.time}\n⏱ Duration: ${data.duration_hours || 1} hour(s)\n${data.session_link ? `\n🔗 Join link: ${data.session_link}\n` : ''}\n${data.message ? `\nNote from tutor: "${data.message}"\n` : ''}\nLog in to manage your bookings:\nhttps://educonnectfet.base44.app/bookings\n\nGood luck with your studies!\nThe EduConnect FET Team`,
    });

    return Response.json({ success: true, notified: studentEmail });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});