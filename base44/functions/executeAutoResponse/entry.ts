import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { event_id, rule_id, manual } = await req.json();
    
    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Fetch the security event
    const events = await base44.asServiceRole.entities.SecurityEvent.filter({ id: event_id });
    const event = events[0];
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch all enabled rules or specific rule
    let rules = [];
    if (rule_id) {
      const r = await base44.asServiceRole.entities.SecurityAutoResponse.filter({ id: rule_id });
      if (r[0]) rules = [r[0]];
    } else {
      rules = await base44.asServiceRole.entities.SecurityAutoResponse.filter({ enabled: true });
    }

    if (rules.length === 0) {
      return Response.json({ message: 'No active rules', actions: [] });
    }

    // Fetch threat intel if IP exists
    let threatMatch = false;
    if (event.ip_address) {
      try {
        const intel = await base44.asServiceRole.functions.invoke('threatIntelLookup', { 
          indicators: [event.ip_address] 
        });
        threatMatch = intel?.data?.results?.[event.ip_address]?.matched || false;
      } catch {}
    }

    // Fetch endpoint if available
    let endpoint = null;
    if (event.ip_address || event.user_email) {
      const endpoints = await base44.asServiceRole.entities.Endpoint.filter(
        event.ip_address ? { last_ip: event.ip_address } : { owner_email: event.user_email },
        '-updated_date',
        1
      );
      endpoint = endpoints[0] || null;
    }

    // Count recent events from same IP
    let recentEventCount = 1;
    if (event.ip_address) {
      const recentEvents = await base44.asServiceRole.entities.SecurityEvent.filter(
        { ip_address: event.ip_address },
        '-created_date',
        100
      );
      const now = Date.now();
      const tenMinAgo = now - 10 * 60 * 1000;
      recentEventCount = recentEvents.filter(e => new Date(e.created_date).getTime() > tenMinAgo).length;
    }

    const results = [];
    const now = new Date().toISOString();

    for (const rule of rules) {
      const cond = rule.trigger_conditions || {};
      const actions = rule.actions || {};
      let shouldTrigger = false;
      let triggerReason = [];

      // Check severity
      if (cond.severity?.length > 0 && cond.severity.includes(event.severity)) {
        shouldTrigger = true;
        triggerReason.push(`Severity: ${event.severity}`);
      }

      // Check event type
      if (cond.event_types?.length > 0 && cond.event_types.includes(event.event_type)) {
        shouldTrigger = true;
        triggerReason.push(`Event type: ${event.event_type}`);
      }

      // Check threat intel match
      if (cond.threat_intel_match && threatMatch) {
        shouldTrigger = true;
        triggerReason.push('Threat intel match');
      }

      // Check endpoint posture
      if (cond.endpoint_posture?.length > 0 && endpoint && cond.endpoint_posture.includes(endpoint.security_posture)) {
        shouldTrigger = true;
        triggerReason.push(`Endpoint posture: ${endpoint.security_posture}`);
      }

      // Check event count threshold
      if (cond.event_count_threshold && recentEventCount >= cond.event_count_threshold) {
        shouldTrigger = true;
        triggerReason.push(`Event count: ${recentEventCount} >= ${cond.event_count_threshold}`);
      }

      if (!shouldTrigger && !manual) continue;
      if (manual) triggerReason.push('Manual trigger');

      // Check cooldown
      if (rule.last_triggered && !manual) {
        const lastTriggered = new Date(rule.last_triggered).getTime();
        const cooldownMs = (rule.cooldown_minutes || 30) * 60 * 1000;
        if (Date.now() - lastTriggered < cooldownMs) {
          results.push({ rule: rule.name, skipped: 'Cooldown active' });
          continue;
        }
      }

      const actionsTaken = [];

      // Execute actions
      // 1. Block IP
      if (actions.block_ip?.enabled && event.ip_address) {
        try {
          const duration = actions.block_ip.duration_minutes || 60;
          const blockedUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
          
          // Check if already blocked
          const existing = await base44.asServiceRole.entities.BlockedIP.filter({ 
            ip_address: event.ip_address, 
            active: true 
          });
          
          if (existing.length === 0) {
            await base44.asServiceRole.entities.BlockedIP.create({
              ip_address: event.ip_address,
              reason: `Auto-response: ${rule.name}`,
              blocked_until: blockedUntil,
              active: true,
              tags: ['auto-response', rule.id]
            });
            actionsTaken.push({ action: 'block_ip', status: 'success', target: event.ip_address, details: `Blocked for ${duration} min` });
          } else {
            actionsTaken.push({ action: 'block_ip', status: 'skipped', target: event.ip_address, details: 'Already blocked' });
          }
        } catch (e) {
          actionsTaken.push({ action: 'block_ip', status: 'failed', target: event.ip_address, details: e.message });
        }
      }

      // 2. Isolate endpoint
      if (actions.isolate_endpoint?.enabled && endpoint) {
        try {
          await base44.asServiceRole.entities.Endpoint.update(endpoint.id, {
            security_posture: 'compromised',
            status: 'offline',
            tags: [...(endpoint.tags || []), 'isolated', 'auto-response']
          });
          actionsTaken.push({ action: 'isolate_endpoint', status: 'success', target: endpoint.hostname, details: 'Endpoint isolated' });
        } catch (e) {
          actionsTaken.push({ action: 'isolate_endpoint', status: 'failed', target: endpoint?.hostname, details: e.message });
        }
      }

      // 3. Trigger vulnerability scan
      if (actions.trigger_vuln_scan?.enabled && endpoint) {
        try {
          await base44.asServiceRole.entities.Endpoint.update(endpoint.id, {
            last_vulnerability_scan: null, // Reset to trigger rescan
            tags: [...(endpoint.tags || []).filter(t => t !== 'scan-pending'), 'scan-pending']
          });
          await base44.asServiceRole.entities.EndpointEvent.create({
            endpoint_id: endpoint.id,
            type: 'alert',
            severity: 'medium',
            timestamp: now,
            description: `Vulnerability scan triggered by auto-response: ${rule.name}`
          });
          actionsTaken.push({ action: 'trigger_vuln_scan', status: 'success', target: endpoint.hostname, details: 'Scan queued' });
        } catch (e) {
          actionsTaken.push({ action: 'trigger_vuln_scan', status: 'failed', target: endpoint?.hostname, details: e.message });
        }
      }

      // 4. Send email notification
      if (actions.notify_email?.enabled && actions.notify_email.recipients?.length > 0) {
        for (const recipient of actions.notify_email.recipients) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: recipient,
              subject: `🚨 Security Alert: ${rule.name} triggered`,
              body: `
Security Auto-Response Triggered
================================

Rule: ${rule.name}
Trigger Reason: ${triggerReason.join(', ')}
Event Severity: ${event.severity}
Event Type: ${event.event_type}
IP Address: ${event.ip_address || 'N/A'}
User: ${event.user_email || 'N/A'}
Message: ${event.message}
Time: ${now}

${endpoint ? `
Endpoint Information:
- Hostname: ${endpoint.hostname}
- Security Posture: ${endpoint.security_posture}
- Status: ${endpoint.status}
` : ''}

Actions Taken:
${actionsTaken.map(a => `- ${a.action}: ${a.status} (${a.details})`).join('\n')}

Please review and take additional action if necessary.
              `.trim()
            });
            actionsTaken.push({ action: 'notify_email', status: 'success', target: recipient, details: 'Email sent' });
          } catch (e) {
            actionsTaken.push({ action: 'notify_email', status: 'failed', target: recipient, details: e.message });
          }
        }
      }

      // 5. Create in-app alert
      if (actions.create_in_app_alert?.enabled !== false) {
        try {
          await base44.asServiceRole.entities.Notification.create({
            message: `Auto-response "${rule.name}" triggered: ${triggerReason.join(', ')}`,
            type: 'alert',
            related_entity_type: 'other',
            related_entity_id: event.id,
            link: `/SecurityDashboard`,
            created_at: now
          });
          actionsTaken.push({ action: 'create_in_app_alert', status: 'success', details: 'Notification created' });
        } catch (e) {
          actionsTaken.push({ action: 'create_in_app_alert', status: 'failed', details: e.message });
        }
      }

      // 6. Escalate severity
      if (actions.escalate_severity?.enabled && actions.escalate_severity.to_severity) {
        try {
          await base44.asServiceRole.entities.SecurityEvent.update(event.id, {
            severity: actions.escalate_severity.to_severity,
            details: {
              ...(event.details || {}),
              escalated_from: event.severity,
              escalated_by: rule.name,
              escalated_at: now
            }
          });
          actionsTaken.push({ action: 'escalate_severity', status: 'success', details: `${event.severity} → ${actions.escalate_severity.to_severity}` });
        } catch (e) {
          actionsTaken.push({ action: 'escalate_severity', status: 'failed', details: e.message });
        }
      }

      // Log the auto-response
      await base44.asServiceRole.entities.AutoResponseLog.create({
        rule_id: rule.id,
        rule_name: rule.name,
        security_event_id: event.id,
        trigger_reason: triggerReason.join(', '),
        actions_taken: actionsTaken,
        ip_address: event.ip_address,
        endpoint_id: endpoint?.id,
        severity: event.severity,
        executed_at: now
      });

      // Update rule stats
      await base44.asServiceRole.entities.SecurityAutoResponse.update(rule.id, {
        last_triggered: now,
        trigger_count: (rule.trigger_count || 0) + 1
      });

      results.push({ 
        rule: rule.name, 
        triggered: true, 
        reason: triggerReason.join(', '),
        actions: actionsTaken 
      });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});