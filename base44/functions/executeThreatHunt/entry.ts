import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SEVERITY_ORDER = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

function matchesFilter(value, operator, filterValue) {
  if (value === null || value === undefined) return false;
  const strVal = String(value).toLowerCase();
  const filterStr = String(filterValue).toLowerCase();
  
  switch (operator) {
    case 'equals': return strVal === filterStr;
    case 'not_equals': return strVal !== filterStr;
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { hunt_id, run_anomaly_detection = false } = await req.json();
    if (!hunt_id) return Response.json({ error: 'hunt_id required' }, { status: 400 });

    const hunts = await base44.asServiceRole.entities.ThreatHunt.filter({ id: hunt_id });
    const hunt = hunts[0];
    if (!hunt) return Response.json({ error: 'Hunt not found' }, { status: 404 });

    const config = hunt.query_config || {};
    const timeRangeMs = (config.time_range_hours || 24) * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - timeRangeMs).toISOString();
    const findings = [];

    // Fetch data based on source
    let secEvents = [];
    let endpoints = [];
    let endpointEvents = [];

    if (['security_events', 'all'].includes(config.data_source)) {
      secEvents = await base44.asServiceRole.entities.SecurityEvent.list('-created_date', 1000);
      secEvents = secEvents.filter(e => e.created_date >= cutoff);
    }
    if (['endpoints', 'all'].includes(config.data_source)) {
      endpoints = await base44.asServiceRole.entities.Endpoint.list('-updated_date', 500);
    }
    if (['endpoint_events', 'all'].includes(config.data_source)) {
      endpointEvents = await base44.asServiceRole.entities.EndpointEvent.list('-timestamp', 1000);
      endpointEvents = endpointEvents.filter(e => e.timestamp >= cutoff);
    }

    // Apply filters to security events
    if (config.filters?.length > 0) {
      for (const filter of config.filters) {
        const matchedEvents = secEvents.filter(e => matchesFilter(getNestedValue(e, filter.field), filter.operator, filter.value));
        if (matchedEvents.length > 0) {
          findings.push({
            finding_type: 'query_match',
            severity: matchedEvents.some(e => e.severity === 'critical') ? 'critical' : 
                     matchedEvents.some(e => e.severity === 'high') ? 'high' : 'medium',
            title: `Filter match: ${filter.field} ${filter.operator} ${filter.value}`,
            description: `Found ${matchedEvents.length} events matching the filter criteria`,
            evidence: {
              matched_events: matchedEvents.slice(0, 20).map(e => e.id),
              filter_used: filter
            },
            related_ips: [...new Set(matchedEvents.map(e => e.ip_address).filter(Boolean))].slice(0, 10),
            related_users: [...new Set(matchedEvents.map(e => e.user_email).filter(Boolean))].slice(0, 10)
          });
        }
      }
    }

    // Keyword search
    if (config.keywords?.length > 0) {
      for (const keyword of config.keywords) {
        const kw = keyword.toLowerCase();
        const matchedEvents = secEvents.filter(e => 
          (e.message || '').toLowerCase().includes(kw) ||
          (e.event_type || '').toLowerCase().includes(kw)
        );
        if (matchedEvents.length > 0) {
          findings.push({
            finding_type: 'query_match',
            severity: 'medium',
            title: `Keyword match: "${keyword}"`,
            description: `Found ${matchedEvents.length} events containing the keyword`,
            evidence: { matched_events: matchedEvents.slice(0, 20).map(e => e.id) },
            related_ips: [...new Set(matchedEvents.map(e => e.ip_address).filter(Boolean))].slice(0, 10)
          });
        }
      }
    }

    // Severity filter
    if (config.severity_min) {
      const minOrder = SEVERITY_ORDER[config.severity_min] || 0;
      const highSevEvents = secEvents.filter(e => (SEVERITY_ORDER[e.severity] || 0) >= minOrder);
      if (highSevEvents.length > 0) {
        findings.push({
          finding_type: 'query_match',
          severity: config.severity_min,
          title: `Events at or above ${config.severity_min} severity`,
          description: `Found ${highSevEvents.length} events meeting severity threshold`,
          evidence: { matched_events: highSevEvents.slice(0, 20).map(e => e.id) },
          related_ips: [...new Set(highSevEvents.map(e => e.ip_address).filter(Boolean))].slice(0, 10)
        });
      }
    }

    // Anomaly Detection
    if (run_anomaly_detection || hunt.hunt_type === 'anomaly_detection') {
      const anomalyConfig = hunt.anomaly_config || {};
      const threshold = anomalyConfig.deviation_threshold || 2.0;

      // Event volume anomaly - group by hour
      const hourlyVolume = {};
      secEvents.forEach(e => {
        const hour = new Date(e.created_date).toISOString().slice(0, 13);
        hourlyVolume[hour] = (hourlyVolume[hour] || 0) + 1;
      });
      const volumes = Object.values(hourlyVolume);
      if (volumes.length > 3) {
        const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const stdDev = Math.sqrt(volumes.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / volumes.length);
        
        Object.entries(hourlyVolume).forEach(([hour, count]) => {
          const zScore = stdDev > 0 ? (count - mean) / stdDev : 0;
          if (Math.abs(zScore) > threshold) {
            findings.push({
              finding_type: 'anomaly',
              severity: zScore > 3 ? 'high' : 'medium',
              title: `Volume anomaly detected at ${hour}`,
              description: `Event volume (${count}) deviates significantly from baseline (avg: ${mean.toFixed(1)})`,
              evidence: {
                baseline_value: mean,
                observed_value: count,
                deviation_score: zScore,
                anomaly_details: { hour, stdDev }
              }
            });
          }
        });
      }

      // IP frequency anomaly
      const ipCounts = {};
      secEvents.forEach(e => {
        if (e.ip_address) ipCounts[e.ip_address] = (ipCounts[e.ip_address] || 0) + 1;
      });
      const ipFreqs = Object.values(ipCounts);
      if (ipFreqs.length > 5) {
        const ipMean = ipFreqs.reduce((a, b) => a + b, 0) / ipFreqs.length;
        const ipStdDev = Math.sqrt(ipFreqs.reduce((sum, v) => sum + Math.pow(v - ipMean, 2), 0) / ipFreqs.length);
        
        Object.entries(ipCounts).forEach(([ip, count]) => {
          const zScore = ipStdDev > 0 ? (count - ipMean) / ipStdDev : 0;
          if (zScore > threshold) {
            findings.push({
              finding_type: 'anomaly',
              severity: zScore > 4 ? 'high' : 'medium',
              title: `Unusual activity from IP: ${ip}`,
              description: `This IP generated ${count} events, significantly above average (${ipMean.toFixed(1)})`,
              evidence: {
                baseline_value: ipMean,
                observed_value: count,
                deviation_score: zScore
              },
              related_ips: [ip]
            });
          }
        });
      }

      // Endpoint posture anomalies
      const compromisedEndpoints = endpoints.filter(e => e.security_posture === 'compromised');
      const atRiskEndpoints = endpoints.filter(e => e.security_posture === 'at_risk');
      
      if (compromisedEndpoints.length > 0) {
        findings.push({
          finding_type: 'behavior_deviation',
          severity: 'critical',
          title: `${compromisedEndpoints.length} compromised endpoint(s) detected`,
          description: 'Endpoints with compromised security posture require immediate investigation',
          evidence: { matched_endpoints: compromisedEndpoints.map(e => e.id) },
          related_ips: compromisedEndpoints.map(e => e.last_ip).filter(Boolean)
        });
      }

      if (atRiskEndpoints.length > endpoints.length * 0.3 && atRiskEndpoints.length > 2) {
        findings.push({
          finding_type: 'anomaly',
          severity: 'high',
          title: `High percentage of at-risk endpoints`,
          description: `${atRiskEndpoints.length} of ${endpoints.length} endpoints (${((atRiskEndpoints.length/endpoints.length)*100).toFixed(0)}%) are at risk`,
          evidence: { matched_endpoints: atRiskEndpoints.slice(0, 10).map(e => e.id) }
        });
      }
    }

    // AI Analysis for significant findings
    if (findings.length > 0 && findings.some(f => ['high', 'critical'].includes(f.severity))) {
      try {
        const topFindings = findings.filter(f => ['high', 'critical'].includes(f.severity)).slice(0, 5);
        const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analyze these threat hunting findings and provide security insights:

Hunt: ${hunt.name}
Hypothesis: ${hunt.hypothesis}

Findings:
${topFindings.map((f, i) => `${i+1}. [${f.severity}] ${f.title}: ${f.description}`).join('\n')}

Provide risk assessment, potential attack scenarios, and recommended investigation steps.`,
          response_json_schema: {
            type: 'object',
            properties: {
              risk_assessment: { type: 'string' },
              attack_scenarios: { type: 'array', items: { type: 'string' } },
              recommended_actions: { type: 'array', items: { type: 'string' } },
              mitre_techniques: { type: 'array', items: { type: 'string' } },
              confidence: { type: 'number' }
            }
          }
        });

        findings.push({
          finding_type: 'ai_insight',
          severity: 'high',
          title: 'AI Threat Analysis',
          description: aiResult.risk_assessment,
          ai_analysis: {
            risk_assessment: aiResult.risk_assessment,
            recommended_actions: aiResult.recommended_actions,
            confidence: aiResult.confidence || 75
          },
          mitre_techniques: aiResult.mitre_techniques || []
        });
      } catch {}
    }

    // Save findings
    const now = new Date().toISOString();
    for (const finding of findings) {
      await base44.asServiceRole.entities.HuntFinding.create({
        hunt_id: hunt.id,
        hunt_name: hunt.name,
        ...finding
      });
    }

    // Update hunt
    await base44.asServiceRole.entities.ThreatHunt.update(hunt.id, {
      last_run: now,
      findings_count: (hunt.findings_count || 0) + findings.length,
      status: 'active'
    });

    return Response.json({ 
      success: true, 
      findings_count: findings.length,
      findings: findings.slice(0, 20)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});