import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (event.type !== 'update') {
      return Response.json({ success: true });
    }

    // Check if status changed
    const statusChanged = old_data?.status !== data?.status;
    if (!statusChanged) {
      return Response.json({ success: true });
    }

    const { tutor_email, tutor_name, amount, status, booking_reference } = data;

    const statusMessages = {
      paid: `Your payout of R${amount} has been successfully processed.`,
      failed: `Your payout of R${amount} failed. Please contact support.`,
      cancelled: `Your payout of R${amount} has been cancelled.`
    };

    const message = statusMessages[status] || `Your payout status has been updated to: ${status}`;

    await base44.integrations.Core.SendEmail({
      to: tutor_email,
      subject: `Payout ${status === 'paid' ? 'Received' : 'Updated'} - Booking ${booking_reference}`,
      body: `
Hello ${tutor_name},

${message}

Booking Reference: ${booking_reference}
Amount: R${amount}
Status: ${status.toUpperCase()}

If you have any questions, please contact our support team.

Best regards,
EduConnect FET Team
      `
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error sending payout notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});