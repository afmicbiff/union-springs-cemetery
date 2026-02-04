import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ThreatFox API for malware IOCs
async function queryThreatFox(indicator) {
  try {
    const res = await fetch('https://threatfox-api.abuse.ch/api/v1/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'search_ioc', search_term: indicator })
    });
    const data = await res.json().catch(() => ({}));
    if (!data || data.query_status !== 'ok' || !Array.isArray(data.data) || data.data.length === 0) {
      return null;
    }

    const familiesSet = new Set();
    const threatTypes = new Set();
    const tags = new Set();
    let firstSeen = null;
    let lastSeen = null;
    let confidences = [];
    const samples = [];

    for (const entry of data.data) {
      if (entry.malware && entry.malware !== 'NA') familiesSet.add(entry.malware);
      if (entry.threat_type) threatTypes.add(entry.threat_type);
      if (entry.tags) entry.tags.forEach(t => tags.add(t));
      if (entry.first_seen) {
        const d = new Date(entry.first_seen);
        if (!firstSeen || d < firstSeen) firstSeen = d;
      }
      if (entry.last_seen) {
        const d = new Date(entry.last_seen);
        if (!lastSeen || d > lastSeen) lastSeen = d;
      }
      if (typeof entry.confidence_level === 'number') confidences.push(entry.confidence_level);
      if (samples.length < 5) samples.push({
        id: entry.id || entry.ioc_id,
        malware: entry.malware,
        threat_type: entry.threat_type,
        confidence: entry.confidence_level,
        first_seen: entry.first_seen,
        last_seen: entry.last_seen,
        tags: entry.tags || [],
        reference: entry.reference || 'ThreatFox'
      });
    }

    const confidence = confidences.length ? Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length) : null;

    return {
      source: 'ThreatFox',
      families: Array.from(familiesSet),
      threat_types: Array.from(threatTypes),
      tags: Array.from(tags),
      first_seen: firstSeen ? firstSeen.toISOString() : null,
      last_seen: lastSeen ? lastSeen.toISOString() : null,
      confidence,
      samples,
      report_count: data.data.length
    };
  } catch (_) {
    return null;
  }
}

