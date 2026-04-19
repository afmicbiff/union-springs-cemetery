import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const all = await base44.asServiceRole.entities.NewPlotSimple.list('position', 1000);

    // Build coverage map: {column: {filled: Set<position>, missing_row_label: [], missing_plot_number: []}}
    const byCol = {};
    let totalRecords = all.length;
    let missingRowLabel = 0;
    let missingPlotNumber = 0;

    for (const r of all) {
      const col = r.column ?? 1;
      const pos = r.position;
      if (!byCol[col]) byCol[col] = { positions: new Set(), missingRowLabel: [], missingPlotNumber: [] };
      byCol[col].positions.add(pos);
      if (!r.row_label) { missingRowLabel++; byCol[col].missingRowLabel.push({ id: r.id, position: pos }); }
      if (!r.plot_number) { missingPlotNumber++; byCol[col].missingPlotNumber.push({ id: r.id, position: pos }); }
    }

    // For each column, figure out what positions are missing in the 1-82 range
    const summary = {};
    for (const col of Object.keys(byCol)) {
      const filled = Array.from(byCol[col].positions).sort((a, b) => a - b);
      const missingPositions = [];
      for (let p = 1; p <= 82; p++) {
        if (!byCol[col].positions.has(p)) missingPositions.push(p);
      }
      summary[col] = {
        filled_count: filled.length,
        filled_range: filled.length ? `${filled[0]} - ${filled[filled.length - 1]}` : 'none',
        missing_positions: missingPositions,
        records_missing_row_label: byCol[col].missingRowLabel.length,
        records_missing_plot_number: byCol[col].missingPlotNumber.length,
      };
    }

    return Response.json({
      totalRecords,
      missingRowLabel,
      missingPlotNumber,
      byColumn: summary,
      expectedPerColumn: 82,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});