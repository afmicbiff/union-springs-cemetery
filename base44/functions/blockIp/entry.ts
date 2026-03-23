import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { ip_address, duration_minutes = 60, reason = '' } = await req.json();
    if (!ip_address) return Response.json({ error: 'ip_address is required' }, { status: 400 });

    const now = Date.now();
    const ms = Math.max(1, Number(duration_minutes)) * 60 * 1000;
    const blocked_until = new Date(now + ms).toISOString();

    const record = await base44.asServiceRole.entities.BlockedIP.create({
      ip_address,
      reason,
      blocked_until,
      active: true,
    });

    try {
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'ip_block',
        severity: 'high',
        message: `Temporary IP block applied: ${ip_address} for ${duration_minutes} minutes`,
        ip_address,
        user_agent: '',
        user_email: user.email,
        route: 'functions/blockIp',
        details: { reason, blocked_until }
      });
    } catch (_) {}

    return Response.json({ success: true, blocked: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});