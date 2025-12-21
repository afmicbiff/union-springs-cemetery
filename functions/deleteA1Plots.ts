import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function isA1Plot(plot) {
  const pnRaw = String(plot.plot_number || '');
  const pnUp = pnRaw.toUpperCase().replace(/\s+/g, '');
  const digitsStr = pnUp.replace(/\D/g, '');
  const digits = digitsStr ? parseInt(digitsStr, 10) : NaN;
  const rowUp = String(plot.row_number || '').toUpperCase();

  // Numeric ranges that correspond to A-1 in different encodings
  const in101to132 = !isNaN(digits) && digits >= 101 && digits <= 132;
  const in1101to1132 = !isNaN(digits) && digits >= 1101 && digits <= 1132; // sometimes encoded as 1101 -> 101

  // Label-based checks
  const startsWithA1 = pnUp.startsWith('A1');
  const rowHasA1 = rowUp.includes('A-1') || rowUp.includes('A1');

  // Also treat simple 1..32 as A-1 in some datasets (map to 101..132)
  const in1to32 = !isNaN(digits) && digits >= 1 && digits <= 32;

  return in101to132 || in1101to1132 || startsWithA1 || rowHasA1 || in1to32;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });
    }

    // Fetch plots (use a generous cap; adjust if needed)
    const plots = await base44.asServiceRole.entities.Plot.list(null, 10000);

    const toDelete = plots.filter(isA1Plot);

    for (const p of toDelete) {
      await base44.asServiceRole.entities.Plot.delete(p.id);
    }

    return Response.json({
      message: `Deleted ${toDelete.length} A-1 plot(s)`,
      deleted_count: toDelete.length,
      deleted_ids: toDelete.map((p) => p.id),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});