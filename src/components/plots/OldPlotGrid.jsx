import React, { memo, useMemo } from "react";
import OldPlotCell from "./OldPlotCell";

/**
 * Old Cemetery Plot Grid — flat 101 rows × 19 columns.
 * No row letters, no column headers, no section labels.
 * Plots are placed by their plot_number into a grid via row/col mapping.
 */

const ROWS = 101;
const COLS = 19;

export default memo(function OldPlotGrid({ plots, isAdmin, onHover, onEdit }) {
  // Build a lookup: plotNumber -> plot data
  const plotsByNumber = useMemo(() => {
    const map = new Map();
    for (const p of (plots || [])) {
      const num = parseInt(String(p.Grave || p.plot_number || '').replace(/\D/g, ''), 10);
      if (!Number.isFinite(num)) continue;
      const existing = map.get(num);
      if (!existing || new Date(p._updated || 0) > new Date(existing._updated || 0)) {
        map.set(num, p);
      }
    }
    return map;
  }, [plots]);

  // Build grid: rows 0..100, cols 0..18
  // We assign plot numbers sequentially: row 0 col 0 = plot 1, row 0 col 1 = plot 2, etc.
  // Or we can map based on actual data positions.
  // Since the spreadsheet has 9 column pairs (left/right) = 18 slots + 1 extra = 19,
  // and plots are numbered sequentially, we map by number:
  // Plot number N -> row = floor((N-1) / 19), col = (N-1) % 19
  const grid = useMemo(() => {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const plotNum = r * COLS + c + 1; // 1-based
        row.push(plotsByNumber.get(plotNum) || null);
      }
      rows.push(row);
    }
    return rows;
  }, [plotsByNumber]);

  if (!plots || plots.length === 0) {
    return <div className="text-gray-400 text-center py-12">No plot data loaded</div>;
  }

  return (
    <div className="inline-block select-none">
      <div className="border border-gray-300 rounded overflow-hidden bg-white">
        {grid.map((row, rIdx) => (
          <div key={rIdx} className="flex border-b border-gray-100 last:border-b-0">
            {row.map((item, cIdx) => (
              <OldPlotCell
                key={cIdx}
                item={item}
                isAdmin={isAdmin}
                onHover={onHover}
                onEdit={onEdit}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Legend:</span>
        {[
          ['bg-green-500', 'Available'],
          ['bg-yellow-400', 'Reserved'],
          ['bg-red-500', 'Occupied'],
          ['bg-blue-600', 'Veteran'],
          ['bg-gray-500', 'Unavailable'],
          ['bg-purple-500', 'Unknown'],
          ['bg-gray-400', 'Not Usable'],
        ].map(([bg, label]) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${bg}`} />
            <span className="text-[10px] text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});