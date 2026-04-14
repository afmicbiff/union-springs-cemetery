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

  // Map plot number to grid position {row, col}.
  // Plots 1-23: column 0, bottom-to-top (plot 1 at row 100, plot 23 at row 78).
  // Additional plot ranges will be mapped here as they are defined.
  function plotPosition(plotNum) {
    if (plotNum >= 1 && plotNum <= 23) {
      return { row: ROWS - plotNum, col: 0 }; // bottom-up in col 0
    }
    if (plotNum >= 24 && plotNum <= 46) {
      return { row: ROWS - (plotNum - 23), col: 1 }; // bottom-up in col 1
    }
    if (plotNum >= 47 && plotNum <= 69) {
      return { row: ROWS - (plotNum - 46), col: 2 }; // bottom-up in col 2
    }
    if (plotNum >= 70 && plotNum <= 92) {
      return { row: ROWS - (plotNum - 69), col: 3 }; // bottom-up in col 3
    }
    if (plotNum >= 93 && plotNum <= 115) {
      return { row: ROWS - (plotNum - 92), col: 4 }; // bottom-up in col 4
    }
    if (plotNum >= 116 && plotNum <= 138) {
      return { row: ROWS - (plotNum - 115), col: 5 }; // bottom-up in col 5
    }
    if (plotNum >= 139 && plotNum <= 161) {
      return { row: ROWS - (plotNum - 138), col: 6 }; // bottom-up in col 6
    }
    if (plotNum >= 162 && plotNum <= 184) {
      return { row: ROWS - (plotNum - 161), col: 7 }; // bottom-up in col 7
    }
    // 38 blank rows after plot 184 in col 7, then plots 943-963
    if (plotNum >= 943 && plotNum <= 963) {
      // plot 184 is at row 78, skip 38 blanks (rows 77-40), 943 starts at row 39
      return { row: 39 - (plotNum - 943), col: 7 }; // bottom-up in col 7
    }
    // Col 8: plots 185-207, bottom-up beside 162-184 in col 7
    if (plotNum >= 185 && plotNum <= 207) {
      return { row: ROWS - (plotNum - 184), col: 8 }; // bottom-up in col 8
    }
    // 38 blank rows after plot 207 in col 8, then plots 943-963 area
    // Plots 208-227 and NU markers removed from grid
    return null; // unmapped plots don't appear on grid yet
  }

  const grid = useMemo(() => {
    // Initialize empty grid
    const rows = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    // Place each plot by its number
    for (const [num, plot] of plotsByNumber) {
      const pos = plotPosition(num);
      if (pos && pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS) {
        rows[pos.row][pos.col] = plot;
      }
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