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
    const samples = [];

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
      if (samples.length < 5) samples.push({
        id: entry.id || entry.ioc_id,
        malware: entry.malware,
        threat_type: entry.threat_type,
        confidence: entry.confidence_level,
        first_seen: entry.first_seen,
        last_seen: entry.last_seen,
        reference: 'ThreatFox'
      });
    }

    const confidence = confidences.length ? Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length) : null;

    return {
      matched: true,
      source: 'ThreatFox',
      families: Array.from(familiesSet),
      first_seen: firstSeen ? firstSeen.toISOString() : null,
      last_seen: lastSeen ? lastSeen.toISOString() : null,
      confidence,
      samples
    };
  } catch (_) {
    return { matched: false, error: 'lookup_failed' };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    let { indicators = [], create_alerts = false } = body || {};

    if (typeof indicators === 'string') indicators = [indicators];
    indicators = Array.isArray(indicators) ? indicators.map((v) => String(v || '').trim()).filter(Boolean) : [];
    // dedupe and cap to 100 to be nice to the public API
    const unique = Array.from(new Set(indicators)).slice(0, 100);

    const results = {};
    await Promise.all(unique.map(async (ioc) => {
      results[ioc] = await queryThreatFox(ioc);
    }));

    const matchedIndicators = unique.filter((ioc) => results[ioc]?.matched);

    // Optionally create a high-severity security event if there are matches and the caller asked for it
    if (create_alerts && matchedIndicators.length > 0 && user.role === 'admin') {
      try {
        await base44.asServiceRole.entities.SecurityEvent.create({
          event_type: 'threat_intel_match',
          severity: 'critical',
          message: `Threat intel matches detected for ${matchedIndicators.length} indicator(s)`,
          details: { matched: matchedIndicators, results_source: 'ThreatFox' }
        });
      } catch (_) {}
    }

    return Response.json({ results, matched_count: matchedIndicators.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});