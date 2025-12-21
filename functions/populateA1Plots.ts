import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

function canonicalA1NumberFromNewPlot(row) {
  const pnRaw = String(row.plot_number || '').toUpperCase();
  const pn = pnRaw.replace(/\s+/g, '');
  // If label starts with A1, try to derive canonical 101-132
  if (pn.startsWith('A1')) {
    const after = pn.slice(2);
    const m = after.match(/(\d{1,3})/);
    if (m) {
      const d = parseInt(m[1], 10);
      if (d >= 100 && d <= 999) return d; // A110, A111 etc
      if (d >= 1 && d <= 32) return 100 + d; // A1-07 => 107
    }
  }
  // Try a 3-digit group first (e.g., 101)
  const m3 = pn.match(/(\d{3})/);
  if (m3) return parseInt(m3[1], 10);
  // Then try 1-2 digits and map to 100+
  const m2 = pn.match(/(\d{1,2})/);
  if (m2) {
    const d2 = parseInt(m2[1], 10);
    if (d2 >= 1 && d2 <= 32) return 100 + d2;
  }
  // Fallback to row number like A1xx
  const rn = String(row.row_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const mr = rn.match(/A1(\d{1,2})/);
  if (mr) return 100 + parseInt(mr[1], 10);
  return NaN;
}

function scoreCandidate(r) {
  const statusWeights = { Occupied: 3, Veteran: 3, Reserved: 2, Available: 1, Unknown: 0 };
  let s = 0;
  if (r.first_name) s += 1;
  if (r.last_name) s += 1;
  if (r.family_name) s += 1;
  if (r.birth_date) s += 1;
  if (r.death_date) s += 1;
  s += statusWeights[r.status] || 0;
  return s;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    // 1) Load existing Plot records and collect which A-1 numbers already exist
    const existingPlots = await base44.asServiceRole.entities.Plot.list(null, 20000);
    const existingSet = new Set();
    for (const p of existingPlots) {
      const digits = parseInt(String(p.plot_number || '').replace(/\D/g, ''), 10);
      const rowUp = String(p.row_number || '').toUpperCase();
      if (!isNaN(digits) && digits >= 101 && digits <= 132) {
        // Consider it A-1 only if row suggests "A-" (to avoid collisions with other sections)
        if (rowUp.startsWith('A-') || rowUp.includes('A-1')) {
          existingSet.add(digits);
        }
      }
    }

    // 2) Determine target canonical numbers
    const targetNums = Array.from({ length: 32 }, (_, i) => 101 + i);
    const missing = targetNums.filter((n) => !existingSet.has(n));
    if (missing.length === 0) {
      return Response.json({ message: 'A-1 appears complete (101–132 present). Nothing to create.', created: 0, missing: [] });
    }

    // 3) Load NewPlot rows and pick best candidate for each missing canonical number
    const newRows = await base44.asServiceRole.entities.NewPlot.list(null, 20000);

    // Filter to A section-ish records first for a small optimization
    const aLike = newRows.filter((r) => {
      const rowUp = String(r.row_number || '').toUpperCase();
      const pnUp = String(r.plot_number || '').toUpperCase();
      return rowUp.startsWith('A') || pnUp.startsWith('A');
    });

    const bestByCanon = new Map();
    for (const r of aLike) {
      const cn = canonicalA1NumberFromNewPlot(r);
      if (isNaN(cn) || cn < 101 || cn > 132) continue;
      if (!missing.includes(cn)) continue; // only care about missing ones
      const curr = bestByCanon.get(cn);
      if (!curr || scoreCandidate(r) > scoreCandidate(curr)) {
        bestByCanon.set(cn, r);
      }
    }

    const toCreate = [];
    for (const n of missing) {
      const src = bestByCanon.get(n);
      if (!src) continue;
      toCreate.push({ n, src });
    }

    if (toCreate.length === 0) {
      return Response.json({ message: 'No suitable NewPlot rows found to fill missing A-1 numbers.', created: 0, remaining_missing: missing });
    }

    // 4) Create Plot records from the NewPlot source rows
    let created = 0;
    const createdIds = [];
    for (const { n, src } of toCreate) {
      const rec = await base44.asServiceRole.entities.Plot.create({
        section: src.section || 'Section 1',
        row_number: `A-${n}`,
        plot_number: String(n),
        status: src.status || 'Available',
        first_name: src.first_name || '',
        last_name: src.last_name || '',
        family_name: src.family_name || '',
        birth_date: src.birth_date || '',
        death_date: src.death_date || '',
        notes: src.notes || ''
      });
      created += 1;
      createdIds.push(rec.id);
    }

    return Response.json({
      message: `Created ${created} plot(s) for A-1 using NewPlot data`,
      created,
      created_ids: createdIds,
      filled_numbers: toCreate.map((x) => x.n),
      still_missing: targetNums.filter((n) => !existingSet.has(n) && !toCreate.find((x) => x.n === n)),
    });
  } catch (error) {
    return Response.json({ error: error.message || String(error) }, { status: 500 });
  }
});