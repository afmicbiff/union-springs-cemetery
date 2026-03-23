import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { event_id = null, ip_address = null } = body || {};

    // Load event if provided to extract IP and context
    let ev = null;
    let ip = ip_address;
    if (event_id) {
      const arr = await base44.entities.SecurityEvent.filter({ id: event_id }, undefined, 1);
      ev = Array.isArray(arr) && arr.length ? arr[0] : null;
      if (!ip) ip = ev?.ip_address || null;
    }

    if (!ip) {
      return Response.json({ error: 'No IP address available for auto-response' }, { status: 400 });
    }

    // Threat intel lookup via existing function
    const tiRes = await base44.functions.invoke('threatIntelLookup', { indicators: [ip] });
    const ti = tiRes?.data?.results?.[ip] || null;
    const matched = !!ti?.matched;

    // Read alert configuration
    const nsList = await base44.entities.NotificationSettings.list('-updated_date', 1);
    const cfg = (nsList?.[0]?.security_alerts) || {};
    const enabled = cfg.enabled !== false; // default to true
    const autoBlock = cfg.auto_block_enabled === true;
    const minutes = Number(cfg.auto_block_minutes || 60);

    let blocked = false;
    let notificationId = null;
    let blockResponse = null;

    if (enabled && autoBlock && matched) {
      // Block the IP using the existing function
      const res = await base44.functions.invoke('blockIp', {
        ip_address: ip,
        duration_minutes: minutes,
        reason: 'Auto-block: Threat intel match'
      });
      if (!res?.data?.error) blocked = true;
      blockResponse = res?.data || null;

      // Create in-app notification (system-wide)
      const note = await base44.entities.Notification.create({
        message: `Critical threat intelligence match for ${ip}. Auto-blocked for ${minutes} minutes.`,
        type: 'alert',
        is_read: false,
        user_email: null,
        related_entity_type: 'event',
        related_entity_id: ev?.id || null,
        link: '/SecurityDashboard',
        created_at: new Date().toISOString()
      });
      notificationId = note?.id || null;

      // Log as a security event
      await base44.entities.SecurityEvent.create({
        event_type: 'auto_response',
        severity: 'critical',
        message: `Auto-response executed for ${ip}: TI match -> blocked ${minutes}m`,
        ip_address: ip,
        details: { ti, block: blockResponse, source_event_id: ev?.id || null }
      });
    }

    return Response.json({ matched, blocked, minutes, notification_id: notificationId, ip, config_used: { enabled, auto_block: autoBlock } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});