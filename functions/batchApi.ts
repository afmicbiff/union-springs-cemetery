import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ct = (req.headers.get('content-type') || '').toLowerCase();
    let payload;
    if (ct.includes('application/json')) {
      payload = await req.json();
    } else {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    }

    const calls = Array.isArray(payload?.calls) ? payload.calls : null;
    if (!calls) {
      return Response.json({ error: 'Invalid payload: calls[] required' }, { status: 400 });
    }

    const pick = (obj, fields) => {
      if (!Array.isArray(fields) || fields.length === 0) return obj;
      const out = {};
      for (const f of fields) {
        if (obj && Object.prototype.hasOwnProperty.call(obj, f)) out[f] = obj[f];
      }
      return out;
    };

    const handle = async (c) => {
      try {
        if (c?.type === 'entity') {
          const entity = c.entity;
          const op = String(c.op || 'list').toLowerCase();
          const args = c.args || {};

          if (!entity || !base44.entities?.[entity]) throw new Error('Unknown entity');

          let data;
          if (op === 'list') {
            data = await base44.entities[entity].list(args.sort || '-updated_date', args.limit ?? 50);
          } else if (op === 'filter') {
            data = await base44.entities[entity].filter(args.filter || {}, args.sort || '-updated_date', args.limit ?? 50);
          } else {
            throw new Error(`Unsupported entity op: ${c.op}`);
          }

          const arr = Array.isArray(data) ? data : [];
          const projected = Array.isArray(args.select) && args.select.length > 0
            ? arr.map((r) => pick(r, args.select))
            : arr;
          return { ok: true, data: projected };
        }

        if (c?.type === 'function') {
          const name = c.name;
          if (!name) throw new Error('Function name required');
          const params = c.params || {};
          const resp = await base44.functions.invoke(name, params);
          return { ok: true, data: resp.data };
        }

        throw new Error('Unsupported call type');
      } catch (e) {
        return { ok: false, error: e?.message || 'Unknown error' };
      }
    };

    const results = await Promise.all(calls.map(handle));
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
});