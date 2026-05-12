import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data } = body;

    if (!data) return Response.json({ skipped: true });

    // Fetch all users to notify
    const users = await base44.asServiceRole.entities.User.list();
    const recipients = users.filter(u => u.email);

    const resourceTitle = data.title || 'A new resource';
    const subject = data.subject ? ` for ${data.subject}` : '';
    const grade = data.grade ? ` (${data.grade})` : '';
    const docType = data.document_type ? `[${data.document_type}] ` : '';

    let sent = 0;
    for (const user of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject: `📚 New Resource Available: ${resourceTitle}`,
        body: `Hi ${user.full_name || 'Learner'},\n\nA new ${docType}resource has just been added to the EduConnect FET library${subject}${grade}:\n\n📄 ${resourceTitle}\n${data.description ? `\n${data.description}\n` : ''}\nLog in to download it for free:\nhttps://educonnectfet.base44.app/resources-library\n\nHappy studying!\nThe EduConnect FET Team`,
      });
      sent++;
    }

    return Response.json({ success: true, notified: sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});