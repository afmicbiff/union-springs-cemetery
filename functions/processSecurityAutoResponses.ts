import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function queryThreatFox(indicator) {
  try {
    const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'search_ioc', search_term: indicator })
    });
    const data = await res.json().catch(() => ({}));
    if (!data || data.query_status !== 'ok' || !Array.isArray(data.data) || data.data.length === 0) {
      return { matched: false };
    }

    const familiesSet = new Set();
    let firstSeen = null;
    let lastSeen = null;
    let confidences = [];

    for (const entry of data.data) {
      if (entry.malware && entry.malware !== 'NA') familiesSet.add(entry.malware);
      if (entry.first_seen) {
        const d = new Date(entry.first_seen);
        if (!firstSeen || d < firstSeen) firstSeen = d;
      }
      if (entry.last_seen) {
        const d = new Date(entry.last_seen);
        if (!lastSeen || d > lastSeen) lastSeen = d;
      }
      if (typeof entry.confidence_level === 'number') confidences.push(entry.confidence_level);
    }

    const confidence = confidences.length ? Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length) : null;

    return {
      matched: true,
      source: 'ThreatFox',
      families: Array.from(familiesSet),
      first_seen: firstSeen ? firstSeen.toISOString() : null,
      last_seen: lastSeen ? lastSeen.toISOString() : null,
      confidence
    };
  } catch (_) {
    return { matched: false, error: 'lookup_failed' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin or system-only authorization
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    const expectedSecret = Deno.env.get('SECURITY_AUTORESPOND_JOB_SECRET') || '';
    const providedSecret = req.headers.get('x-job-secret') || new URL(req.url).searchParams.get('job_secret') || '';
    const authorizedBySecret = expectedSecret && providedSecret && providedSecret === expectedSecret;
    if (!user && !authorizedBySecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load config
    const nsList = await base44.asServiceRole.entities.NotificationSettings.list('-updated_date', 1);
    const cfg = (nsList?.[0]?.security_alerts) || {};
    const enabled = cfg.enabled !== false; // default true
    const autoBlockEnabled = cfg.auto_block_enabled === true;
    const blockMinutes = Number(cfg.auto_block_minutes || 60);

    if (!enabled) {
      return Response.json({ status: 'disabled' });
    }

    // Pull recent security events
    const events = await base44.asServiceRole.entities.SecurityEvent.list('-created_date', 500);
    const now = Date.now();
    const windowMs = Math.max(5, Number(cfg.window_minutes || 60)) * 60 * 1000; // use same window setting, default 60m

    const candidates = (events || []).filter((e) => {
      if (!e?.ip_address) return false;
      const t = new Date(e.created_date).getTime();
      if (!Number.isFinite(t) || (now - t) > windowMs) return false;
      const details = e.details || {};
      if (details.auto_response_executed) return false; // already handled
      return true;
    });

    // Deduplicate by IP
    const ips = Array.from(new Set(candidates.map((e) => e.ip_address))).slice(0, 100);

    const intelByIp = {};
    await Promise.all(ips.map(async (ip) => { intelByIp[ip] = await queryThreatFox(ip); }));

    let matchedCount = 0;
    let blockedCount = 0;
    const processedEvents = [];

    for (const ev of candidates) {
      const ip = ev.ip_address;
      const intel = intelByIp[ip];
      if (!intel?.matched) continue;

      matchedCount++;

      // Always create high-severity in-app notification when matched (per requirement)
      const note = await base44.asServiceRole.entities.Notification.create({
        message: `Critical threat intel match for ${ip}.` + (autoBlockEnabled ? ` Auto-blocking for ${blockMinutes} minutes.` : ''),
        type: 'alert',
        is_read: false,
        user_email: null,
        related_entity_type: 'event',
        related_entity_id: ev.id,
        link: '/SecurityDashboard',
        created_at: new Date().toISOString()
      }).catch(() => null);

      let blockRecord = null;
      if (autoBlockEnabled) {
        const blocked_until = new Date(Date.now() + blockMinutes * 60 * 1000).toISOString();
        blockRecord = await base44.asServiceRole.entities.BlockedIP.create({
          ip_address: ip,
          reason: 'Auto-block: Threat intel match',
          blocked_until,
          active: true,
          tags: ['auto', 'threat_intel']
        }).catch(() => null);
        if (blockRecord) blockedCount++;

        // Log an ip_block event for audit
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'ip_block',
          severity: 'high',
          message: `Auto-blocked ${ip} for ${blockMinutes} minutes due to TI match`,
          ip_address: ip,
          user_agent: '',
          user_email: user?.email || 'system',
          route: 'functions/processSecurityAutoResponses',
          details: { intel, blocked_until, auto: true }
        }).catch(() => null);
      }

      // Create a critical TI match event
      await base44.asServiceRole.entities.SecurityEvent.create({
        event_type: 'threat_intel_match',
        severity: 'critical',
        message: `Threat intel match detected for ${ip}`,
        ip_address: ip,
        details: { intel, notification_id: note?.id || null, auto_block: !!blockRecord }
      }).catch(() => null);

      // Mark original event as processed
      const newDetails = { ...(ev.details || {}), auto_response_executed: true, auto_response_at: new Date().toISOString(), auto_block_minutes: blockMinutes, intel };
      await base44.asServiceRole.entities.SecurityEvent.update(ev.id, { details: newDetails }).catch(() => null);
      processedEvents.push(ev.id);
    }

    return Response.json({ matchedCount, blockedCount, processedEvents });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});