// AbuseIPDB check
async function queryAbuseIPDB(ip) {
  try {
    const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`, {
      headers: { 'Key': Deno.env.get('ABUSEIPDB_API_KEY') || '', 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.data) return null;
    const d = data.data;
    if (d.totalReports === 0 && d.abuseConfidenceScore === 0) return null;
    
    return {
      source: 'AbuseIPDB',
      abuse_score: d.abuseConfidenceScore,
      total_reports: d.totalReports,
      country: d.countryCode,
      isp: d.isp,
      domain: d.domain,
      is_tor: d.isTor,
      is_public: d.isPublic,
      last_reported: d.lastReportedAt,
      usage_type: d.usageType,
      categories: (d.reports || []).slice(0, 10).flatMap(r => r.categories || [])
    };
  } catch (_) {
    return null;
  }
}

// URLhaus for malicious URLs/domains
async function queryURLhaus(indicator) {
  try {
    const res = await fetch('https://urlhaus-api.abuse.ch/v1/host/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `host=${encodeURIComponent(indicator)}`
    });
    const data = await res.json().catch(() => ({}));
    if (data.query_status !== 'ok' || !data.urls?.length) return null;

    const tagsSet = new Set();
    const threatsSet = new Set();
    data.urls.forEach(u => {
      if (u.tags) u.tags.forEach(t => tagsSet.add(t));
      if (u.threat) threatsSet.add(u.threat);
    });

    return {
      source: 'URLhaus',
      url_count: data.urlhaus_reference ? data.urls.length : 0,
      threats: Array.from(threatsSet),
      tags: Array.from(tagsSet),
      first_seen: data.firstseen,
      urlhaus_link: data.urlhaus_reference
    };
  } catch (_) {
    return null;
  }
}

// Generate mitigation recommendations based on threat data
function generateMitigations(intel) {
  const mitigations = [];
  const families = intel.threatfox?.families || [];
  const threatTypes = intel.threatfox?.threat_types || [];
  const abuseScore = intel.abuseipdb?.abuse_score || 0;
  const isTor = intel.abuseipdb?.is_tor;

  if (families.length > 0) {
    mitigations.push({
      priority: 'high',
      action: 'Block at perimeter',
      detail: `Block all traffic from this IP at firewall level. Associated with: ${families.join(', ')}`
    });
    mitigations.push({
      priority: 'high',
      action: 'Scan endpoints',
      detail: 'Run full malware scans on any endpoints that communicated with this IP'
    });
  }

  if (threatTypes.includes('botnet_cc')) {
    mitigations.push({
      priority: 'critical',
      action: 'Isolate compromised hosts',
      detail: 'This IP is associated with C&C activity. Immediately isolate any endpoints showing communication'
    });
    mitigations.push({
      priority: 'high',
      action: 'Check for persistence',
      detail: 'Review scheduled tasks, services, and registry run keys on affected systems'
    });
  }

  if (threatTypes.includes('payload_delivery')) {
    mitigations.push({
      priority: 'high',
      action: 'Block download URLs',
      detail: 'Add associated URLs to web proxy blocklist'
    });
  }

  if (abuseScore >= 75) {
    mitigations.push({
      priority: 'high',
      action: 'Implement geo-blocking',
      detail: `High abuse score (${abuseScore}%). Consider blocking entire IP range or country if not business-critical`
    });
  }

  if (isTor) {
    mitigations.push({
      priority: 'medium',
      action: 'Review Tor policy',
      detail: 'This IP is a Tor exit node. Review if Tor traffic should be allowed for your organization'
    });
  }

  if (intel.urlhaus) {
    mitigations.push({
      priority: 'high',
      action: 'Block malicious URLs',
      detail: `This host has ${intel.urlhaus.url_count} malicious URLs. Add to DNS sinkhole`
    });
  }

  if (mitigations.length === 0) {
    mitigations.push({
      priority: 'low',
      action: 'Monitor',
      detail: 'No specific threats identified. Add to watchlist for pattern analysis'
    });
  }

  return mitigations;
}

// Map threat data to MITRE ATT&CK techniques
function mapToMitre(intel) {
  const techniques = [];
  const threatTypes = intel.threatfox?.threat_types || [];
  const families = (intel.threatfox?.families || []).map(f => f.toLowerCase());

  if (threatTypes.includes('botnet_cc')) {
    techniques.push({ id: 'T1071', name: 'Application Layer Protocol', tactic: 'Command and Control' });
    techniques.push({ id: 'T1573', name: 'Encrypted Channel', tactic: 'Command and Control' });
  }
  if (threatTypes.includes('payload_delivery')) {
    techniques.push({ id: 'T1105', name: 'Ingress Tool Transfer', tactic: 'Command and Control' });
    techniques.push({ id: 'T1204', name: 'User Execution', tactic: 'Execution' });
  }
  if (families.some(f => f.includes('stealer') || f.includes('infostealer'))) {
    techniques.push({ id: 'T1555', name: 'Credentials from Password Stores', tactic: 'Credential Access' });
    techniques.push({ id: 'T1539', name: 'Steal Web Session Cookie', tactic: 'Credential Access' });
  }
  if (families.some(f => f.includes('ransomware'))) {
    techniques.push({ id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact' });
    techniques.push({ id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact' });
  }
  if (families.some(f => f.includes('rat') || f.includes('trojan'))) {
    techniques.push({ id: 'T1219', name: 'Remote Access Software', tactic: 'Command and Control' });
  }
  if (intel.abuseipdb?.is_tor) {
    techniques.push({ id: 'T1090.003', name: 'Multi-hop Proxy', tactic: 'Command and Control' });
  }

  return techniques;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    let { indicators = [], create_alerts = false, deep_lookup = false } = body || {};

    if (typeof indicators === 'string') indicators = [indicators];
    indicators = Array.isArray(indicators) ? indicators.map((v) => String(v || '').trim()).filter(Boolean) : [];
    const unique = Array.from(new Set(indicators)).slice(0, 50);

    const results = {};
    
    await Promise.all(unique.map(async (ioc) => {
      const intel = { indicator: ioc, matched: false, sources: [] };
      
      // Query ThreatFox
      const threatfox = await queryThreatFox(ioc);
      if (threatfox) {
        intel.matched = true;
        intel.threatfox = threatfox;
        intel.sources.push('ThreatFox');
      }

      // Deep lookup queries additional sources
      if (deep_lookup) {
        // Query AbuseIPDB for IPs
        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ioc)) {
          const abuseipdb = await queryAbuseIPDB(ioc);
          if (abuseipdb) {
            intel.matched = true;
            intel.abuseipdb = abuseipdb;
            intel.sources.push('AbuseIPDB');
          }
        }

        // Query URLhaus
        const urlhaus = await queryURLhaus(ioc);
        if (urlhaus) {
          intel.matched = true;
          intel.urlhaus = urlhaus;
          intel.sources.push('URLhaus');
        }
      }

      // Generate aggregated data
      if (intel.matched) {
        intel.families = intel.threatfox?.families || [];
        intel.threat_types = intel.threatfox?.threat_types || [];
        intel.confidence = intel.threatfox?.confidence || intel.abuseipdb?.abuse_score || null;
        intel.first_seen = intel.threatfox?.first_seen;
        intel.last_seen = intel.threatfox?.last_seen || intel.abuseipdb?.last_reported;
        intel.samples = intel.threatfox?.samples || [];
        
        // Add mitigations and MITRE mapping
        intel.mitigations = generateMitigations(intel);
        intel.mitre_techniques = mapToMitre(intel);
        
        // Risk score calculation
        let riskScore = 0;
        if (intel.threatfox) riskScore += 40;
        if (intel.abuseipdb?.abuse_score > 50) riskScore += 30;
        if (intel.urlhaus) riskScore += 20;
        if (intel.threatfox?.threat_types?.includes('botnet_cc')) riskScore += 20;
        if (intel.families?.some(f => f.toLowerCase().includes('ransomware'))) riskScore += 30;
        intel.risk_score = Math.min(100, riskScore);
        intel.risk_level = riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low';
      }

      results[ioc] = intel;
    }));

    const matchedIndicators = unique.filter((ioc) => results[ioc]?.matched);

    // Create alert for matches
    if (create_alerts && matchedIndicators.length > 0) {
      try {
        for (const ioc of matchedIndicators.slice(0, 5)) {
          const intel = results[ioc];
          await base44.asServiceRole.entities.SecurityEvent.create({
            event_type: 'threat_intel_match',
            severity: intel.risk_level === 'critical' ? 'critical' : intel.risk_level === 'high' ? 'high' : 'medium',
            message: `Threat intel match: ${ioc} - ${intel.families?.join(', ') || 'Unknown threat'}`,
            ip_address: /^(?:\d{1,3}\.){3}\d{1,3}$/.test(ioc) ? ioc : null,
            details: {
              indicator: ioc,
              sources: intel.sources,
              families: intel.families,
              risk_score: intel.risk_score,
              mitre_techniques: intel.mitre_techniques?.map(t => t.id)
            }
          });
        }
      } catch (_) {}
    }

    return Response.json({ 
      results, 
      matched_count: matchedIndicators.length,
      deep_lookup_used: deep_lookup
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});