import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { action_type, params = {}, investigation_id, step_id } = await req.json();
    
    if (!action_type) return Response.json({ error: 'action_type required' }, { status: 400 });

    let result = { success: false, message: '', target: '' };
    const now = new Date().toISOString();

    switch (action_type) {
      case 'block_ip': {
        const { ip_address, duration_minutes = 60, reason = 'Blocked via investigation playbook' } = params;
        if (!ip_address) { result.message = 'IP address required'; break; }
        
        const blockedUntil = new Date(Date.now() + duration_minutes * 60 * 1000).toISOString();
        
        // Check if already blocked
        const existing = await base44.asServiceRole.entities.BlockedIP.filter({ ip_address, active: true });
        if (existing.length > 0) {
          result = { success: true, message: `IP ${ip_address} already blocked`, target: ip_address };
        } else {
          await base44.asServiceRole.entities.BlockedIP.create({
            ip_address,
            reason,
            blocked_until: blockedUntil,
            active: true,
            tags: ['playbook_action']
          });
          result = { success: true, message: `Blocked IP ${ip_address} for ${duration_minutes} minutes`, target: ip_address };
        }
        break;
      }

      case 'isolate_endpoint': {
        const { endpoint_id, hostname, reason = 'Isolated via investigation playbook' } = params;
        
        let endpoint;
        if (endpoint_id) {
          const eps = await base44.asServiceRole.entities.Endpoint.filter({ id: endpoint_id });
          endpoint = eps[0];
        } else if (hostname) {
          const eps = await base44.asServiceRole.entities.Endpoint.filter({ hostname });
          endpoint = eps[0];
        }
        
        if (!endpoint) { result.message = 'Endpoint not found'; break; }
        
        await base44.asServiceRole.entities.Endpoint.update(endpoint.id, {
          security_posture: 'compromised',
          status: 'offline',
          tags: [...(endpoint.tags || []), 'isolated', 'playbook_action']
        });
        
        // Log the isolation event
        await base44.asServiceRole.entities.EndpointEvent.create({
          endpoint_id: endpoint.id,
          type: 'alert',
          timestamp: now,
          severity: 'high',
          description: `Endpoint isolated: ${reason}`,
          details: { action: 'isolate', reason, investigation_id }
        });
        
        result = { success: true, message: `Isolated endpoint ${endpoint.hostname}`, target: endpoint.hostname };
        break;
      }

      case 'send_notification': {
        const { recipients = [], subject, message, severity = 'high' } = params;
        
        // Create in-app notification
        await base44.asServiceRole.entities.Notification.create({
          message: message || subject || 'Investigation playbook notification',
          type: 'alert',
          link: '/SecurityDashboard',
          created_at: now
        });
        
        // Send email if recipients provided
        if (recipients.length > 0 && subject) {
          for (const recipient of recipients.slice(0, 5)) {
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: recipient,
                subject: `[Security Alert] ${subject}`,
                body: message || subject
              });
            } catch {}
          }
        }
        
        result = { success: true, message: `Notification sent${recipients.length > 0 ? ` to ${recipients.length} recipient(s)` : ''}`, target: 'notification' };
        break;
      }

      case 'create_finding': {
        const { title, description, severity = 'medium', hunt_name = 'Playbook Investigation' } = params;
        
        await base44.asServiceRole.entities.HuntFinding.create({
          hunt_name,
          finding_type: 'ai_insight',
          severity,
          title: title || 'Finding from investigation playbook',
          description: description || '',
          status: 'new',
          evidence: { source: 'playbook_action', investigation_id }
        });
        
        result = { success: true, message: `Created finding: ${title}`, target: title };
        break;
      }

      case 'run_ioc_sweep': {
        const { iocs = [], time_range_hours = 72 } = params;
        
        if (iocs.length === 0) { result.message = 'No IOCs provided'; break; }
        
        try {
          const sweepResult = await base44.asServiceRole.functions.invoke('iocSweep', {
            iocs,
            time_range_hours,
            hunt_name: `Playbook IOC Sweep - Investigation ${investigation_id || 'manual'}`
          });
          
          result = { 
            success: true, 
            message: `IOC sweep completed: ${sweepResult?.findings_count || 0} matches found`, 
            target: `${iocs.length} IOCs`
          };
        } catch (e) {
          result.message = `IOC sweep failed: ${e.message}`;
        }
        break;
      }

      case 'trigger_vuln_scan': {
        const { endpoint_id, hostname } = params;
        
        let endpoint;
        if (endpoint_id) {
          const eps = await base44.asServiceRole.entities.Endpoint.filter({ id: endpoint_id });
          endpoint = eps[0];
        } else if (hostname) {
          const eps = await base44.asServiceRole.entities.Endpoint.filter({ hostname });
          endpoint = eps[0];
        }
        
        if (!endpoint) { result.message = 'Endpoint not found'; break; }
        
        // Update endpoint to trigger scan (simulated - in real env would call EDR API)
        await base44.asServiceRole.entities.Endpoint.update(endpoint.id, {
          last_vulnerability_scan: now,
          tags: [...(endpoint.tags || []).filter(t => t !== 'scan_pending'), 'scan_in_progress']
        });
        
        result = { success: true, message: `Vulnerability scan triggered for ${endpoint.hostname}`, target: endpoint.hostname };
        break;
      }

      case 'disable_user': {
        const { user_email, reason = 'Disabled via investigation playbook' } = params;
        
        if (!user_email) { result.message = 'User email required'; break; }
        
        // Create security event for the disable action
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'user_disabled',
          severity: 'high',
          message: `User account disabled: ${user_email}. Reason: ${reason}`,
          user_email,
          details: { action: 'disable_user', reason, investigation_id }
        });
        
        // Create notification
        await base44.asServiceRole.entities.Notification.create({
          message: `User account ${user_email} has been flagged for disabling`,
          type: 'alert',
          link: '/SecurityDashboard',
          created_at: now
        });
        
        result = { success: true, message: `User ${user_email} flagged for disabling`, target: user_email };
        break;
      }

      case 'custom': {
        const { description = 'Custom action executed' } = params;
        result = { success: true, message: description, target: 'custom' };
        break;
      }

      default:
        result.message = `Unknown action type: ${action_type}`;
    }

    // Log action to investigation timeline if investigation_id provided
    if (investigation_id && result.success) {
      try {
        const investigations = await base44.asServiceRole.entities.ActiveInvestigation.filter({ id: investigation_id });
        if (investigations[0]) {
          const inv = investigations[0];
          const timeline = inv.timeline || [];
          timeline.push({
            timestamp: now,
            action: `Automated action: ${action_type}`,
            user: user.email,
            details: result.message
          });
          await base44.asServiceRole.entities.ActiveInvestigation.update(investigation_id, { timeline });
        }
      } catch {}
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
});