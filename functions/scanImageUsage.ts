import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const imageId = body?.image_id;
    if (!imageId) {
      return Response.json({ error: 'image_id is required' }, { status: 400 });
    }

    // Load the image to get its URLs
    const imgs = await base44.entities.Image.filter({ id: imageId }, undefined, 1);
    const img = Array.isArray(imgs) ? imgs[0] : null;
    if (!img) return Response.json({ matches: [] });

    const urls = [img.original_url, img.jpeg_url, img.webp_url].filter(Boolean);

    // Helper to scan a collection client-side (equality match on known fields)
    async function scanPlots() {
      const list = await base44.entities.Plot.list('-updated_date', 2000);
      const matches = [];
      for (const p of list) {
        const fields = ['photo_url', 'photo_url_small', 'photo_url_medium', 'photo_url_large'];
        const hit = fields.filter((f) => urls.includes(p[f] || ''));
        if (hit.length) {
          matches.push({ entity: 'Plot', id: p.id, label: p.plot_number || p.row_number || '', fields: hit });
        }
      }
      return matches;
    }

    async function scanDeceased() {
      const list = await base44.entities.Deceased.list('-updated_date', 2000);
      const matches = [];
      for (const d of list) {
        const fields = ['image_url'];
        const hit = fields.filter((f) => urls.includes(d[f] || ''));
        if (hit.length) {
          matches.push({ entity: 'Deceased', id: d.id, label: `${d.first_name || ''} ${d.last_name || ''}`.trim(), fields: hit });
        }
      }
      return matches;
    }

    const [plots, deceased] = await Promise.all([scanPlots(), scanDeceased()]);

    return Response.json({ matches: [...plots, ...deceased] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});