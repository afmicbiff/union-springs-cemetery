import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function canonicalA1NumberFromNewPlot(row) {
  // 1) Prefer explicit row labels like "A-1xx" or "A1xx"
  const rowUpRaw = String(row.row_number || '').toUpperCase();
  const rowUp = rowUpRaw.replace(/[^A-Z0-9]/g, ''); // A-101 -> A101
  let mr = rowUp.match(/A1(\d{2})/);
  if (mr) {
    const d = parseInt(mr[1], 10);
    if (d >= 1 && d <= 32) return 100 + d; // 01..32 -> 101..132
  }

  // 2) Analyze plot_number text
  const pnRaw = String(row.plot_number || '').toUpperCase();
  const pn = pnRaw.replace(/\s+/g, '');

  // Patterns like A1-07, A107, A1 7
  if (pn.startsWith('A1')) {
    const after = pn.slice(2);
    const m = after.match(/(\d{1,3})/);
    if (m) {
      const d = parseInt(m[1], 10);
      if (d >= 100 && d <= 999) return d; // A110 -> 110
      if (d >= 1 && d <= 32) return 100 + d; // A1-07 -> 107
    }
  }

  // 3) Handle numeric encodings (e.g., 1103 meaning 103, 1180 meaning 118)
  const four = pn.match(/^(\d{4})$/);
  if (four) {
    const val = parseInt(four[1], 10);
    if (val >= 1101 && val <= 1132) return 100 + (val % 100); // 1103 -> 103
    if (val >= 1180 && val <= 1199) return 100 + (val % 100); // 1180 -> 180 -> 118
    if (val >= 1250 && val <= 1299) return 100 + (val % 100); // 1257 -> 157 -> 125
    if (val >= 1260 && val <= 1299) return 100 + (val % 100); // 1260 -> 160 -> 120
  }

  // 4) Fallback to first 3-digit group (e.g., 101)
  const m3 = pn.match(/(\d{3})/);
  if (m3) return parseInt(m3[1], 10);

  // 5) Then try 1-2 digits and map to 100+
  const m2 = pn.match(/(\d{1,2})/);
  if (m2) {
    const d2 = parseInt(m2[1], 10);
    if (d2 >= 1 && d2 <= 32) return 100 + d2;
  }

  return NaN;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    // Load NewPlot rows (large upper bound to cover imports)
    const rows = await base44.asServiceRole.entities.NewPlot.list(null, 20000);

    // Determine which rows are A-1 labeled but not within canonical range 101-132
    const toDelete = [];
    for (const r of rows) {
      const rowNorm = String(r.row_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const pnUp = String(r.plot_number || '').toUpperCase().replace(/\s+/g, '');
      const isA1Labeled = rowNorm.includes('A1') || pnUp.startsWith('A1');
      const cn = canonicalA1NumberFromNewPlot(r);
      const outsideRange = isNaN(cn) || cn < 101 || cn > 132;

      // If it looks like it's meant for A-1 but can't be placed in 101–132, mark for deletion
      if (isA1Labeled && outsideRange) {
        toDelete.push(r);
        continue;
      }

      // Additionally, catch encodings like 1334, 1335... with A-12x rows that imply A-1 but not valid
      const digits = parseInt(String(r.plot_number || '').replace(/\D/g, ''), 10);
      if (!isNaN(digits) && digits >= 133 && digits <= 199) {
        // Only if row suggests A-section proximity (e.g., A-12x)
        if (/^A1\d{2}/.test(rowNorm)) {
          toDelete.push(r);
        }
      }
    }

    let deleted = 0;
    const deletedIds = [];
    for (const r of toDelete) {
      await base44.asServiceRole.entities.NewPlot.delete(r.id);
      deleted++;
      deletedIds.push(r.id);
    }

    return Response.json({
      message: `Deleted ${deleted} A-1 labeled but not placed NewPlot row(s)`,
      deleted_count: deleted,
      deleted_ids: deletedIds,
      sample_labels: toDelete.slice(0, 10).map(r => ({ plot_number: r.plot_number, row_number: r.row_number }))
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});