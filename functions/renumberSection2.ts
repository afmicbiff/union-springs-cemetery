import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Utility helpers mirroring the UI logic for Section 2
function toNum(g) {
  const n = parseInt(String(g || '').replace(/\D/g, ''));
  return Number.isFinite(n) ? n : null;
}
function byNumVal(g) {
  return toNum(g) || 0;
}
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Load Section 2 plots
    const plots = await base44.entities.Plot.filter({
      $or: [{ section: '2' }, { section: 'Section 2' }]
    }, '-updated_date', 5000);

    const byId = new Map();
    (plots || []).forEach(p => byId.set(p.id, p));

    // Build ordered list similar to UI ordering
    const withMeta = (plots || []).map(p => ({
      id: p.id,
      plot_number: p.plot_number,
      section: p.section,
      row_number: p.row_number,
      status: p.status,
      first_name: p.first_name,
      last_name: p.last_name,
      notes: p.notes,
    }));

    // Remove 185 from display ordering (but we will leave it unchanged in DB)
    let working = withMeta.filter(p => byNumVal(p.plot_number) !== 185);

    // Sort ascending by numeric part then lexicographic
    working.sort((a, b) => {
      const na = byNumVal(a.plot_number), nb = byNumVal(b.plot_number);
      if (na !== nb) return na - nb;
      return String(a.plot_number).localeCompare(String(b.plot_number));
    });

    // Ensure 228-A is placed immediately after 228 visually
    const idx228A = working.findIndex(p => String(p.plot_number).trim() === '228-A');
    if (idx228A !== -1) {
      const p228A = working.splice(idx228A, 1)[0];
      const idx228 = working.findIndex(p => byNumVal(p.plot_number) === 228 && /^[0-9]+$/.test(String(p.plot_number)));
      const insertAt = idx228 !== -1 ? idx228 + 1 : working.length;
      working.splice(insertAt, 0, p228A);
    }

    // Split into 10 columns of 23 rows each
    let columns = chunk(working, 23).slice(0, 10);
    // Helpers over columns
    const findPos = (cols, num) => {
      for (let c = 0; c < cols.length; c++) {
        const r = cols[c].findIndex(p => byNumVal(p.plot_number) === num);
        if (r !== -1) return { c, r };
      }
      return null;
    };
    const insertIntoColumn = (cols, c, r, item) => {
      cols[c].splice(r, 0, item);
      // Spill forward if exceeds 23
      for (let i = c; i < cols.length; i++) {
        while (cols[i].length > 23) {
          const spill = cols[i].pop();
          if (i + 1 < cols.length) cols[i + 1].unshift(spill);
        }
      }
    };

    // Reorder: move the whole column containing 186 next to the column containing 228
    const pos186 = findPos(columns, 186);
    const pos228 = findPos(columns, 228);
    if (pos186 && pos228 && pos186.c !== pos228.c) {
      const movedCol = columns.splice(pos186.c, 1)[0];
      const newPos228 = findPos(columns, 228) || pos228;
      const insertAt = Math.min((newPos228.c ?? 0) + 1, columns.length);
      columns.splice(insertAt, 0, movedCol);
    }

    // Move-under pairs as in UI
    const moveUnder = (cols, movingNum, targetNum) => {
      const t = findPos(cols, targetNum);
      const m = findPos(cols, movingNum);
      if (!t || !m) return;
      const item = cols[m.c].splice(m.r, 1)[0];
      const t2 = findPos(cols, targetNum) || t;
      const insertRow = Math.max(t2.r - 1, 0); // because reversal in render
      insertIntoColumn(cols, t2.c, insertRow, item);
    };

    const pairs = [
      [228, 229],
      [304, 305],
      [470, 471],
      [587, 588],
      [671, 872],
      [750, 751],
      [803, 804],
    ];
    pairs.forEach(([m, t]) => moveUnder(columns, m, t));

    // Shift the row containing plot 303 two columns to the right and leave blanks under plot 304 (UI effect)
    const pos303 = findPos(columns, 303);
    if (pos303) {
      const r = pos303.r;
      const rowCells = columns.map(col => col[r]);
      const newRow = Array(columns.length).fill(null);
      for (let c = 0; c < columns.length; c++) {
        const toC = c + 2;
        if (toC < columns.length) newRow[toC] = rowCells[c];
      }
      for (let c = 0; c < columns.length; c++) {
        if (newRow[c]) columns[c][r] = newRow[c];
        else columns[c][r] = { __spacer: true, _id: `sp-303-${r}-${c}` };
      }
    }

    // Insert a full blank row directly under the row containing 186 (visual row)
    const pos186Row = findPos(columns, 186);
    if (pos186Row) {
      const insertRowIdx = Math.max(pos186Row.r - 1, 0); // reverse-rendered grid: r-1 is visually under
      for (let c = 0; c < columns.length; c++) {
        columns[c].splice(insertRowIdx, 0, { __spacer: true, _id: `sp-after-186-c${c}` });
        // Trim to 23
        while (columns[c].length > 23) columns[c].pop();
      }
    }

    // Align plot 304 to be beside 229 (same visual row within its column)
    const pos229_beside = findPos(columns, 229);
    const pos304_beside = findPos(columns, 304);
    if (pos229_beside && pos304_beside) {
      const srcCol = pos304_beside.c;
      const tgtCol = pos229_beside.c;
      const srcLen = columns[srcCol].length;
      const tgtLen = columns[tgtCol].length;
      const visualRow229 = (tgtLen - 1) - pos229_beside.r;
      let desiredIndex = (srcLen - 1) - visualRow229;
      desiredIndex = Math.max(0, Math.min(desiredIndex, columns[srcCol].length));
      const item304 = columns[srcCol].splice(pos304_beside.r, 1)[0];
      columns[srcCol].splice(desiredIndex, 0, item304);
      while (columns[srcCol].length > 23) columns[srcCol].pop();
    }

    // Flatten in render order (reverse each column)
    const renderData = columns.flatMap(col => [...col].reverse()).filter(Boolean).filter(x => !x.__spacer);

    // Build preservation rules
    const hasNonDigit = (s) => /[^0-9]/.test(String(s || ''));
    const baseOf = (s) => byNumVal(s);

    // Group by base to preserve numeric when a suffixed variant exists
    const groups = new Map();
    for (const p of withMeta) {
      const b = baseOf(p.plot_number);
      if (!groups.has(b)) groups.set(b, []);
      groups.get(b).push(p);
    }

    const preservedNumbers = new Set([185, 186, 228, 229, 303, 304, 305, 470, 471, 587, 588, 671, 872, 750, 751, 803, 804]);
    for (const [b, arr] of groups.entries()) {
      const hasSuffix = arr.some(x => hasNonDigit(x.plot_number) && baseOf(x.plot_number) === b);
      if (hasSuffix) preservedNumbers.add(b);
    }

    // Create assignment map oldId -> newPlotNumber (string). Keep preserved as-is.
    let next = 186;
    const usedTargets = new Set([...preservedNumbers]);
    const updates = [];

    for (const item of renderData) {
      const original = byId.get(item.id);
      if (!original) continue;
      const pn = String(original.plot_number || '').trim();
      const base = baseOf(pn);

      // Leave 185 entirely unchanged (and it was not in renderData as removed earlier)
      if (base === 185) continue;

      // Preserve if alphanumeric or preserved base
      if (hasNonDigit(pn) || preservedNumbers.has(base)) {
        continue; // no change
      }

      // Find next available number not in usedTargets
      while (usedTargets.has(next) || next === 185) next++;
      if (String(next) !== pn) {
        updates.push({ id: original.id, from: pn, to: String(next) });
      }
      usedTargets.add(next);
      next++;
    }

    // Apply updates
    for (const u of updates) {
      await base44.entities.Plot.update(u.id, { plot_number: u.to });
    }

    return Response.json({
      message: 'Section 2 renumber completed',
      updated_count: updates.length,
      updates,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});