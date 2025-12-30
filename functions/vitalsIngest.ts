import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch (_) {
      const txt = await req.text();
      try { body = JSON.parse(txt || '{}'); } catch { body = {}; }
    }

    const ua = req.headers.get('user-agent') || '';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';

    const record = {
      name: String(body.name || ''),
      value: typeof body.value === 'number' ? body.value : Number(body.value || 0),
      rating: String(body.rating || ''),
      vital_id: String(body.id || ''),
      navigation_type: String(body.navigationType || ''),
      url: String(body.url || ''),
      timestamp: new Date(body.ts ? Number(body.ts) : Date.now()).toISOString(),
      ip_address: String(ip),
      user_agent: String(ua)
    };

    if (!record.name || !Number.isFinite(record.value)) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Store using service role to allow unauthenticated beacons
    await base44.asServiceRole.entities.WebVital.create(record);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});