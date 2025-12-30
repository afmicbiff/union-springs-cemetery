import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    // Auth optional for vitals; accept anonymous for broader coverage
    let payload = {};
    const ct = (req.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) payload = await req.json();
    else {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    }

    console.log('web-vitals', {
      name: payload?.name,
      value: payload?.value,
      rating: payload?.rating,
      url: payload?.url,
      ts: payload?.ts || Date.now(),
    });

    // Optionally persist using WebVital entity if available
    try {
      if (payload?.name && typeof payload?.value !== 'undefined') {
        await base44.asServiceRole.entities.WebVital.create({
          name: payload.name,
          value: Number(payload.value),
          rating: payload.rating || null,
          vital_id: payload.id || null,
          navigation_type: payload.navigationType || null,
          url: payload.url || null,
          timestamp: new Date().toISOString(),
          user_agent: req.headers.get('user-agent') || null,
        });
      }
    } catch (_) { /* ignore persistence issues */ }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});