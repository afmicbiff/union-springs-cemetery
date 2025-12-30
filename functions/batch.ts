import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ct = (req.headers.get('content-type') || '').toLowerCase();
    const body = ct.includes('application/json') ? await req.json() : JSON.parse((await req.text()) || '{}');

    const calls = Array.isArray(body?.calls) ? body.calls : null;
    if (!calls) return Response.json({ error: 'Invalid payload' }, { status: 400 });

    const allowed = new Set(['/api/dashboard', '/api/data', '/api/notifications']);

    const results = await Promise.all(
      calls.map(async (c) => {
        try {
          if (!c || !allowed.has(c.path)) return { ok: false, status: 400, data: { error: 'Blocked' } };

          if (c.path === '/api/data') {
            const data = await getDataWithFieldsAndPagination(c.query || {});
            return { ok: true, status: 200, data };
          }
          if (c.path === '/api/dashboard') {
            const data = await getDashboard(c.query || {});
            return { ok: true, status: 200, data };
          }
          if (c.path === '/api/notifications') {
            const data = await getNotifications(c.query || {});
            return { ok: true, status: 200, data };
          }
          return { ok: false, status: 404, data: { error: 'Not found' } };
        } catch (_) {
          return { ok: false, status: 500, data: { error: 'Server error' } };
        }
      })
    );

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});

async function getDataWithFieldsAndPagination(query) {
  const fields = String(query.fields || 'id,name').split(',').map((s) => s.trim());
  const limit = Math.min(Number(query.limit || 10), 50);
  const cursor = query.cursor ? String(query.cursor) : null;

  const items = fakeDbFetch({ fields, limit, cursor });
  return {
    items,
    nextCursor: items.length === limit ? items[items.length - 1].id : null,
  };
}

function fakeDbFetch({ fields, limit }) {
  const all = Array.from({ length: limit }, (_, i) => ({ id: `id_${i}`, name: `Name ${i}`, extra: 'drop-me' }));
  return all.map((row) => {
    const out = {};
    fields.forEach((f) => {
      if (f in row) out[f] = row[f];
    });
    return out;
  });
}

async function getDashboard() {
  return { summary: { ok: true }, items: [] };
}
async function getNotifications() {
  return { items: [] };
}