import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const IOC_MITRE_MAP = {
  ip: [
    { id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' },
    { id: 'T1090', name: 'Proxy', tactic: 'Command and Control' }
  ],
  domain: [
    { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' },
    { id: 'T1568', name: 'Dynamic Resolution', tactic: 'Command and Control' }
  ],
  hash: [
    { id: 'T1204', name: 'User Execution', tactic: 'Execution' },
    { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'Execution' }
  ],
  url: [
    { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'Initial Access' },
    { id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' }
  ]
};

function detectIOCType(ioc) {
  if (/^[a-f0-9]{32}$/i.test(ioc)) return 'hash_md5';
  if (/^[a-f0-9]{40}$/i.test(ioc)) return 'hash_sha1';
  if (/^[a-f0-9]{64}$/i.test(ioc)) return 'hash_sha256';
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ioc)) return 'ip';
  if (/^https?:\/\//i.test(ioc)) return 'url';
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(ioc)) return 'domain';
  return 'unknown';
}

function searchInObject(obj, searchValue, path = '') {
  const matches = [];
  const lowerSearch = searchValue.toLowerCase();
  
  for (const [key, value] of Object.entries(obj || {})) {
    const currentPath = path ? `${path}.${key}` : key;
    if (value === null || value === undefined) continue;
    
    if (typeof value === 'string') {
      if (value.toLowerCase().includes(lowerSearch)) {
        matches.push({ field: currentPath, value: value.slice(0, 200) });
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      matches.push(...searchInObject(value, searchValue, currentPath));
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => {
        if (typeof item === 'string' && item.toLowerCase().includes(lowerSearch)) {
          matches.push({ field: `${currentPath}[${idx}]`, value: item.slice(0, 200) });
        } else if (typeof item === 'object') {
          matches.push(...searchInObject(item, searchValue, `${currentPath}[${idx}]`));
        }
      });
    }
  }
  return matches;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { iocs = [], hunt_id, hunt_name = 'IOC Sweep', time_range_hours = 72 } = await req.json();
    
    if (!iocs.length) return Response.json({ error: 'No IOCs provided' }, { status: 400 });

    // Parse and dedupe IOCs
    const parsedIOCs = [...new Set(iocs.map(i => String(i).trim().toLowerCase()).filter(Boolean))].slice(0, 100);
    const cutoffTime = new Date(Date.now() - time_range_hours * 60 * 60 * 1000).toISOString();

    // Fetch data sources
    const [secEvents, endpointEvents, endpoints] = await Promise.all([
      base44.asServiceRole.entities.SecurityEvent.list('-created_date', 1000),
      base44.asServiceRole.entities.EndpointEvent.list('-timestamp', 1000),
      base44.asServiceRole.entities.Endpoint.list('-updated_date', 500)
    ]);

    const recentSecEvents = secEvents.filter(e => e.created_date >= cutoffTime);
    const recentEndpointEvents = endpointEvents.filter(e => e.timestamp >= cutoffTime);

    const findings = [];
    const now = new Date().toISOString();

    // Query threat intel for IPs/domains
    const ipsAndDomains = parsedIOCs.filter(i => ['ip', 'domain'].includes(detectIOCType(i)));
    let threatIntelMap = {};
    if (ipsAndDomains.length > 0) {
      try {
        const res = await base44.asServiceRole.functions.invoke('threatIntelLookup', { 
          indicators: ipsAndDomains.slice(0, 30), 
          deep_lookup: true 
        });
        threatIntelMap = res?.data?.results || {};
      } catch {}
    }

    for (const ioc of parsedIOCs) {
      const iocType = detectIOCType(ioc);
      const matchedEvents = [];
      const matchedEndpointEvents = [];
      const matchedEndpoints = [];
      const evidenceDetails = [];

      // Search Security Events
      for (const event of recentSecEvents) {
        const matches = [];
        
        // Direct field matches
        if (iocType === 'ip' && event.ip_address?.toLowerCase() === ioc) {
          matches.push({ field: 'ip_address', value: event.ip_address });
        }
        if (event.message?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'message', value: event.message.slice(0, 200) });
        }
        if (event.route?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'route', value: event.route });
        }
        if (event.user_agent?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'user_agent', value: event.user_agent.slice(0, 200) });
        }
        
        // Deep search in details
        if (event.details) {
          matches.push(...searchInObject(event.details, ioc, 'details'));
        }

        if (matches.length > 0) {
          matchedEvents.push(event);
          evidenceDetails.push({
            source: 'security_events',
            event_id: event.id,
            event_type: event.event_type,
            severity: event.severity,
            timestamp: event.created_date,
            matches
          });
        }
      }

      // Search Endpoint Events
      for (const event of recentEndpointEvents) {
        const matches = [];
        
        if (event.remote_ip?.toLowerCase() === ioc) {
          matches.push({ field: 'remote_ip', value: event.remote_ip });
        }
        if (event.process_name?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'process_name', value: event.process_name });
        }
        if (event.process_path?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'process_path', value: event.process_path });
        }
        if (event.file_path?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'file_path', value: event.file_path });
        }
        if (event.hash?.toLowerCase() === ioc) {
          matches.push({ field: 'hash', value: event.hash });
        }
        if (event.description?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'description', value: event.description.slice(0, 200) });
        }
        if (event.details) {
          matches.push(...searchInObject(event.details, ioc, 'details'));
        }

        if (matches.length > 0) {
          matchedEndpointEvents.push(event);
          evidenceDetails.push({
            source: 'endpoint_events',
            event_id: event.id,
            event_type: event.type,
            severity: event.severity,
            timestamp: event.timestamp,
            endpoint_id: event.endpoint_id,
            matches
          });
        }
      }

      // Search Endpoints
      for (const ep of endpoints) {
        const matches = [];
        
        if (ep.last_ip?.toLowerCase() === ioc) {
          matches.push({ field: 'last_ip', value: ep.last_ip });
        }
        if (ep.hostname?.toLowerCase().includes(ioc)) {
          matches.push({ field: 'hostname', value: ep.hostname });
        }
        
        // Search in arrays
        ep.suspicious_processes?.forEach((p, i) => {
          if (p.path?.toLowerCase().includes(ioc) || p.name?.toLowerCase().includes(ioc)) {
            matches.push({ field: `suspicious_processes[${i}]`, value: `${p.name}: ${p.path}` });
          }
        });
        ep.network_connections?.forEach((c, i) => {
          if (c.remote_ip?.toLowerCase() === ioc) {
            matches.push({ field: `network_connections[${i}].remote_ip`, value: c.remote_ip });
          }
        });
        ep.vulnerabilities?.forEach((v, i) => {
          if (v.cve_id?.toLowerCase() === ioc) {
            matches.push({ field: `vulnerabilities[${i}].cve_id`, value: v.cve_id });
          }
        });
        ep.installed_software?.forEach((s, i) => {
          if (s.name?.toLowerCase().includes(ioc)) {
            matches.push({ field: `installed_software[${i}]`, value: s.name });
          }
        });

        if (matches.length > 0) {
          matchedEndpoints.push(ep);
          evidenceDetails.push({
            source: 'endpoints',
            endpoint_id: ep.id,
            hostname: ep.hostname,
            security_posture: ep.security_posture,
            matches
          });
        }
      }

      // Create finding if matches found
      const totalMatches = matchedEvents.length + matchedEndpointEvents.length + matchedEndpoints.length;
      if (totalMatches === 0) continue;

      // Determine severity
      const threatIntel = threatIntelMap[ioc];
      let severity = 'medium';
      if (threatIntel?.matched) severity = threatIntel.risk_level === 'critical' ? 'critical' : 'high';
      else if (iocType.startsWith('hash')) severity = 'high';
      else if (matchedEvents.some(e => ['high', 'critical'].includes(e.severity))) severity = 'high';

      // Get MITRE techniques
      const baseType = iocType.startsWith('hash') ? 'hash' : iocType;
      const mitreTechniques = IOC_MITRE_MAP[baseType] || [];

      findings.push({
        hunt_id: hunt_id || null,
        hunt_name,
        finding_type: 'ioc_match',
        severity,
        title: `IOC Match: ${ioc}`,
        description: `Found ${totalMatches} match(es) for ${iocType} indicator "${ioc}" across ${new Set(evidenceDetails.map(e => e.source)).size} data source(s)`,
        evidence: {
          ioc,
          ioc_type: iocType,
          matched_events: matchedEvents.slice(0, 20).map(e => e.id),
          matched_endpoint_events: matchedEndpointEvents.slice(0, 20).map(e => e.id),
          matched_endpoints: matchedEndpoints.map(e => e.id),
          details: evidenceDetails.slice(0, 30),
          threat_intel: threatIntel?.matched ? {
            risk_score: threatIntel.risk_score,
            families: threatIntel.families,
            sources: threatIntel.sources
          } : null
        },
        related_ips: [...new Set([
          ...matchedEvents.map(e => e.ip_address),
          ...matchedEndpointEvents.map(e => e.remote_ip),
          ...matchedEndpoints.map(e => e.last_ip),
          ...(iocType === 'ip' ? [ioc] : [])
        ].filter(Boolean))],
        related_users: [...new Set(matchedEvents.map(e => e.user_email).filter(Boolean))],
        mitre_techniques: mitreTechniques.map(t => t.id),
        ai_analysis: threatIntel?.matched ? {
          risk_assessment: `This indicator has been flagged by threat intelligence sources: ${threatIntel.sources?.join(', ')}. Associated malware families: ${threatIntel.families?.join(', ') || 'Unknown'}.`,
          recommended_actions: threatIntel.mitigations?.slice(0, 3).map(m => m.action + ': ' + m.detail) || [],
          confidence: threatIntel.risk_score || 70
        } : null
      });
    }

    // Save findings
    const savedFindings = [];
    for (const finding of findings) {
      try {
        const saved = await base44.asServiceRole.entities.HuntFinding.create(finding);
        savedFindings.push(saved);
      } catch {}
    }

    // Update hunt if provided
    if (hunt_id) {
      try {
        const hunts = await base44.asServiceRole.entities.ThreatHunt.filter({ id: hunt_id });
        if (hunts[0]) {
          await base44.asServiceRole.entities.ThreatHunt.update(hunt_id, {
            last_run: now,
            findings_count: (hunts[0].findings_count || 0) + savedFindings.length,
            status: 'active'
          });
        }
      } catch {}
    }

    // Create notification for critical findings
    const criticalFindings = findings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      await base44.asServiceRole.entities.Notification.create({
        message: `🎯 IOC Sweep: ${criticalFindings.length} critical IOC match(es) found`,
        type: 'alert',
        link: '/SecurityDashboard',
        created_at: now
      });
    }

    return Response.json({
      success: true,
      iocs_scanned: parsedIOCs.length,
      findings_count: findings.length,
      findings_saved: savedFindings.length,
      findings: findings.slice(0, 20)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});