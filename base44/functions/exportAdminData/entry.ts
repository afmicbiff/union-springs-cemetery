import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Gather datasets (tune limits as needed)
    const [plots, reservations, notifications] = await Promise.all([
      base44.asServiceRole.entities.Plot.list({ limit: 5000 }),
      base44.asServiceRole.entities.Reservation.list({ limit: 5000 }),
      base44.asServiceRole.entities.Notification.list({ limit: 5000 }),
    ]);

    const payload = JSON.stringify({
      exported_at: new Date().toISOString(),
      plots,
      reservations,
      notifications,
    });

    const bytes = new TextEncoder().encode(payload);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=UnionSprings_Backup_${new Date().toISOString().split('T')[0]}.json`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});