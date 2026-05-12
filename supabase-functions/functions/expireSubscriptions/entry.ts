import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const activeSubs = await base44.asServiceRole.entities.Subscription.filter({ status: 'active' });

    const expired = activeSubs.filter(s => s.end_date && s.end_date < today);

    await Promise.all(
      expired.map(s => base44.asServiceRole.entities.Subscription.update(s.id, { status: 'inactive' }))
    );

    return Response.json({ expired: expired.length, message: `Deactivated ${expired.length} expired subscription(s).` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});