import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SEVERITY_WEIGHT = { info: 1, low: 2, medium: 3, high: 4, critical: 5 };

function matchCondition(value, operator, filterValue) {
  if (value === null || value === undefined) return operator === 'exists' ? false : false;
  if (operator === 'exists') return true;
  const strVal = String(value).toLowerCase();
  const filterStr = String(filterValue).toLowerCase();
  switch (operator) {
    case 'equals': return strVal === filterStr;
    case 'contains': return strVal.includes(filterStr);
    case 'gt': return Number(value) > Number(filterValue);
    case 'lt': return Number(value) < Number(filterValue);
    case 'gte': return Number(value) >= Number(filterValue);
    case 'lte': return Number(value) <= Number(filterValue);
    case 'in': return filterValue.split(',').map(v => v.trim().toLowerCase()).includes(strVal);
    case 'regex': try { return new RegExp(filterValue, 'i').test(strVal); } catch { return false; }
    default: return false;
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function calculateFidelity(sources, threatIntelMatches, eventCount, uniqueIPs) {
  let score = 0;
  score += Math.min(sources.length * 15, 45); // Multi-source correlation
  score += threatIntelMatches > 0 ? 25 : 0; // Threat intel confirmation
  score += Math.min(eventCount * 2, 20); // Event volume
  score += uniqueIPs > 1 ? 10 : 0; // Multiple IPs involved
  return Math.min(score, 100);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { time_window_hours = 1, rule_ids = [] } = await req.json().catch(() => ({}));
    const cutoffTime = new Date(Date.now() - time_window_hours * 60 * 60 * 1000).toISOString();

    // Fetch all data sources
    const [secEvents, endpoints, endpointEvents, blockedIPs, rules] = await Promise.all([
      base44.asServiceRole.entities.SecurityEvent.list('-created_date', 500),
      base44.asServiceRole.entities.Endpoint.list('-updated_date', 200),
      base44.asServiceRole.entities.EndpointEvent.list('-timestamp', 500),
      base44.asServiceRole.entities.BlockedIP.filter({ active: true }, '-created_date', 100),
      base44.asServiceRole.entities.CorrelationRule.filter({ enabled: true })
    ]);

    // Filter by time window
    const recentSecEvents = secEvents.filter(e => e.created_date >= cutoffTime);
    const recentEndpointEvents = endpointEvents.filter(e => e.timestamp >= cutoffTime);

    // Build lookup indices
    const ipToEvents = {};
    const userToEvents = {};
    const ipToEndpoints = {};
    const blockedIPSet = new Set(blockedIPs.map(b => b.ip_address));

    recentSecEvents.forEach(e => {
      if (e.ip_address) {
        (ipToEvents[e.ip_address] = ipToEvents[e.ip_address] || []).push(e);
      }
      if (e.user_email) {
        (userToEvents[e.user_email] = userToEvents[e.user_email] || []).push(e);
      }
    });

    endpoints.forEach(ep => {
      if (ep.last_ip) {
        (ipToEndpoints[ep.last_ip] = ipToEndpoints[ep.last_ip] || []).push(ep);
      }
    });

    // Threat intel lookup for high-severity IPs
    const highSevIPs = [...new Set(recentSecEvents.filter(e => ['high', 'critical'].includes(e.severity) && e.ip_address).map(e => e.ip_address))].slice(0, 20);
    let threatIntelMap = {};
    if (highSevIPs.length > 0) {
      try {
        const intelRes = await base44.asServiceRole.functions.invoke('threatIntelLookup', { indicators: highSevIPs, deep_lookup: true });
        threatIntelMap = intelRes?.data?.results || {};
      } catch {}
    }

    const correlatedIncidents = [];
    const processedKeys = new Set();

    // Sort rules by priority
    const sortedRules = (rule_ids.length > 0 ? rules.filter(r => rule_ids.includes(r.id)) : rules).sort((a, b) => (a.priority || 50) - (b.priority || 50));

    for (const rule of sortedRules) {
      const windowMs = (rule.time_window_minutes || 15) * 60 * 1000;
      const correlationKeys = rule.correlation_keys || ['ip_address'];

      // Get candidate keys based on correlation type
      const candidateKeys = new Set();
      if (correlationKeys.includes('ip_address')) {
        Object.keys(ipToEvents).forEach(k => candidateKeys.add(`ip:${k}`));
      }
      if (correlationKeys.includes('user_email')) {
        Object.keys(userToEvents).forEach(k => candidateKeys.add(`user:${k}`));
      }

      for (const keyStr of candidateKeys) {
        const [keyType, keyValue] = keyStr.split(':');
        const cacheKey = `${rule.id}:${keyStr}`;
        if (processedKeys.has(cacheKey)) continue;

        // Gather events for this correlation key
        let relevantEvents = [];
        if (keyType === 'ip') {
          relevantEvents = ipToEvents[keyValue] || [];
        } else if (keyType === 'user') {
          relevantEvents = userToEvents[keyValue] || [];
        }

        if (relevantEvents.length === 0) continue;

        // Apply rule conditions
        let matchedEvents = relevantEvents;
        let conditionsMet = true;

        for (const cond of rule.conditions || []) {
          if (cond.source !== 'security_events') continue;
          const filtered = matchedEvents.filter(e => matchCondition(getNestedValue(e, cond.field), cond.operator, cond.value));
          if (cond.required && filtered.length === 0) {
            conditionsMet = false;
            break;
          }
          if (filtered.length > 0) matchedEvents = filtered;
        }

        if (!conditionsMet) continue;

        // Apply threshold checks
        const threshold = rule.threshold || {};
        if (threshold.count && matchedEvents.length < threshold.count) continue;
        if (threshold.unique_field && threshold.unique_count) {
          const uniqueValues = new Set(matchedEvents.map(e => getNestedValue(e, threshold.unique_field)).filter(Boolean));
          if (uniqueValues.size < threshold.unique_count) continue;
        }

        // Check time window
        const timestamps = matchedEvents.map(e => new Date(e.created_date).getTime()).sort((a, b) => a - b);
        if (timestamps.length > 1 && (timestamps[timestamps.length - 1] - timestamps[0]) > windowMs) {
          // Events spread too far apart, take recent subset
          const cutoff = timestamps[timestamps.length - 1] - windowMs;
          matchedEvents = matchedEvents.filter(e => new Date(e.created_date).getTime() >= cutoff);
        }

        if (matchedEvents.length < 2) continue;

        // Sequence detection
        if (rule.pattern_type === 'sequence' && rule.sequence?.length > 0) {
          const sortedEvents = [...matchedEvents].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          let seqIdx = 0;
          let lastTime = 0;
          const matchedSequence = [];

          for (const event of sortedEvents) {
            const seqStep = rule.sequence[seqIdx];
            if (!seqStep) break;
            
            const eventTime = new Date(event.created_date).getTime();
            const typeMatch = !seqStep.event_type || event.event_type?.toLowerCase().includes(seqStep.event_type.toLowerCase());
            const sevMatch = !seqStep.severity_min || (SEVERITY_WEIGHT[event.severity] || 0) >= (SEVERITY_WEIGHT[seqStep.severity_min] || 0);
            const gapOk = seqIdx === 0 || !seqStep.max_gap_minutes || (eventTime - lastTime) <= seqStep.max_gap_minutes * 60 * 1000;

            if (typeMatch && sevMatch && gapOk) {
              matchedSequence.push(event);
              lastTime = eventTime;
              seqIdx++;
            }
          }

          if (matchedSequence.length < rule.sequence.length) continue;
          matchedEvents = matchedSequence;
        }

        // Multi-source correlation
        const sourcesInvolved = new Set(['security_events']);
        const relatedEndpointsList = [];
        const relatedEndpointEvents = [];

        if (keyType === 'ip') {
          const eps = ipToEndpoints[keyValue] || [];
          if (eps.length > 0) {
            sourcesInvolved.add('endpoints');
            relatedEndpointsList.push(...eps);
            
            const epIds = new Set(eps.map(e => e.id));
            const epEvents = recentEndpointEvents.filter(e => epIds.has(e.endpoint_id));
            if (epEvents.length > 0) {
              sourcesInvolved.add('endpoint_events');
              relatedEndpointEvents.push(...epEvents);
            }
          }

          if (blockedIPSet.has(keyValue)) {
            sourcesInvolved.add('blocked_ips');
          }
        }

        // Threat intel enrichment
        const threatMatches = [];
        const intel = threatIntelMap[keyValue];
        if (intel?.matched) {
          sourcesInvolved.add('threat_intel');
          threatMatches.push({
            indicator: keyValue,
            source: intel.sources?.join(', ') || 'Unknown',
            families: intel.families || []
          });
        }

        // Calculate scores
        const fidelityScore = calculateFidelity(
          Array.from(sourcesInvolved),
          threatMatches.length,
          matchedEvents.length,
          new Set(matchedEvents.map(e => e.ip_address).filter(Boolean)).size
        );

        const avgSeverity = matchedEvents.reduce((sum, e) => sum + (SEVERITY_WEIGHT[e.severity] || 0), 0) / matchedEvents.length;
        const confidenceScore = Math.min(100, Math.round(50 + avgSeverity * 5 + sourcesInvolved.size * 10));

        // Build event chain
        const eventChain = matchedEvents.slice(0, 20).map(e => ({
          source: 'security_events',
          event_id: e.id,
          event_type: e.event_type,
          severity: e.severity,
          timestamp: e.created_date,
          summary: e.message?.slice(0, 100)
        }));

        // Add endpoint events to chain
        relatedEndpointEvents.slice(0, 10).forEach(e => {
          eventChain.push({
            source: 'endpoint_events',
            event_id: e.id,
            event_type: e.type,
            severity: e.severity,
            timestamp: e.timestamp,
            summary: e.description?.slice(0, 100) || `${e.type}: ${e.process_name || e.file_path || ''}`
          });
        });

        // Sort event chain by timestamp
        eventChain.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const timeSpan = eventChain.length > 1 
          ? (new Date(eventChain[eventChain.length - 1].timestamp) - new Date(eventChain[0].timestamp)) / 60000 
          : 0;

        // Determine output severity
        let outputSeverity = rule.output_severity || 'high';
        if (threatMatches.length > 0 || sourcesInvolved.size >= 4) outputSeverity = 'critical';

        correlatedIncidents.push({
          rule_id: rule.id,
          rule_name: rule.name,
          title: `${rule.name}: ${keyValue}`,
          description: rule.description || `Correlated activity detected for ${keyType} ${keyValue}`,
          severity: outputSeverity,
          confidence_score: confidenceScore,
          fidelity_score: fidelityScore,
          correlation_key: keyValue,
          correlation_type: keyType === 'ip' ? 'ip_address' : 'user_email',
          sources_involved: Array.from(sourcesInvolved),
          event_chain: eventChain,
          related_ips: [...new Set(matchedEvents.map(e => e.ip_address).filter(Boolean))],
          related_users: [...new Set(matchedEvents.map(e => e.user_email).filter(Boolean))],
          related_endpoints: relatedEndpointsList.map(e => e.hostname),
          threat_intel_matches: threatMatches,
          mitre_techniques: rule.mitre_techniques || [],
          time_span_minutes: Math.round(timeSpan)
        });

        processedKeys.add(cacheKey);

        // Update rule trigger count
        await base44.asServiceRole.entities.CorrelationRule.update(rule.id, {
          trigger_count: (rule.trigger_count || 0) + 1,
          last_triggered: new Date().toISOString()
        });
      }
    }

    // Sort by fidelity and severity
    correlatedIncidents.sort((a, b) => {
      const sevDiff = (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0);
      if (sevDiff !== 0) return sevDiff;
      return (b.fidelity_score || 0) - (a.fidelity_score || 0);
    });

    // AI analysis for top incidents
    const topIncidents = correlatedIncidents.filter(i => i.fidelity_score >= 50 || i.severity === 'critical').slice(0, 5);
    
    for (const incident of topIncidents) {
      try {
        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analyze this correlated security incident and provide an attack narrative:

Incident: ${incident.title}
Severity: ${incident.severity}
Sources: ${incident.sources_involved.join(', ')}
Event Count: ${incident.event_chain.length}
Time Span: ${incident.time_span_minutes} minutes
IPs: ${incident.related_ips.join(', ')}
Users: ${incident.related_users.join(', ')}
Threat Intel: ${incident.threat_intel_matches.length > 0 ? incident.threat_intel_matches.map(t => t.families?.join(', ')).join('; ') : 'None'}

Event Timeline:
${incident.event_chain.slice(0, 10).map(e => `- [${e.severity}] ${e.event_type}: ${e.summary}`).join('\n')}

Provide attack narrative and recommended actions.`,
          response_json_schema: {
            type: 'object',
            properties: {
              attack_narrative: { type: 'string' },
              attack_stage: { type: 'string' },
              recommended_actions: { type: 'array', items: { type: 'string' } },
              mitre_techniques: { type: 'array', items: { type: 'string' } }
            }
          }
        });

        incident.attack_narrative = aiResult.attack_narrative;
        incident.recommended_actions = aiResult.recommended_actions || [];
        if (aiResult.mitre_techniques?.length > 0) {
          incident.mitre_techniques = [...new Set([...incident.mitre_techniques, ...aiResult.mitre_techniques])];
        }
      } catch {}
    }

    // Save high-fidelity incidents
    const savedIncidents = [];
    for (const incident of correlatedIncidents.filter(i => i.fidelity_score >= 40)) {
      try {
        const saved = await base44.asServiceRole.entities.CorrelatedIncident.create(incident);
        savedIncidents.push(saved);

        // Create notification for critical/high
        if (['critical', 'high'].includes(incident.severity)) {
          await base44.asServiceRole.entities.Notification.create({
            message: `🔗 Correlated Incident: ${incident.title} (${incident.sources_involved.length} sources)`,
            type: 'alert',
            link: '/SecurityDashboard',
            created_at: new Date().toISOString()
          });
        }
      } catch {}
    }

    return Response.json({
      success: true,
      incidents_found: correlatedIncidents.length,
      incidents_saved: savedIncidents.length,
      top_incidents: correlatedIncidents.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});