import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CATEGORY_LABELS = {
  critical_incident: 'Critical Incident',
  high_priority: 'High Priority',
  requires_investigation: 'Requires Investigation',
  monitor: 'Monitor',
  low_risk: 'Low Risk',
  false_positive: 'False Positive'
};

const DEFAULT_INVESTIGATION_STEPS = {
  critical_incident: [
    'Immediately isolate affected systems',
    'Notify security team lead and management',
    'Preserve all logs and evidence',
    'Identify scope of compromise',
    'Begin incident response playbook'
  ],
  high_priority: [
    'Review event details and context',
    'Check for related events from same source',
    'Verify endpoint security posture',
    'Assess potential business impact',
    'Escalate if needed within 1 hour'
  ],
  requires_investigation: [
    'Gather additional context from logs',
    'Check threat intelligence sources',
    'Review user/system behavior baseline',
    'Document findings',
    'Determine if escalation needed'
  ],
  monitor: [
    'Add to watchlist for pattern detection',
    'Set up alerts for repeat occurrences',
    'Review in daily security brief'
  ],
  low_risk: [
    'Log for trend analysis',
    'No immediate action required',
    'Include in weekly security report'
  ],
  false_positive: [
    'Document reason for classification',
    'Consider tuning detection rules',
    'Update allowlist if appropriate'
  ]
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { event_id, use_ai = true } = await req.json();
    
    if (!event_id) {
      return Response.json({ error: 'event_id required' }, { status: 400 });
    }

    // Check if already triaged
    const existing = await base44.asServiceRole.entities.TriagedIncident.filter({ security_event_id: event_id });
    if (existing.length > 0) {
      return Response.json({ already_triaged: true, incident: existing[0] });
    }

    // Fetch event
    const events = await base44.asServiceRole.entities.SecurityEvent.filter({ id: event_id });
    const event = events[0];
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch triage rules
    const rules = await base44.asServiceRole.entities.TriageRule.filter({ enabled: true });
    const sortedRules = rules.sort((a, b) => (a.priority || 50) - (b.priority || 50));

    // Fetch threat intel
    let threatMatch = false;
    if (event.ip_address) {
      try {
        const intel = await base44.asServiceRole.functions.invoke('threatIntelLookup', { indicators: [event.ip_address] });
        threatMatch = intel?.data?.results?.[event.ip_address]?.matched || false;
      } catch {}
    }

    // Fetch endpoint
    let endpoint = null;
    if (event.ip_address || event.user_email) {
      const endpoints = await base44.asServiceRole.entities.Endpoint.filter(
        event.ip_address ? { last_ip: event.ip_address } : { owner_email: event.user_email },
        '-updated_date', 1
      );
      endpoint = endpoints[0] || null;
    }

    // Count recent events from same IP
    let recentEventCount = 1;
    if (event.ip_address) {
      const recent = await base44.asServiceRole.entities.SecurityEvent.filter({ ip_address: event.ip_address }, '-created_date', 100);
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      recentEventCount = recent.filter(e => new Date(e.created_date).getTime() > tenMinAgo).length;
    }

    // Try rule-based triage
    let matchedRule = null;
    for (const rule of sortedRules) {
      const cond = rule.conditions || {};
      let matches = false;

      if (cond.severity?.length > 0 && cond.severity.includes(event.severity)) matches = true;
      if (cond.event_types?.length > 0 && cond.event_types.includes(event.event_type)) matches = true;
      if (cond.threat_intel_match === true && threatMatch) matches = true;
      if (cond.endpoint_posture?.length > 0 && endpoint && cond.endpoint_posture.includes(endpoint.security_posture)) matches = true;
      if (cond.has_vulnerabilities === true && endpoint?.vulnerabilities?.length > 0) matches = true;
      if (cond.event_count_min && recentEventCount >= cond.event_count_min) matches = true;
      if (cond.keywords?.length > 0) {
        const msg = (event.message || '').toLowerCase();
        if (cond.keywords.some(k => msg.includes(k.toLowerCase()))) matches = true;
      }

      if (matches) {
        matchedRule = rule;
        break;
      }
    }

    let triageResult = null;

    if (matchedRule) {
      // Rule-based triage
      const slaDue = matchedRule.sla_minutes 
        ? new Date(Date.now() + matchedRule.sla_minutes * 60 * 1000).toISOString() 
        : null;

      triageResult = {
        security_event_id: event.id,
        category: matchedRule.category,
        category_label: CATEGORY_LABELS[matchedRule.category] || matchedRule.category,
        rule_id: matchedRule.id,
        rule_name: matchedRule.name,
        triage_method: 'rule',
        confidence_score: 95,
        reasoning: `Matched rule: ${matchedRule.name}`,
        investigation_steps: matchedRule.investigation_steps?.length > 0 
          ? matchedRule.investigation_steps 
          : DEFAULT_INVESTIGATION_STEPS[matchedRule.category] || [],
        documentation_links: matchedRule.documentation_links || [],
        sla_due_at: slaDue,
        event_snapshot: {
          severity: event.severity,
          event_type: event.event_type,
          ip_address: event.ip_address,
          message: event.message,
          threat_intel_match: threatMatch,
          endpoint_posture: endpoint?.security_posture
        }
      };
    } else if (use_ai) {
      // AI-based triage
      try {
        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a security analyst. Triage this security event and provide analysis.

Event Details:
- Severity: ${event.severity}
- Type: ${event.event_type}
- Message: ${event.message}
- IP Address: ${event.ip_address || 'N/A'}
- User: ${event.user_email || 'N/A'}
- Route: ${event.route || 'N/A'}
- Threat Intel Match: ${threatMatch ? 'YES - Known malicious IP' : 'No'}
- Endpoint Status: ${endpoint ? `${endpoint.hostname} - ${endpoint.security_posture}` : 'Unknown'}
- Endpoint Vulnerabilities: ${endpoint?.vulnerabilities?.length || 0}
- Recent events from same IP: ${recentEventCount}

Categorize this incident and provide investigation guidance.`,
          response_json_schema: {
            type: 'object',
            properties: {
              category: { 
                type: 'string', 
                enum: ['critical_incident', 'high_priority', 'requires_investigation', 'monitor', 'low_risk', 'false_positive'] 
              },
              confidence: { type: 'number', description: '0-100' },
              reasoning: { type: 'string' },
              threat_assessment: { type: 'string' },
              potential_impact: { type: 'string' },
              recommended_actions: { type: 'array', items: { type: 'string' } },
              investigation_steps: { type: 'array', items: { type: 'string' } },
              related_mitre_techniques: { type: 'array', items: { type: 'string' } }
            },
            required: ['category', 'reasoning', 'investigation_steps']
          }
        });

        const slaMins = {
          critical_incident: 15,
          high_priority: 60,
          requires_investigation: 240,
          monitor: 1440,
          low_risk: null,
          false_positive: null
        }[aiResult.category];

        triageResult = {
          security_event_id: event.id,
          category: aiResult.category,
          category_label: CATEGORY_LABELS[aiResult.category] || aiResult.category,
          rule_id: null,
          rule_name: null,
          triage_method: 'ai',
          confidence_score: aiResult.confidence || 75,
          reasoning: aiResult.reasoning,
          investigation_steps: aiResult.investigation_steps || DEFAULT_INVESTIGATION_STEPS[aiResult.category] || [],
          ai_analysis: {
            threat_assessment: aiResult.threat_assessment,
            potential_impact: aiResult.potential_impact,
            recommended_actions: aiResult.recommended_actions,
            related_mitre_techniques: aiResult.related_mitre_techniques
          },
          sla_due_at: slaMins ? new Date(Date.now() + slaMins * 60 * 1000).toISOString() : null,
          event_snapshot: {
            severity: event.severity,
            event_type: event.event_type,
            ip_address: event.ip_address,
            message: event.message,
            threat_intel_match: threatMatch,
            endpoint_posture: endpoint?.security_posture
          }
        };
      } catch (e) {
        // Fallback to severity-based
        const severityMap = {
          critical: 'critical_incident',
          high: 'high_priority',
          medium: 'requires_investigation',
          low: 'monitor',
          info: 'low_risk'
        };
        const cat = severityMap[event.severity] || 'requires_investigation';
        
        triageResult = {
          security_event_id: event.id,
          category: cat,
          category_label: CATEGORY_LABELS[cat],
          triage_method: 'rule',
          confidence_score: 60,
          reasoning: `Fallback triage based on severity: ${event.severity}`,
          investigation_steps: DEFAULT_INVESTIGATION_STEPS[cat] || [],
          event_snapshot: {
            severity: event.severity,
            event_type: event.event_type,
            ip_address: event.ip_address,
            message: event.message
          }
        };
      }
    } else {
      // No AI, severity-based fallback
      const severityMap = {
        critical: 'critical_incident',
        high: 'high_priority',
        medium: 'requires_investigation',
        low: 'monitor',
        info: 'low_risk'
      };
      const cat = severityMap[event.severity] || 'requires_investigation';
      
      triageResult = {
        security_event_id: event.id,
        category: cat,
        category_label: CATEGORY_LABELS[cat],
        triage_method: 'rule',
        confidence_score: 50,
        reasoning: `Default triage based on severity: ${event.severity}`,
        investigation_steps: DEFAULT_INVESTIGATION_STEPS[cat] || [],
        event_snapshot: {
          severity: event.severity,
          event_type: event.event_type,
          ip_address: event.ip_address,
          message: event.message
        }
      };
    }

    // Create triaged incident
    const incident = await base44.asServiceRole.entities.TriagedIncident.create(triageResult);

    // Create notification for high priority
    if (['critical_incident', 'high_priority'].includes(triageResult.category)) {
      await base44.asServiceRole.entities.Notification.create({
        message: `${triageResult.category_label}: ${event.event_type} - ${event.message?.slice(0, 100)}`,
        type: 'alert',
        link: '/SecurityDashboard',
        related_entity_id: incident.id,
        related_entity_type: 'other',
        created_at: new Date().toISOString()
      });
    }

    return Response.json({ success: true, incident });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});